import * as repo from "@/lib/db/repo";
import { adminReturnPost } from "@/lib/returns/route-helpers";

export const dynamic = "force-dynamic";

/** POST /api/returns/[id]/warehouse-received — manual receipt + auto-refund. */
export const POST = adminReturnPost((id, session) =>
  repo.markWarehouseReceivedAndRefund({ id, actor: session.email, via: session.email })
);
