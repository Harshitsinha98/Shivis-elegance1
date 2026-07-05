import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify";
import { roleForIdentifier } from "@/lib/auth/otp";
import { upsertUserFromAuth } from "@/lib/db/repo";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/session — exchange a verified Firebase ID token for a
 * Shivis Elegance session cookie. The client obtains the ID token after completing
 * phone-SMS OTP or an email magic-link sign-in via the Firebase Web SDK.
 *
 * The token is verified server-side (Identity Toolkit REST), the user is
 * upserted into Postgres, and a signed httpOnly session cookie is set.
 */
export async function POST(req: NextRequest) {
  let body: { idToken?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  if (!body.idToken) return fail("Missing idToken");

  const info = await verifyFirebaseIdToken(body.idToken);
  if (!info) return fail("Could not verify sign-in. Please try again.", 401);

  // Identity: prefer verified email, else phone.
  const identifier = info.email ?? info.phone;
  if (!identifier) return fail("No email or phone on the account", 400);

  const role = roleForIdentifier(identifier);
  const isEmail = Boolean(info.email);

  const displayName =
    body.name?.trim() ||
    (role === "admin"
      ? "Studio Admin"
      : isEmail
        ? info.email!.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase())
        : "Shivis Elegance Member");

  // Every user needs a unique email for the DB; synthesise one for phone-only.
  const email = info.email ?? `${info.phone!.replace(/\D/g, "")}@phone.luxejewels`;

  const user = await upsertUserFromAuth({
    firebaseUid: info.uid,
    email,
    name: displayName,
    phone: info.phone,
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
    user: { name: user.name, role: user.role, email: user.email },
    redirect: user.role === "admin" ? "/admin" : "/dashboard",
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
