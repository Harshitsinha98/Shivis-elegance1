/**
 * Razorpay integration via REST API (no SDK dependency).
 * Primary gateway for INR checkout. Falls back to a mock order when
 * RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured.
 */
import crypto from "crypto";

export const isRazorpayEnabled = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  keyId: string | null;
  mock: boolean;
}

export async function createRazorpayOrder(input: {
  amount: number; // paise
  currency?: string;
  receipt: string;
}): Promise<RazorpayOrderResult> {
  const currency = input.currency ?? "INR";

  if (!isRazorpayEnabled()) {
    return {
      id: `order_mock_${input.receipt}`,
      amount: input.amount,
      currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null,
      mock: true,
    };
  }

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency,
      receipt: input.receipt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Razorpay error: ${res.status} ${await res.text()}`);
  }
  const order = (await res.json()) as { id: string; amount: number; currency: string };
  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || null,
    mock: false,
  };
}

/** Verify the checkout signature returned by Razorpay Checkout. */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return expected === params.signature;
}

/** Verify a Razorpay webhook payload signature. */
export function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
