import * as repo from "@/lib/db/repo";
import { adminReturnPost } from "@/lib/returns/route-helpers";

export const dynamic = "force-dynamic";

/** POST /api/returns/[id]/refresh-tracking — pull live reverse tracking. */
export const POST = adminReturnPost((id, session) =>
  repo.refreshReverseTracking(id, session.email)
);
