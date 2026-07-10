import type { NextRequest } from "next/server";
import { ok, fail, orderNumber } from "@/lib/api";
import { computeTotals } from "@/lib/pricing";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { createStripePaymentIntent } from "@/lib/payments/stripe";
import { getSession } from "@/lib/auth/auth";
import { createOrder, ordersForUser } from "@/lib/db/repo";
import {
  orderPlacedCustomerEmail,
  orderPlacedAdminEmail,
  sendEmail,
} from "@/lib/notifications/email";
import type {
  OrderItem,
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
} from "@/types/order";

export const dynamic = "force-dynamic";

interface CreateOrderBody {
  items: OrderItem[];
  shippingAddress: Record<string, string>;
  paymentProvider: PaymentProvider;
  couponCode?: string;
}

/** GET /api/orders — the signed-in user's orders (empty when not signed in). */
export async function GET() {
  const session = await getSession();
  if (!session) return ok([]);
  const orders = await ordersForUser(session.id, session.email);
  return ok(orders);
}

/** POST /api/orders — create + persist an order and initialise payment. */
export async function POST(req: NextRequest) {
  let body: CreateOrderBody;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  if (!body.items?.length) return fail("Cart is empty");
  if (!body.shippingAddress?.fullName) return fail("Shipping address is required");

  const totals = computeTotals(
    body.items.map((i) => ({ price: i.unitPrice, quantity: i.quantity })),
    body.couponCode
  );

  const number = orderNumber(
    body.items.map((i) => `${i.productId}x${i.quantity}`).join("|") +
      body.shippingAddress.fullName
  );

  // Initialise the chosen payment provider (mock unless keys are configured).
  let payment: { id?: string; mock?: boolean; provider?: string } = {
    provider: body.paymentProvider,
    mock: true,
  };
  try {
    if (body.paymentProvider === "razorpay") {
      payment = await createRazorpayOrder({ amount: totals.total, receipt: number });
    } else if (body.paymentProvider === "stripe") {
      payment = await createStripePaymentIntent({
        amount: totals.total,
        currency: "inr",
        orderNumber: number,
        email: body.shippingAddress.email,
      });
    }
  } catch (e) {
    return fail(`Payment init failed: ${(e as Error).message}`, 502);
  }

  // Status rules:
  //  - COD          → confirmed, awaiting cash (unpaid)
  //  - mock gateway → confirmed + paid immediately (demo: no client payment step)
  //  - live gateway → pending + unpaid until the payment webhook confirms it
  const isMockGateway = body.paymentProvider !== "cod" && payment.mock === true;
  const status: OrderStatus =
    body.paymentProvider === "cod" || isMockGateway ? "confirmed" : "pending";
  const paymentStatus: PaymentStatus = isMockGateway ? "paid" : "unpaid";

  const session = await getSession();

  const order = await createOrder({
    number,
    userId: session?.id,
    email: body.shippingAddress.email || session?.email,
    phone: body.shippingAddress.phone || session?.phone,
    items: body.items,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    currency: "INR",
    paymentProvider: body.paymentProvider,
    paymentRef: payment.id,
    paymentStatus,
    status,
    shippingAddress: body.shippingAddress,
    couponCode: body.couponCode,
  });

  // Fire-and-forget alerts: order confirmation to the customer, new-order to admin.
  // Best-effort — never blocks or fails the order response.
  void sendEmail(orderPlacedCustomerEmail(order));
  void sendEmail(orderPlacedAdminEmail(order));

  return ok(
    {
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentProvider: order.paymentProvider,
      totals,
      payment,
      items: order.items,
    },
    { status: 201 }
  );
}
