import * as repo from "@/lib/db/repo";
import { adminReturnPost } from "@/lib/returns/route-helpers";

export const dynamic = "force-dynamic";

/** POST /api/returns/[id]/cancel-pickup — cancel the reverse pickup. */
export const POST = adminReturnPost((id, session) =>
  repo.cancelReversePickupForReturn(id, session.email)
);
