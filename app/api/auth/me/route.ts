import { ok } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/me — returns the current session user (or null). */
export async function GET() {
  const session = await getSession();
  return ok({
    authenticated: Boolean(session),
    user: session
      ? {
          id: session.id,
          name: session.name,
          email: session.email,
          phone: session.phone ?? null,
          role: session.role,
        }
      : null,
  });
}
