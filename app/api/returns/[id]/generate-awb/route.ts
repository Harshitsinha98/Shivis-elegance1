import * as repo from "@/lib/db/repo";
import { adminReturnPost } from "@/lib/returns/route-helpers";

export const dynamic = "force-dynamic";

/** POST /api/returns/[id]/generate-awb — manual reverse AWB/pickup fallback. */
export const POST = adminReturnPost((id, session) =>
  repo.generateReverseAwbForReturn(id, session.email)
);
