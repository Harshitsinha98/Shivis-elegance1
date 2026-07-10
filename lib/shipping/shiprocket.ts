/**
 * Shiprocket integration (REST). Handles auth token, serviceability checks and
 * shipment creation. Falls back to deterministic mock rates/estimates when
 * SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD are not configured.
 */
import type { OrderStatus } from "@/types/order";

/**
 * Map a Shiprocket shipment `current_status` to our internal OrderStatus.
 * Returns null for intermediate statuses we don't surface as order changes
 * (e.g. "Pickup Scheduled") so the webhook can no-op on them.
 */
export function mapShiprocketStatus(current?: string): OrderStatus | null {
  const s = (current ?? "").toLowerCase().trim();
  if (!s) return null;

  // Terminal delivery.
  if (s.includes("delivered") && !s.includes("rto")) return "delivered";

  // Return / RTO flows.
  if (s.includes("rto") || s.startsWith("return") || s.includes("returned")) {
    return "returned";
  }

  // Cancellations.
  if (s.includes("cancel")) return "cancelled";

  // Final courier leg — surfaced as its own step.
  if (s.includes("out for delivery")) return "out_for_delivery";

  // Anything else in the outbound courier pipeline counts as shipped.
  if (
    s.includes("in transit") ||
    s.includes("picked up") ||
    s.includes("pickup generated") ||
    s.includes("shipped") ||
    s.includes("dispatched") ||
    s.includes("reached") ||
    s.includes("out for pickup")
  ) {
    return "shipped";
  }

  // Everything else (Pending / New / Pickup Scheduled / label generated…)
  // is a pre-ship state we don't downgrade the order for.
  return null;
}

export const isShiprocketEnabled = () =>
  Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

const BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (!isShiprocketEnabled()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error(`[Shiprocket] auth/login failed: ${res.status} ${body.slice(0, 300)}`);
    return null;
  }
  const data = (await res.json()) as { token: string };
  cachedToken = { token: data.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return data.token;
}

export interface ShippingRate {
  courier: string;
  fee: number; // paise
  estimatedDays: number;
  mock: boolean;
}

export async function getShippingRate(input: {
  fromPincode?: string;
  toPincode: string;
  weightKg: number;
  cod?: boolean;
}): Promise<ShippingRate> {
  const token = await getToken();

  if (!token) {
    // Deterministic mock based on the destination pincode.
    const digit = Number(input.toPincode.replace(/\D/g, "").slice(-1) || "3");
    return {
      courier: "Shivis Elegance Insured Express",
      fee: 15000,
      estimatedDays: 2 + (digit % 4),
      mock: true,
    };
  }

  const params = new URLSearchParams({
    pickup_postcode: input.fromPincode ?? "400020",
    delivery_postcode: input.toPincode,
    weight: String(input.weightKg),
    cod: input.cod ? "1" : "0",
  });
  const res = await fetch(`${BASE}/courier/serviceability/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Shiprocket error: ${res.status}`);
  const data = (await res.json()) as {
    data: { available_courier_companies: { courier_name: string; rate: number; estimated_delivery_days: string }[] };
  };
  const best = data.data.available_courier_companies?.[0];
  return {
    courier: best?.courier_name ?? "Standard",
    fee: Math.round((best?.rate ?? 150) * 100),
    estimatedDays: Number(best?.estimated_delivery_days ?? 4),
    mock: false,
  };
}

export interface Shipment {
  awb: string;
  courier: string;
  /** public tracking URL the customer can open */
  trackingUrl: string;
  /** Shiprocket's own shipment id — needed for pickup/label calls */
  shipmentId?: string;
  /** Shiprocket's own order id — needed for the orders/cancel call */
  shiprocketOrderId?: string;
  /** Real courier-generated label PDF, when Shiprocket returns one */
  labelUrl?: string;
  mock: boolean;
}

/** Deterministic mock AWB from the order number so re-runs are stable. */
function mockAwb(orderNumber: string): string {
  let h = 0;
  for (const ch of orderNumber) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const digits = (1_000_000_000 + (h % 8_999_999_999)).toString().slice(0, 10);
  return `LJ${digits}`;
}

