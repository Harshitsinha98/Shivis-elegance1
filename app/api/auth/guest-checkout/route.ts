import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { normalizeIdentifier, verifyOtp, roleForIdentifier } from "@/lib/auth/otp";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify";
import { upsertUserFromAuth, createAddress } from "@/lib/db/repo";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface GuestCheckoutBody {
  name?: string;
  email?: string;
  emailCode?: string;
  phone?: string;
  /** Firebase phone-auth proof (preferred when Firebase SMS is used). */
  idToken?: string;
  /** Server OTP code for the phone channel (fallback when Firebase is off). */
  phoneCode?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

/**
 * POST /api/auth/guest-checkout
 *
 * Verifies a guest's phone AND email during checkout, then automatically
 * creates (or reuses) their account, saves the address they entered, and issues
 * a session cookie. The caller then places the order as an authenticated user so
 * everything is tied to the new account.
 */
export async function POST(req: NextRequest) {
  let body: GuestCheckoutBody;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const name = body.name?.trim();
  if (!name) return fail("Name is required");

  // ── Verify email (server OTP) ──────────────────────────────────
  const emailParsed = body.email ? normalizeIdentifier(body.email) : null;
  if (!emailParsed || emailParsed.channel !== "email") {
    return fail("A valid email is required");
  }
  if (!body.emailCode) return fail("Email verification code is required");
  const emailResult = verifyOtp(emailParsed.value, body.emailCode);
  if (!emailResult.ok) {
    return fail("The email code is incorrect or has expired.", 401);
  }

  // ── Verify phone (Firebase idToken preferred, else server OTP) ──
  let verifiedPhone: string | undefined;
  let firebaseUid: string | undefined;

  if (body.idToken) {
    const info = await verifyFirebaseIdToken(body.idToken);
    if (!info?.phone) {
      return fail("Could not verify your phone number. Please try again.", 401);
    }
    verifiedPhone = info.phone;
    firebaseUid = info.uid;
  } else {
    const phoneParsed = body.phone ? normalizeIdentifier(body.phone) : null;
    if (!phoneParsed || phoneParsed.channel !== "phone") {
      return fail("A valid phone number is required");
    }
    if (!body.phoneCode) return fail("Phone verification code is required");
    const phoneResult = verifyOtp(phoneParsed.value, body.phoneCode);
    if (!phoneResult.ok) {
      return fail("The phone code is incorrect or has expired.", 401);
    }
    verifiedPhone = phoneParsed.value;
  }

  // Admin identifiers can be either channel; keep the promotion behaviour.
  const role =
    roleForIdentifier(verifiedPhone) === "admin" ||
    roleForIdentifier(emailParsed.value) === "admin"
      ? "admin"
      : "customer";

  // ── Create / reuse the account ─────────────────────────────────
  const user = await upsertUserFromAuth({
    firebaseUid,
    email: emailParsed.value,
    name,
    phone: verifiedPhone,
    role,
  });

  // ── Save the address they entered so it's on their account ─────
  if (body.address?.line1) {
    try {
      await createAddress(user.id, {
        label: "Home",
        fullName: name,
        phone: verifiedPhone ?? "",
        line1: body.address.line1,
        line2: body.address.line2 || undefined,
        city: body.address.city ?? "",
        state: body.address.state ?? "",
        postalCode: body.address.postalCode ?? "",
        country: body.address.country || "India",
        isDefault: true,
      });
    } catch {
      // Non-fatal: the order still carries the address snapshot.
    }
  }

  const token = createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });

  const res = ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
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
