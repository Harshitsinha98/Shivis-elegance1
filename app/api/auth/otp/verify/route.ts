import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { normalizeIdentifier, verifyOtp, roleForIdentifier } from "@/lib/auth/otp";
import { upsertUserFromAuth } from "@/lib/db/repo";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  not_found: "No code was requested for this account. Please request a new one.",
  expired: "This code has expired. Please request a new one.",
  too_many: "Too many attempts. Please request a new code.",
  mismatch: "That code is incorrect. Please try again.",
};

/** POST /api/auth/otp/verify — body { identifier, code }. Sets session cookie. */
export async function POST(req: NextRequest) {
  let body: { identifier?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  if (!body.identifier || !body.code) return fail("Identifier and code are required");

  const parsed = normalizeIdentifier(body.identifier);
  if (!parsed) return fail("Invalid identifier");

  const result = verifyOtp(parsed.value, body.code);
  if (!result.ok) return fail(REASONS[result.reason] ?? "Verification failed", 401);

  const role = roleForIdentifier(parsed.value);
  const isEmail = parsed.channel === "email";
  const name = role === "admin"
    ? "Studio Admin"
    : isEmail
      ? parsed.value.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase())
      : "Shivis Elegance Member";

  const email = isEmail
    ? parsed.value
    : `${parsed.value.replace(/\D/g, "")}@phone.luxejewels`;

  // Persist/lookup the user so orders etc. can reference a stable id.
  const user = await upsertUserFromAuth({
    email,
    name,
    phone: parsed.channel === "phone" ? parsed.value : undefined,
    role,
  });

  const token = createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });

  const res = ok({
    user: { name: user.name, role: user.role, identifier: parsed.value },
    redirect: role === "admin" ? "/admin" : "/dashboard",
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return res;
}
