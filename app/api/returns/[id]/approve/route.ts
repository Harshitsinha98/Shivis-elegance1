import * as repo from "@/lib/db/repo";
import { sendEmail, returnStatusUpdateEmail } from "@/lib/notifications/email";
import { adminReturnPost } from "@/lib/returns/route-helpers";

export const dynamic = "force-dynamic";

/** POST /api/returns/[id]/approve — approve + auto-create reverse pickup. */
export const POST = adminReturnPost(async (id, session) => {
  const { returnRequest, reverse } = await repo.approveReturnWithReversePickup({
    id,
    actor: session.email,
  });
  void sendEmail(returnStatusUpdateEmail(returnRequest, "approved"));
  return { returnRequest, reverse };
});
