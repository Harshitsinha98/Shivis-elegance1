import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import * as repo from "@/lib/db/repo";
import { failFromReturnError } from "@/lib/returns/errors";
import { validateCodRefundInput, type CodRefundInput } from "@/lib/security/validate-bank";

export const dynamic = "force-dynamic";

/**
 * POST /api/returns/[id]/cod-details — customer submits UPI/bank payout details
 * for a COD return. Ownership + server-side validation enforced; PII is
 * encrypted before it touches the database.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);
  const { id } = await ctx.params;

  let body: CodRefundInput;
  try {
    body = (await req.json()) as CodRefundInput;
  } catch {
    return fail("Invalid request body.");
  }

  // Defence in depth — validate here too (the service validates again).
  const v = validateCodRefundInput(body);
  if (!v.ok) return fail(v.error ?? "Invalid details.", 422);

  try {
    const returnRequest = await repo.submitCodRefundDetails({
      id,
      actorUserId: session.id,
      actorEmail: session.email,
      data: body,
    });
    return ok({ returnRequest });
  } catch (e) {
    return failFromReturnError(e);
  }
}
