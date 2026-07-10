/**
 * Stripe integration via the REST API (no SDK dependency).
 * Used for international (USD) checkout. Falls back to a mock intent when
 * STRIPE_SECRET_KEY is not configured so the checkout flow can be demoed.
 */
export const isStripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

export interface CreateIntentInput {
  amount: number; // minor units
  currency: string;
  orderNumber: string;
  email?: string;
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  mock: boolean;
}

export async function createStripePaymentIntent(
  input: CreateIntentInput
): Promise<PaymentIntentResult> {
  if (!isStripeEnabled()) {
    return {
      id: `pi_mock_${input.orderNumber}`,
      clientSecret: `pi_mock_${input.orderNumber}_secret`,
      amount: input.amount,
      currency: input.currency.toLowerCase(),
      mock: true,
    };
  }

  const body = new URLSearchParams({
    amount: String(input.amount),
    currency: input.currency.toLowerCase(),
    "automatic_payment_methods[enabled]": "true",
    "metadata[orderNumber]": input.orderNumber,
  });
  if (input.email) body.set("receipt_email", input.email);

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Stripe error: ${res.status} ${await res.text()}`);
  }
  const intent = (await res.json()) as {
    id: string;
    client_secret: string;
    amount: number;
    currency: string;
  };
  return {
    id: intent.id,
    clientSecret: intent.client_secret,
    amount: intent.amount,
    currency: intent.currency,
    mock: false,
  };
}

/**
 * Refund a PaymentIntent (full or partial, minor units). Best-effort: when
 * Stripe is unconfigured or the ref is a mock intent, logs and resolves `ok`
 * so the local refund/cancel still completes. `paymentRef` is the PaymentIntent
 * id (`pi_...`).
 */
export async function refundStripePayment(
  paymentRef: string | null | undefined,
  amount?: number
): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!isStripeEnabled() || !paymentRef || paymentRef.startsWith("pi_mock_")) {
    console.info(`[stripe] refund stub for ${paymentRef ?? "n/a"} amount=${amount ?? "full"}`);
    return { ok: true, message: "Refund recorded (Stripe not configured)" };
  }

  const body = new URLSearchParams({ payment_intent: paymentRef });
  if (amount) body.set("amount", String(amount));

  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    return { ok: false, message: `Stripe refund failed: ${res.status} ${await res.text()}` };
  }
  const refund = (await res.json()) as { id: string };
  return { ok: true, id: refund.id };
}
