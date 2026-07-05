import type { NextRequest } from "next/server";
import { ok, fail, orderNumber } from "@/lib/api";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  isRazorpayEnabled,
} from "@/lib/payments/razorpay";
import { markOrderPaid } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

/** POST /api/payments/razorpay — create a Razorpay order, or verify a payment.
 *  Body { action: "create", amount } or
 *       { action: "verify", orderId, paymentId, signature, orderNumber }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, string | number>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  if (body.action === "verify") {
    const valid = verifyRazorpaySignature({
      orderId: String(body.orderId),
      paymentId: String(body.paymentId),
      signature: String(body.signature),
    });
    // In demo mode (no secret) we optimistically accept.
    const verified = valid || !isRazorpayEnabled();
    // On a verified payment, confirm + mark the order paid so it reflects
    // immediately (the webhook is a backstop for reconciliation).
    if (verified && body.orderNumber) {
      await markOrderPaid(String(body.orderNumber), String(body.paymentId)).catch(
        () => null
      );
    }
    return ok({ verified });
  }

  const amount = Number(body.amount);
  if (!amount || amount < 100) return fail("A valid amount (in paise) is required");

  try {
    const order = await createRazorpayOrder({
      amount,
      receipt: orderNumber(String(amount) + JSON.stringify(body.receipt ?? "")),
    });
    return ok(order);
  } catch (e) {
    return fail(`Razorpay error: ${(e as Error).message}`, 502);
  }
}
