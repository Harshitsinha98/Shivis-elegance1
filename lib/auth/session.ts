/**
 * Stateless session tokens signed with an HMAC (no external dependency).
 *
 * A token is `base64url(payload).base64url(hmacSHA256(payload))`. It is stored
 * in an httpOnly cookie so it cannot be read by client JS. Swap the secret in
 * production via AUTH_SESSION_SECRET.
 */
import crypto from "crypto";
import type { UserRole } from "@/types/user";

export const SESSION_COOKIE = "lj_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SECRET =
  process.env.AUTH_SESSION_SECRET ||
  "luxejewels-dev-secret-change-me-in-production";

export interface SessionPayload {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  /** expiry, unix seconds */
  exp: number;
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64url");

function sign(data: string) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

/** Create a signed session token for the given user payload. */
export function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds = SESSION_TTL_SECONDS
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  return `${body}.${sign(body)}`;
}

/** Verify a token and return its payload, or null if invalid/expired/tampered. */
export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  // Constant-time signature comparison.
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString()
    ) as SessionPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
