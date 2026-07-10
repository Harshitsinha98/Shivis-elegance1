/**
 * Shared plumbing for the /api/returns/[id]/* endpoints: admin auth-gate +
 * uniform error mapping, so each route file stays a one-liner.
 */
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import type { SessionPayload } from "@/lib/auth/session";
import { failFromReturnError } from "./errors";

type RouteCtx = { params: Promise<{ id: string }> };

/** Wrap an admin-only return action as a Next.js POST handler. */
export function adminReturnPost(
  handler: (id: string, session: SessionPayload, req: NextRequest) => Promise<unknown>
) {
  return async (req: NextRequest, ctx: RouteCtx) => {
    const session = await getSession();
    if (!session || session.role !== "admin") return fail("Not authorised.", 403);
    const { id } = await ctx.params;
    try {
      return ok(await handler(id, session, req));
    } catch (e) {
      return failFromReturnError(e);
    }
  };
}

/** Safely parse a JSON body, returning {} on empty/invalid. */
export async function readJson<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
