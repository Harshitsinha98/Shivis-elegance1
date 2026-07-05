import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { verifyRazorpayWebhook, isRazorpayEnabled } from "@/lib/payments/razorpay";
import { markOrderPaid } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

interface RazorpayEvent {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } };
    order?: { entity?: { id?: string; receipt?: string } };
  };
}

/**
 * Resolve our internal order number from a Razorpay event. We set
 * `receipt: <order number>` when creating the Razorpay order, so `order.paid`
 * events carry it directly; `payment.captured` events may echo it in `notes`.
 */
function resolveOrderNumber(e: RazorpayEvent): string | undefined {
  return (
    e.payload?.order?.entity?.receipt ||
    e.payload?.payment?.entity?.notes?.receipt ||
    undefined
  );
}

/** POST /api/webhooks/razorpay — payment/order lifecycle events. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (isRazorpayEnabled() && !verifyRazorpayWebhook(raw, signature)) {
    return fail("Invalid webhook signature", 401);
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return fail("Invalid payload");
  }

  let handled = false;
  switch (event.event) {
    case "order.paid":
    case "payment.captured": {
      const number = resolveOrderNumber(event);
      const paymentRef = event.payload?.payment?.entity?.id;
      if (number) {
        await markOrderPaid(number, paymentRef).catch(() => null);
        handled = true;
      }
      break;
    }
    case "payment.failed":
      // No paymentRef->order finder yet; acknowledged so Razorpay stops retrying.
      break;
    default:
      break;
  }

  return ok({ received: true, event: event.event ?? "unknown", handled });
}
