import * as repo from "@/lib/db/repo";
import { adminReturnPost } from "@/lib/returns/route-helpers";

export const dynamic = "force-dynamic";

/** POST /api/returns/[id]/schedule-pickup — schedule/reschedule reverse pickup. */
export const POST = adminReturnPost((id, session) =>
  repo.scheduleReversePickupForReturn(id, session.email)
);
