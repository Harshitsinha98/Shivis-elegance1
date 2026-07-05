/**
 * One-time-password issuing & verification.
 *
 * In demo mode (no SMS/email provider configured) the OTP is returned by the
 * request API so you can log in without any external service. Wire up a real
 * provider (Twilio, MSG91, Resend…) in `sendOtp()` and set
 * AUTH_OTP_DELIVERY=live to stop exposing the code.
 */
import crypto from "crypto";
import type { UserRole } from "@/types/user";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory store. Hung off globalThis because Next.js compiles each API
// route into its own module graph — a plain module-level Map would be a
// DIFFERENT Map in /otp/request vs /otp/verify, so issued codes could never
// be found at verify time. Survives across requests within one server
// process; for multi-instance production use Redis or the database instead.
const globalForOtp = globalThis as unknown as { __otpStore?: Map<string, OtpRecord> };
const store = (globalForOtp.__otpStore ??= new Map<string, OtpRecord>());

export const isOtpLive = () => process.env.AUTH_OTP_DELIVERY === "live";

/** Admin identifiers (comma-separated emails/phones). */
function adminIdentifiers(): string[] {
  const fromEnv = process.env.AUTH_ADMIN_EMAILS || "admin@shiviselegance.com";
  return fromEnv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    // Owner's admin phone — kept here too so admin access survives an
    // env mishap. Sign in with this number to reach /admin.
    .concat("+919278043939");
}

export function normalizeIdentifier(raw: string): {
  value: string;
  channel: "email" | "phone";
} | null {
  const trimmed = raw.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { value: trimmed, channel: "email" };
  }
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (/^\+?\d{10,14}$/.test(digits)) {
    // Default to +91 when no country code is supplied.
    const value = digits.startsWith("+")
      ? digits
      : `+91${digits.slice(-10)}`;
    return { value, channel: "phone" };
  }
  return null;
}

export function roleForIdentifier(value: string): UserRole {
  return adminIdentifiers().includes(value.toLowerCase()) ? "admin" : "customer";
}

/** Generate + store a 6-digit code for the identifier. */
export function issueOtp(identifier: string): string {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  store.set(identifier, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return code;
}

/**
 * Deliver the OTP. In demo mode this just logs it; returns the code only when
 * not live, so the API can surface it to the user for frictionless testing.
 */
export async function sendOtp(
  identifier: string,
  channel: "email" | "phone",
  code: string
): Promise<{ delivered: boolean; devCode?: string }> {
  if (isOtpLive()) {
    // TODO: integrate Twilio / MSG91 (SMS) or Resend / SES (email) here.
    return { delivered: true };
  }
  // eslint-disable-next-line no-console
  console.log(`[Shivis Elegance OTP] ${channel} ${identifier} → ${code}`);
  return { delivered: true, devCode: code };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "not_found" | "too_many" | "mismatch" };

export function verifyOtp(identifier: string, code: string): VerifyResult {
  const record = store.get(identifier);
  if (!record) return { ok: false, reason: "not_found" };
  if (Date.now() > record.expiresAt) {
    store.delete(identifier);
    return { ok: false, reason: "expired" };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    store.delete(identifier);
    return { ok: false, reason: "too_many" };
  }
  record.attempts += 1;
  if (record.code !== code.trim()) return { ok: false, reason: "mismatch" };
  store.delete(identifier);
  return { ok: true };
}
