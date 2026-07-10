import * as repo from "@/lib/db/repo";
import { adminReturnPost, readJson } from "@/lib/returns/route-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/returns/[id]/cod-review — finance verifies/rejects/marks-processed
 * a COD refund. Body: { action: "verify" | "reject" | "processed", remarks?, reference? }.
 */
export const POST = adminReturnPost(async (id, session, req) => {
  const body = await readJson<{ action?: string; remarks?: string; reference?: string }>(req);
  if (body.action === "processed") {
    return repo.markCodRefundProcessed({
      id,
      reference: body.reference ?? "",
      remarks: body.remarks,
      actor: session.email,
    });
  }
  const action = body.action === "reject" ? "reject" : "verify";
  return repo.reviewCodRefundDetails({ id, action, remarks: body.remarks, actor: session.email });
});
