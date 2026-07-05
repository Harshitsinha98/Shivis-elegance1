import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/clerk — user lifecycle events (user.created, user.updated…).
 *
 * Clerk signs webhooks with Svix headers. When CLERK_WEBHOOK_SECRET is set you
 * should verify with the `svix` library; here we validate the headers are
 * present and process the event so the endpoint is functional in demo mode.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  const svixId = req.headers.get("svix-id");
  const svixSignature = req.headers.get("svix-signature");

  if (secret && (!svixId || !svixSignature)) {
    return fail("Missing Svix signature headers", 401);
  }

  let event: { type?: string; data?: { id?: string; email_addresses?: unknown } };
  try {
    event = await req.json();
  } catch {
    return fail("Invalid payload");
  }

  switch (event.type) {
    case "user.created":
      // TODO: upsert the user into the database with role "customer".
      break;
    case "user.updated":
      // TODO: sync profile changes.
      break;
    case "user.deleted":
      // TODO: soft-delete the user.
      break;
    default:
      break;
  }

  return ok({ received: true, type: event.type ?? "unknown" });
}
