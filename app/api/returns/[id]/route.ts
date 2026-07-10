import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { getReturnRequestById, updateReturnRequestStatus } from "@/lib/db/repo";
import { returnStatusUpdateEmail, sendEmail } from "@/lib/notifications/email";
import type { ReturnStatus } from "@/types/order";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ReturnStatus[] = [
  "requested",
  "approved",
  "rejected",
  "pickup_scheduled",
  "picked_up",
  "refund_initiated",
  "refund_completed",
  "completed",
];

const ERRORS: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Return request not found." },
  INVALID_TRANSITION: { status: 409, message: "That status change isn't allowed." },
  DB_DISABLED: { status: 503, message: "Returns are unavailable in demo mode." },
};

/** PATCH /api/returns/[id] — admin updates a return request's status/notes. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") return fail("Not authorised.", 403);

  const { id } = await params;

  let body: { status?: string; adminNotes?: string; refundAmount?: number };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const status =
    body.status && VALID_STATUSES.includes(body.status as ReturnStatus)
      ? (body.status as ReturnStatus)
      : undefined;
  if (body.status && !status) return fail("Invalid return status.");

  try {
    const { returnRequest, refund } = await updateReturnRequestStatus({
      id,
      status,
      adminNotes: body.adminNotes,
      refundAmount: typeof body.refundAmount === "number" ? body.refundAmount : undefined,
    });
    if (status) void sendEmail(returnStatusUpdateEmail(returnRequest, status));
    return ok({ returnRequest, refund });
  } catch (e) {
    const mapped = ERRORS[(e as Error).message];
    if (mapped) return fail(mapped.message, mapped.status);
    return fail("Could not update the return request.", 500);
  }
}

/** GET /api/returns/[id] — fetch a single return (admin, or the owner). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);
  const { id } = await params;
  const ret = await getReturnRequestById(id);
  if (!ret) return fail("Return request not found.", 404);
  const owns = ret.userId === session.id || ret.customerEmail === session.email;
  if (session.role !== "admin" && !owns) return fail("Not authorised.", 403);
  return ok(ret);
}
