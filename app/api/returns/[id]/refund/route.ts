import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import * as repo from "@/lib/db/repo";
import { failFromReturnError } from "@/lib/returns/errors";

export const dynamic = "force-dynamic";

/** POST /api/returns/[id]/refund — initiate/retry the refund (manual fallback). */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return fail("Not authorised.", 403);
  const { id } = await ctx.params;
  try {
    const refund = await repo.initiateReturnRefund({ id, actor: session.email });
    if (!refund.ok) return fail(refund.message ?? "Refund failed.", 502, "REFUND_FAILED");
    return ok({ refund });
  } catch (e) {
    return failFromReturnError(e);
  }
}
