import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { createReturnRequest, getOrderByNumber } from "@/lib/db/repo";
import {
  returnRequestedAdminEmail,
  returnRequestedCustomerEmail,
  sendEmail,
} from "@/lib/notifications/email";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Order not found." },
  NOT_DELIVERED: { status: 409, message: "Only delivered orders can be returned." },
  WINDOW_EXPIRED: { status: 409, message: "Return window has expired." },
  RETURN_EXISTS: { status: 409, message: "A return request already exists for this order." },
  REASON_REQUIRED: { status: 400, message: "A return reason is required." },
  NO_ITEMS: { status: 400, message: "Select at least one item to return." },
  ITEM_NOT_IN_ORDER: { status: 400, message: "One of the items isn't part of this order." },
  QUANTITY_TOO_HIGH: { status: 400, message: "Return quantity exceeds the amount ordered." },
  DB_DISABLED: { status: 503, message: "Returns are unavailable in demo mode." },
};

interface ReturnBody {
  reason?: string;
  description?: string;
  images?: string[];
  items?: { orderItemId?: string; quantity?: number }[];
}

/** POST /api/orders/[number]/return — customer raises a per-item return. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);

  const { number } = await params;
  const decoded = decodeURIComponent(number);

  const existing = await getOrderByNumber(decoded);
  if (!existing) return fail("Order not found.", 404);
  const owns =
    (existing.userId && existing.userId === session.id) ||
    (existing.email && existing.email === session.email);
  if (!owns) return fail("You can only return your own orders.", 403);

  let body: ReturnBody;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const items = (body.items ?? [])
    .filter((i) => i?.orderItemId && Number(i.quantity) > 0)
    .map((i) => ({ orderItemId: String(i.orderItemId), quantity: Math.round(Number(i.quantity)) }));

  try {
    const { order, returnRequest } = await createReturnRequest({
      number: decoded,
      reason: body.reason ?? "",
      description: body.description,
      images: Array.isArray(body.images) ? body.images : [],
      items,
    });
    void sendEmail(returnRequestedCustomerEmail(order, returnRequest));
    void sendEmail(returnRequestedAdminEmail(order, returnRequest));
    return ok({ order, returnRequest }, { status: 201 });
  } catch (e) {
    const mapped = ERRORS[(e as Error).message];
    if (mapped) return fail(mapped.message, mapped.status);
    return fail("Could not submit your return request.", 500);
  }
}