export interface ShipmentAddress {
  name: string;
  phone: string;
  email?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface ShipmentItem {
  name: string;
  sku: string;
  units: number;
  /** Selling price per unit, in rupees (major unit — Shiprocket does not use paise). */
  sellingPrice: number;
}

export interface CreateShipmentInput {
  orderNumber: string;
  /** ISO timestamp of order placement. */
  orderDate: string;
  paymentMethod: "Prepaid" | "COD";
  /** Order subtotal in rupees. */
  subtotal: number;
  address: ShipmentAddress;
  items: ShipmentItem[];
  weightKg: number;
  dimensionsCm?: { length: number; breadth: number; height: number };
}

/**
 * Create a shipment for an order and return its AWB + courier.
 *
 * Runs Shiprocket's real 4-step flow when credentials are configured:
 *   1. POST /orders/create/adhoc  — registers the order, returns shipment_id
 *   2. POST /courier/assign/awb   — assigns a real AWB to that shipment
 *   3. POST /courier/generate/pickup — schedules courier pickup (best-effort)
 *   4. POST /courier/generate/label  — the real courier shipping-label PDF (best-effort)
 *
 * Falls back to a deterministic mock AWB when Shiprocket isn't configured, so
 * the whole fulfilment flow (label, tracking) still works end-to-end with zero
 * setup.
 */
export async function createShipment(input: CreateShipmentInput): Promise<Shipment> {
  const token = await getToken();
  const awbFallback = mockAwb(input.orderNumber);
  const mockShipment: Shipment = {
    awb: awbFallback,
    courier: "Shivis Elegance Insured Express",
    trackingUrl: `/track/${awbFallback}`,
    mock: true,
  };

  if (!token) {
    // eslint-disable-next-line no-console
    console.warn("[Shiprocket] no auth token — using mock AWB");
    return mockShipment;
  }

  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  if (!pickupLocation) {
    // Can't register a real order without a pickup location on file.
    // eslint-disable-next-line no-console
    console.warn("[Shiprocket] SHIPROCKET_PICKUP_LOCATION unset — using mock AWB");
    return mockShipment;
  }

  const dims = input.dimensionsCm ?? { length: 10, breadth: 10, height: 5 };
  const orderDate = new Date(input.orderDate).toISOString().slice(0, 16).replace("T", " ");

  try {
    // 1) Register the order with Shiprocket.
    const createRes = await fetch(`${BASE}/orders/create/adhoc`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: input.orderNumber,
        order_date: orderDate,
        pickup_location: pickupLocation,
        billing_customer_name: input.address.name,
        billing_last_name: "",
        billing_address: input.address.address,
        billing_address_2: input.address.address2 ?? "",
        billing_city: input.address.city,
        billing_pincode: input.address.pincode,
        billing_state: input.address.state,
        billing_country: input.address.country,
        billing_email: input.address.email || "orders@shiviselegance.com",
        billing_phone: input.address.phone,
        shipping_is_billing: true,
        order_items: input.items.map((it) => ({
          name: it.name,
          sku: it.sku,
          units: it.units,
          selling_price: it.sellingPrice,
        })),
        payment_method: input.paymentMethod,
        sub_total: input.subtotal,
        length: dims.length,
        breadth: dims.breadth,
        height: dims.height,
        weight: Math.max(0.05, input.weightKg),
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      throw new Error(`orders/create/adhoc failed: ${createRes.status} ${body.slice(0, 400)}`);
    }
    const created = (await createRes.json()) as {
      order_id?: number;
      shipment_id?: number;
    };
    const shipmentId = created.shipment_id;
    const shiprocketOrderId = created.order_id;
    if (!shipmentId) throw new Error(`No shipment_id returned: ${JSON.stringify(created).slice(0, 300)}`);
    // eslint-disable-next-line no-console
    console.log(`[Shiprocket] order created — shipment_id=${shipmentId}`);

    // 2) Assign a real AWB to the shipment.
    const awbRes = await fetch(`${BASE}/courier/assign/awb`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: shipmentId }),
    });
    if (!awbRes.ok) {
      const body = await awbRes.text().catch(() => "");
      throw new Error(`AWB assign failed: ${awbRes.status} ${body.slice(0, 400)}`);
    }
    const awbData = (await awbRes.json()) as {
      response?: { data?: { awb_code?: string; courier_name?: string } };
    };
    const awb = awbData.response?.data?.awb_code;
    const courier = awbData.response?.data?.courier_name;
    if (!awb) throw new Error(`No awb_code returned: ${JSON.stringify(awbData).slice(0, 300)}`);
    // eslint-disable-next-line no-console
    console.log(`[Shiprocket] real AWB assigned: ${awb} (${courier})`);

    const shipment: Shipment = {
      awb,
      courier: courier || "Shiprocket",
      trackingUrl: `https://shiprocket.co/tracking/${awb}`,
      shipmentId: String(shipmentId),
      shiprocketOrderId: shiprocketOrderId != null ? String(shiprocketOrderId) : undefined,
      mock: false,
    };

    // 3) Schedule pickup — best-effort, doesn't block the real AWB above.
    try {
      await fetch(`${BASE}/courier/generate/pickup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
    } catch {
      /* pickup can be scheduled again later from the Shiprocket dashboard */
    }

    // 4) Fetch the real courier shipping-label PDF — best-effort.
    try {
      const labelRes = await fetch(`${BASE}/courier/generate/label`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
      if (labelRes.ok) {
        const labelData = (await labelRes.json()) as { label_url?: string };
        if (labelData.label_url) shipment.labelUrl = labelData.label_url;
      }
    } catch {
      /* label can be (re)generated later from the admin panel */
    }

    return shipment;
  } catch (err) {
    // Fall back gracefully so fulfilment never blocks on a courier hiccup.
    // eslint-disable-next-line no-console
    console.error(`[Shiprocket] shipment creation failed, using mock AWB:`, (err as Error).message);
    return mockShipment;
  }
}

/**
 * Cancel an order on Shiprocket's side. Best-effort — never throws.
 * Used when an order is cancelled in the admin panel so the courier shipment
 * doesn't stay alive on Shiprocket after the local order is cancelled.
 *
 * Shiprocket's cancel endpoint (`POST /orders/cancel`) takes Shiprocket's own
 * `order_id` (returned from `orders/create/adhoc` as `order_id`) via an `ids`
 * array — it does NOT accept the AWB or our `shipment_id`.
 */
export async function cancelShiprocketOrder(
  shiprocketOrderId?: string | null,
  awb?: string | null
): Promise<{ ok: boolean; message?: string }> {
  if (!isShiprocketEnabled()) {
    return { ok: false, message: "Shiprocket is not configured" };
  }
  // Our own mock AWBs (see mockAwb() above) never reach Shiprocket, so there's
  // nothing real to cancel there.
  if (awb?.startsWith("LJ")) {
    return { ok: true, message: "Mock shipment — nothing to cancel on Shiprocket" };
  }
  if (!shiprocketOrderId) {
    return { ok: false, message: "No Shiprocket order id on this order" };
  }

  const token = await getToken();
  if (!token) {
    return { ok: false, message: "Could not authenticate with Shiprocket" };
  }

  try {
    const res = await fetch(`${BASE}/orders/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [Number(shiprocketOrderId)] }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.warn(`[Shiprocket] cancel failed: ${res.status} ${body.slice(0, 300)}`);
      return { ok: false, message: `Shiprocket declined the cancel (${res.status})` };
    }
    return { ok: true, message: "Cancelled on Shiprocket" };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[Shiprocket] cancel request failed:", (err as Error).message);
    return { ok: false, message: "Could not reach Shiprocket to cancel" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVERSE LOGISTICS — return pickup from the customer back to our warehouse.
//  Mirrors the forward flow (createShipment) but uses Shiprocket's dedicated
//  return endpoints. Every call degrades to a deterministic mock when
//  Shiprocket is not configured, so the whole return→refund flow works end to
//  end with zero setup, exactly like the forward pipeline.
// ═══════════════════════════════════════════════════════════════════════════

/** Normalised reverse-shipment lifecycle codes surfaced on both dashboards. */
export type ReverseTrackingCode =
  | "pickup_pending"
  | "pickup_scheduled"
  | "out_for_pickup"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered" // reached our warehouse
  | "pickup_failed"
  | "cancelled"
  | "lost"
  | "damaged"
  | "unknown";

/** Human labels for the reverse timeline. */
export const REVERSE_STATUS_LABEL: Record<ReverseTrackingCode, string> = {
  pickup_pending: "Pickup pending",
  pickup_scheduled: "Pickup scheduled",
  out_for_pickup: "Out for pickup",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery to warehouse",
  delivered: "Delivered to warehouse",
  pickup_failed: "Pickup failed",
  cancelled: "Pickup cancelled",
  lost: "Shipment lost",
  damaged: "Shipment damaged",
  unknown: "Update received",
};

/**
 * Map a raw Shiprocket reverse status/label to a normalised code. Recognises
 * the delivered-to-warehouse terminal (the ONLY trigger allowed to release a
 * refund) and the exception states (failed / cancelled / lost / damaged).
 */
export function mapReverseStatus(current?: string): ReverseTrackingCode {
  const s = (current ?? "").toLowerCase().trim();
  if (!s) return "unknown";
  if (s.includes("damage")) return "damaged";
  if (s.includes("lost")) return "lost";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("delivered") || s.includes("rto delivered") || s.includes("received"))
    return "delivered";
  if (s.includes("out for delivery")) return "out_for_delivery";
  if (
    s.includes("in transit") ||
    s.includes("reached") ||
    s.includes("in-transit") ||
    s.includes("shipped") ||
    s.includes("dispatched")
  )
    return "in_transit";
  if (s.includes("picked up") || s.includes("pickup done") || s.includes("pickup completed"))
    return "picked_up";
  if (s.includes("out for pickup")) return "out_for_pickup";
  if (
    s.includes("pickup error") ||
    s.includes("pickup failed") ||
    s.includes("pickup rescheduled") ||
    s.includes("failed")
  )
    return "pickup_failed";
  if (s.includes("pickup scheduled") || s.includes("pickup generated") || s.includes("manifest"))
    return "pickup_scheduled";
  if (s.includes("pickup") || s.includes("awb assigned") || s.includes("label"))
    return "pickup_pending";
  return "unknown";
}

