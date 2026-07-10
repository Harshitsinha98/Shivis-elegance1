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

/**
 * Refund a captured payment (full or partial, paise). Best-effort: when
 * Razorpay is unconfigured or no payment id is on file, it logs and resolves
 * `ok` so the local refund/cancel still completes. `paymentRef` is the
 * Razorpay payment id (`pay_...`) captured at checkout.
 */
export interface RazorpayRefundResult {
  ok: boolean;
  /** Razorpay refund id (rfnd_...) when the gateway processed it. */
  id?: string;
  /** Gateway refund status (processed | pending) when available. */
  status?: string;
  message?: string;
  /** Raw gateway response, persisted for audit. */
  payload?: unknown;
  /** True when this was a stub (Razorpay not configured / mock payment). */
  mock?: boolean;
}

export async function refundRazorpayPayment(
  paymentRef: string | null | undefined,
  amount?: number,
  opts?: { idempotencyKey?: string; notes?: Record<string, string> }
): Promise<RazorpayRefundResult> {
  if (!isRazorpayEnabled() || !paymentRef || paymentRef.startsWith("order_mock_")) {
    console.info(`[razorpay] refund stub for ${paymentRef ?? "n/a"} amount=${amount ?? "full"}`);
    return {
      ok: true,
      status: "processed",
      message: "Refund recorded (Razorpay not configured)",
      mock: true,
    };
  }

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  };
  // Razorpay honours an Idempotency-Key header on refund create, so a retried
  // request returns the SAME refund instead of a second one.
  if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const notes = {
    ...(opts?.idempotencyKey ? { idempotency_key: opts.idempotencyKey } : {}),
    ...(opts?.notes ?? {}),
  };

  const body: Record<string, unknown> = { speed: "optimum" };
  if (amount) body.amount = amount;
  if (Object.keys(notes).length) body.notes = notes;

  let res: Response;
  try {
    res = await fetch(`https://api.razorpay.com/v1/payments/${paymentRef}/refund`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: `Razorpay unreachable: ${(e as Error).message}` };
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (payload as any)?.error?.description || `HTTP ${res.status}`;
    return { ok: false, message: `Razorpay refund failed: ${msg}`, payload };
  }
  const refund = payload as { id: string; status?: string };
  return { ok: true, id: refund.id, status: refund.status, payload };
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
