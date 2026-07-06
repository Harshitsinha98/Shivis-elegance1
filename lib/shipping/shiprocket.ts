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
 * Cancel a shipment on Shiprocket's side by AWB. Best-effort — never throws.
 * Used when an order is cancelled in the admin panel so the courier shipment
 * doesn't stay alive on Shiprocket after the local order is cancelled.
 */
export async function cancelShiprocketOrder(
  awb?: string | null
): Promise<{ ok: boolean; message?: string }> {
  if (!isShiprocketEnabled()) {
    return { ok: false, message: "Shiprocket is not configured" };
  }
  if (!awb) {
    return { ok: false, message: "No AWB on this order" };
  }
  // Our own mock AWBs (see mockAwb() above) never reach Shiprocket, so there's
  // nothing real to cancel there.
  if (awb.startsWith("LJ")) {
    return { ok: true, message: "Mock shipment — nothing to cancel on Shiprocket" };
  }

  const token = await getToken();
  if (!token) {
    return { ok: false, message: "Could not authenticate with Shiprocket" };
  }

  try {
    const res = await fetch(`${BASE}/courier/cancel/shipment/awb`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ awbs: [awb] }),
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