/** True for a reverse status that must NOT release a refund on its own. */
export const isReverseException = (code: ReverseTrackingCode): boolean =>
  code === "pickup_failed" || code === "cancelled" || code === "lost" || code === "damaged";

/** Our warehouse / seller drop address for return shipments (env-driven). */
function warehouseAddress(): ShipmentAddress {
  return {
    name: process.env.WAREHOUSE_NAME || "Shivis Elegance Warehouse",
    phone: process.env.WAREHOUSE_PHONE || "9999999999",
    email: process.env.WAREHOUSE_EMAIL || process.env.ADMIN_EMAIL || "returns@shiviselegance.com",
    address: process.env.WAREHOUSE_ADDRESS || "The Atelier, 12 Marine Drive",
    city: process.env.WAREHOUSE_CITY || "Mumbai",
    state: process.env.WAREHOUSE_STATE || "Maharashtra",
    pincode: process.env.WAREHOUSE_PINCODE || "400020",
    country: process.env.WAREHOUSE_COUNTRY || "India",
  };
}

/** Deterministic mock reverse AWB from the return id so re-runs are stable. */
function mockReverseAwb(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const digits = (1_000_000_000 + (h % 8_999_999_999)).toString().slice(0, 10);
  return `RV${digits}`;
}

export interface CreateReturnShipmentInput {
  /** Our return-request id — used as the mock seed and Shiprocket order ref. */
  returnId: string;
  /** Original order number, for reference on Shiprocket. */
  orderNumber: string;
  orderDate: string;
  /** Customer address the courier collects FROM. */
  customer: ShipmentAddress;
  items: ShipmentItem[];
  /** Total value in rupees (major unit). */
  subtotal: number;
  weightKg: number;
  dimensionsCm?: { length: number; breadth: number; height: number };
}

