import type { NextRequest } from "next/server";
import { ok, fail, orderNumber } from "@/lib/api";
import { createStripePaymentIntent } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

/** POST /api/payments/stripe — create a Stripe PaymentIntent for the given amount. */
export async function POST(req: NextRequest) {
  let body: { amount?: number; currency?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const amount = Number(body.amount);
  if (!amount || amount < 50) return fail("A valid amount (in minor units) is required");

  try {
    const intent = await createStripePaymentIntent({
      amount,
      currency: body.currency ?? "inr",
      orderNumber: orderNumber(String(amount) + (body.email ?? "")),
      email: body.email,
    });
    return ok({
      clientSecret: intent.clientSecret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
      mock: intent.mock,
    });
  } catch (e) {
    return fail(`Stripe error: ${(e as Error).message}`, 502);
  }
}
