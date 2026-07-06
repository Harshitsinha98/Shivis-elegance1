import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { mapShiprocketStatus } from "@/lib/shipping/shiprocket";
import { getOrderByAwb, getOrderByNumber, updateOrderStatus } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

/**
 * GET /api/webhooks/shiprocket — reachability check.
 * Shiprocket (and uptime probes) may hit the URL with GET when you click
 * "Test & Save"; it rejects the URL ("address is not allowed") unless it gets
 * a 2xx. Ack so the endpoint validates.
 */
export async function GET() {
  return ok({ received: true, endpoint: "shiprocket-webhook" });
}

/** POST /api/webhooks/shiprocket — shipment status updates (NDR, delivered, etc.). */
export async function POST(req: NextRequest) {
  // Shiprocket sends the token it manages for this webhook in `x-api-key`.
  // We verify it before mutating anything, but IMPORTANT: we still return 200
  // on a mismatch. Shiprocket disables webhooks that ever return a non-2xx
  // (that's the "address is not allowed" failure on Test & Save), so we ack
  // every request and simply skip processing unauthorized ones.
  const token = req.headers.get("x-api-key");
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  const authorized = !expected || token === expected;

  let event: {
    current_status?: string;
    awb?: string;
    order_id?: string;
    courier_name?: string;
  } = {};
  try {
    event = await req.json();
  } catch {
    // Empty/non-JSON body (e.g. Shiprocket's validation ping) — just ack.
    return ok({ received: true, authorized, matched: false });
  }

  if (!authorized) {
    // Token didn't match. Ack so Shiprocket keeps the webhook enabled, but do
    // not touch any order. If this is the value Shiprocket actually sends,
    // copy it from your Vercel logs into SHIPROCKET_WEBHOOK_TOKEN.
    return ok({ received: true, authorized: false, matched: false });
  }

  const mapped = mapShiprocketStatus(event.current_status);

  // Locate the order: prefer AWB, fall back to the order_id we sent at
  // shipment creation (which is our internal order number).
  const order =
    (event.awb ? await getOrderByAwb(event.awb).catch(() => null) : null) ??
    (event.order_id ? await getOrderByNumber(event.order_id).catch(() => null) : null);

  if (!order) {
    // Unknown shipment (or DB disabled) — ack so Shiprocket stops retrying.
    return ok({
      received: true,
      matched: false,
      awb: event.awb ?? null,
      status: event.current_status ?? "unknown",
    });
  }

  let updated = false;
  // Only move the order forward when the mapped status is a real change, and
  // never regress a delivered/returned order back to shipped.
  if (mapped && mapped !== order.status && !isRegression(order.status, mapped)) {
    await updateOrderStatus(order.number, mapped, event.awb ?? order.awb).catch(
      () => null
    );
    updated = true;
  }

  return ok({
    received: true,
    matched: true,
    order: order.number,
    awb: event.awb ?? order.awb ?? null,
    status: event.current_status ?? "unknown",
    mappedStatus: mapped,
    updated,
  });
}

/** Guard against out-of-order webhooks moving a terminal order backwards. */
const RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  out_for_delivery: 4,
  delivered: 5,
};
function isRegression(from: string, to: string): boolean {
  // cancelled / returned are terminal side-states — always allow those.
  if (to === "cancelled" || to === "returned") return false;
  const a = RANK[from];
  const b = RANK[to];
  if (a === undefined || b === undefined) return false;
  return b < a;
}
