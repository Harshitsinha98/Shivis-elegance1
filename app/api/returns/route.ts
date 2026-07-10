import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { listReturnRequests, returnRequestsForUser } from "@/lib/db/repo";
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

/**
 * GET /api/returns — admins see every return request (optional `?status=`),
 * signed-in customers see only their own. Unauthenticated → empty list.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return ok([]);

  if (session.role === "admin") {
    const statusParam = req.nextUrl.searchParams.get("status") as ReturnStatus | null;
    const status = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;
    return ok(await listReturnRequests(status));
  }

  return ok(await returnRequestsForUser(session.id, session.email));
}
