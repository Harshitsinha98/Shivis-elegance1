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