export interface ReverseShipment {
  reverseAwb: string;
  courier: string;
  trackingUrl: string;
  reverseShipmentId?: string;
  reverseOrderId?: string;
  labelUrl?: string;
  manifestUrl?: string;
  pickupScheduledDate?: string;
  status: ReverseTrackingCode;
  mock: boolean;
}

function mockReverseShipment(seed: string): ReverseShipment {
  const awb = mockReverseAwb(seed);
  return {
    reverseAwb: awb,
    courier: "Shivis Elegance Reverse Express",
    trackingUrl: `/track/${awb}`,
    status: "pickup_scheduled",
    pickupScheduledDate: undefined,
    mock: true,
  };
}

/**
 * Full reverse-pickup pipeline in one call, mirroring createShipment():
 *   1. POST /orders/create/return   — registers the reverse order → shipment_id
 *   2. POST /courier/assign/awb      — assigns a reverse AWB
 *   3. POST /courier/generate/pickup — schedules the courier pickup (best-effort)
 *   4. POST /courier/generate/label  — reverse shipping label PDF (best-effort)
 *
 * Never throws — falls back to a deterministic mock so an admin "Approve" never
 * blocks on a courier hiccup. The caller persists whatever comes back.
 */
export async function createReturnShipment(
  input: CreateReturnShipmentInput
): Promise<ReverseShipment> {
  const token = await getToken();
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;

  if (!token || !pickupLocation) {
    // eslint-disable-next-line no-console
    console.warn("[Shiprocket] reverse pickup — using mock (creds/pickup location unset)");
    return mockReverseShipment(input.returnId);
  }

  const wh = warehouseAddress();
  const cust = input.customer;
  const dims = input.dimensionsCm ?? { length: 10, breadth: 10, height: 5 };
  const orderDate = new Date(input.orderDate).toISOString().slice(0, 16).replace("T", " ");

  try {
    // 1) Register the return order. pickup_* = customer (collect from),
    //    shipping_* = our warehouse (deliver to).
    const createRes = await fetch(`${BASE}/orders/create/return`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: `RET-${input.orderNumber}`,
        order_date: orderDate,
        channel_id: "",
        pickup_customer_name: cust.name,
        pickup_address: cust.address,
        pickup_address_2: cust.address2 ?? "",
        pickup_city: cust.city,
        pickup_state: cust.state,
        pickup_country: cust.country || "India",
        pickup_pincode: cust.pincode,
        pickup_email: cust.email || "orders@shiviselegance.com",
        pickup_phone: cust.phone,
        pickup_isd_code: "91",
        shipping_customer_name: wh.name,
        shipping_address: wh.address,
        shipping_address_2: wh.address2 ?? "",
        shipping_city: wh.city,
        shipping_country: wh.country,
        shipping_pincode: wh.pincode,
        shipping_state: wh.state,
        shipping_email: wh.email,
        shipping_phone: wh.phone,
        order_items: input.items.map((it) => ({
          name: it.name,
          sku: it.sku,
          units: it.units,
          selling_price: it.sellingPrice,
          qc_enable: false,
        })),
        payment_method: "PREPAID",
        sub_total: input.subtotal,
        length: dims.length,
        breadth: dims.breadth,
        height: dims.height,
        weight: Math.max(0.05, input.weightKg),
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      throw new Error(`orders/create/return failed: ${createRes.status} ${body.slice(0, 400)}`);
    }
    const created = (await createRes.json()) as { order_id?: number; shipment_id?: number };
    const reverseShipmentId = created.shipment_id;
    const reverseOrderId = created.order_id;
    if (!reverseShipmentId) {
      throw new Error(`No reverse shipment_id: ${JSON.stringify(created).slice(0, 300)}`);
    }

    const shipment: ReverseShipment = {
      reverseAwb: "",
      courier: "Shiprocket",
      trackingUrl: "",
      reverseShipmentId: String(reverseShipmentId),
      reverseOrderId: reverseOrderId != null ? String(reverseOrderId) : undefined,
      status: "pickup_pending",
      mock: false,
    };

    // 2) Assign a reverse AWB.
    const awb = await assignReverseAwb(String(reverseShipmentId));
    if (awb.awb) {
      shipment.reverseAwb = awb.awb;
      shipment.courier = awb.courier || "Shiprocket";
      shipment.trackingUrl = `https://shiprocket.co/tracking/${awb.awb}`;
    }

    // 3) Schedule the pickup (best-effort).
    const pickup = await generateReversePickup(String(reverseShipmentId));
    if (pickup.pickupScheduledDate) shipment.pickupScheduledDate = pickup.pickupScheduledDate;
    if (pickup.ok) shipment.status = "pickup_scheduled";

    // 4) Reverse label (best-effort).
    const label = await generateReverseLabel(String(reverseShipmentId));
    if (label.labelUrl) shipment.labelUrl = label.labelUrl;

    return shipment;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Shiprocket] reverse pickup failed, using mock:", (err as Error).message);
    return mockReverseShipment(input.returnId);
  }
}

