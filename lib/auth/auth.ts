/**
 * Server-side auth helpers backed by the signed session cookie.
 *
 * The session is issued by the OTP flow (see `app/api/auth/*`). These helpers
 * read and verify it from the request cookies. They return `null` when no valid
 * session is present, so layouts can redirect to the sign-in page.
 */
import { cookies } from "next/headers";
import type { User } from "@/types/user";
import { getUserById } from "@/lib/db/repo";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from "./session";

export const isAuthEnabled = () => true;

/** Turn a verified session payload into a full User object (no DB hit). */
function toUser(session: SessionPayload): User {
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    phone: session.phone,
    role: session.role,
    addresses: [],
    createdAt: new Date(0).toISOString(),
  };
}

/** Read + verify the current session, or null. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Current signed-in user (any role), or null. Hydrates the full record
 * (addresses etc.) from the database when available, falling back to the
 * session payload so it still works without a DB.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const dbUser = await getUserById(session.id).catch(() => null);
  return dbUser ?? toUser(session);
}

/** Current user only if they are an admin, else null. */
export async function getCurrentAdmin(): Promise<User | null> {
  const session = await getSession();
  return session && session.role === "admin" ? toUser(session) : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
