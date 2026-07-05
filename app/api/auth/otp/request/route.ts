import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { normalizeIdentifier, issueOtp, sendOtp, roleForIdentifier } from "@/lib/auth/otp";

export const dynamic = "force-dynamic";

/** POST /api/auth/otp/request — body { identifier } (email or phone). */
export async function POST(req: NextRequest) {
  let body: { identifier?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  if (!body.identifier) return fail("Email or phone is required");

  const parsed = normalizeIdentifier(body.identifier);
  if (!parsed) return fail("Enter a valid email or 10-digit phone number");

  const code = issueOtp(parsed.value);
  const delivery = await sendOtp(parsed.value, parsed.channel, code);

  return ok({
    identifier: parsed.value,
    channel: parsed.channel,
    role: roleForIdentifier(parsed.value),
    delivered: delivery.delivered,
    // Present only in demo mode so you can log in without a real SMS/email service.
    devCode: delivery.devCode ?? null,
  });
}