/** Assign a reverse AWB to an existing reverse shipment. */
export async function assignReverseAwb(
  reverseShipmentId: string
): Promise<{ awb?: string; courier?: string; ok: boolean; message?: string }> {
  const token = await getToken();
  if (!token) return { ok: false, message: "Shiprocket not configured" };
  try {
    const res = await fetch(`${BASE}/courier/assign/awb`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: reverseShipmentId, is_return: 1 }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, message: `AWB assign failed: ${res.status} ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as {
      response?: { data?: { awb_code?: string; courier_name?: string } };
    };
    const awb = data.response?.data?.awb_code;
    return { ok: Boolean(awb), awb, courier: data.response?.data?.courier_name };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Schedule / re-schedule the courier pickup for a reverse shipment. */
export async function generateReversePickup(
  reverseShipmentId: string
): Promise<{ ok: boolean; pickupScheduledDate?: string; message?: string }> {
  const token = await getToken();
  if (!token) return { ok: false, message: "Shiprocket not configured" };
  try {
    const res = await fetch(`${BASE}/courier/generate/pickup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: [Number(reverseShipmentId)] }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, message: `pickup failed: ${res.status} ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as {
      response?: { pickup_scheduled_date?: string; data?: string };
      pickup_scheduled_date?: string;
    };
    const date = data.response?.pickup_scheduled_date || data.pickup_scheduled_date;
    return { ok: true, pickupScheduledDate: date };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Cancel a reverse pickup / shipment on Shiprocket (best-effort). */
export async function cancelReversePickup(
  reverseAwb?: string | null
): Promise<{ ok: boolean; message?: string }> {
  if (!isShiprocketEnabled()) return { ok: false, message: "Shiprocket is not configured" };
  if (!reverseAwb || reverseAwb.startsWith("RV")) {
    // Our own mock AWBs never reached Shiprocket.
    return { ok: true, message: "Mock reverse shipment — nothing to cancel" };
  }
  const token = await getToken();
  if (!token) return { ok: false, message: "Could not authenticate with Shiprocket" };
  try {
    const res = await fetch(`${BASE}/orders/cancel/shipment/awbs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ awbs: [reverseAwb] }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, message: `Shiprocket declined the cancel (${res.status}) ${body.slice(0, 150)}` };
    }
    return { ok: true, message: "Reverse pickup cancelled on Shiprocket" };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Fetch the reverse shipping label PDF url (best-effort). */
