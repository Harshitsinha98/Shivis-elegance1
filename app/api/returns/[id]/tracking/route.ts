import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { getReturnRequestById } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

/**
 * GET /api/returns/[id]/tracking — reverse-shipment tracking for the owner or an
 * admin. Returns only the safe, display-ready tracking fields (never PII).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);
  const { id } = await ctx.params;

  const ret = await getReturnRequestById(id);
  if (!ret) return fail("Return request not found.", 404);

  const owns = ret.userId === session.id || ret.customerEmail === session.email;
  if (session.role !== "admin" && !owns) return fail("Not authorised.", 403);

  return ok({
    status: ret.status,
    reverseAwb: ret.reverseAwb,
    reverseCourier: ret.reverseCourier,
    reverseTrackingStatus: ret.reverseTrackingStatus,
    reverseTrackingCode: ret.reverseTrackingCode,
    reverseTrackingUrl: ret.reverseTrackingUrl,
    pickupScheduledDate: ret.pickupScheduledDate,
    estimatedPickupAt: ret.estimatedPickupAt,
    estimatedDeliveryAt: ret.estimatedDeliveryAt,
    warehouseReceivedAt: ret.warehouseReceivedAt,
    refundStatus: ret.refundStatus,
    refundReference: ret.refundReference ?? ret.refundId,
    refundAmount: ret.refundAmount,
    timeline: ret.timeline ?? [],
  });
}
