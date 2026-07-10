import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { cancelOrder, getOrderByNumber } from "@/lib/db/repo";
import { orderCancelledEmail, sendEmail } from "@/lib/notifications/email";

export const dynamic = "force-dynamic";

/** Maps repo error codes to a user-facing message + HTTP status. */
const ERRORS: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Order not found." },
  NOT_CANCELLABLE: { status: 409, message: "This order can no longer be cancelled." },
  DB_DISABLED: { status: 503, message: "Cancellations are unavailable in demo mode." },
};

/** POST /api/orders/[number]/cancel — customer cancels their own order. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);

  const { number } = await params;
  const decoded = decodeURIComponent(number);

  // Ownership: the order must belong to this user (by id or contact email).
  const existing = await getOrderByNumber(decoded);
  if (!existing) return fail("Order not found.", 404);
  const owns =
    (existing.userId && existing.userId === session.id) ||
    (existing.email && existing.email === session.email);
  if (!owns) return fail("You can only cancel your own orders.", 403);

  let reason: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    reason = typeof body?.reason === "string" ? body.reason : undefined;
  } catch {
    /* body optional */
  }

  try {
    const result = await cancelOrder({ number: decoded, reason });
    // Best-effort customer notification — never blocks the response.
    void sendEmail(orderCancelledEmail(result.order));
    return ok({
      order: result.order,
      refund: result.refund,
      shiprocketCancel: result.shiprocketCancel,
    });
  } catch (e) {
    const mapped = ERRORS[(e as Error).message];
    if (mapped) return fail(mapped.message, mapped.status);
    return fail("Could not cancel this order.", 500);
  }
}