export async function generateReverseLabel(
  reverseShipmentId: string
): Promise<{ ok: boolean; labelUrl?: string; message?: string }> {
  const token = await getToken();
  if (!token) return { ok: false, message: "Shiprocket not configured" };
  try {
    const res = await fetch(`${BASE}/courier/generate/label`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: [Number(reverseShipmentId)] }),
    });
    if (!res.ok) return { ok: false, message: `label failed: ${res.status}` };
    const data = (await res.json()) as { label_url?: string };
    return { ok: Boolean(data.label_url), labelUrl: data.label_url };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export interface ReverseTrackingSnapshot {
  code: ReverseTrackingCode;
  rawStatus: string;
  courier?: string;
  estimatedDeliveryAt?: string;
  activities: { status: string; at?: string; location?: string }[];
  mock: boolean;
}

/**
 * Pull the current reverse-shipment status from Shiprocket by AWB. Returns a
 * normalised snapshot. For mock AWBs (or when unconfigured) it returns an
 * `unknown`/mock snapshot so the manual admin controls remain the source of
 * truth.
 */
export async function trackReverseShipment(
  reverseAwb: string
): Promise<ReverseTrackingSnapshot | null> {
  const token = await getToken();
  if (!token || !reverseAwb || reverseAwb.startsWith("RV")) {
    return { code: "unknown", rawStatus: "", activities: [], mock: true };
  }
  try {
    const res = await fetch(`${BASE}/courier/track/awb/${encodeURIComponent(reverseAwb)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const td = data?.tracking_data ?? data;
    const shipmentTrack = td?.shipment_track?.[0] ?? {};
    const raw: string =
      shipmentTrack?.current_status ?? td?.shipment_status_text ?? String(td?.shipment_status ?? "");
    const activities = (td?.shipment_track_activities ?? []).map((a: any) => ({
      status: a?.activity ?? a?.status ?? "",
      at: a?.date,
      location: a?.location,
    }));
    return {
      code: mapReverseStatus(raw),
      rawStatus: raw,
      courier: shipmentTrack?.courier_name,
      estimatedDeliveryAt: td?.etd,
      activities,
      mock: false,
    };
  } catch {
    return null;
  }
}
