import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { updateProfile } from "@/lib/db/repo";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface ProfileBody {
  name?: string;
  phone?: string;
}

/**
 * PATCH /api/auth/profile — update the signed-in user's name / phone.
 * Persists to the DB and re-issues the session cookie so the new values show
 * everywhere immediately (the session payload carries name + phone).
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);

  let body: ProfileBody;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  if (!name) return fail("Name cannot be empty");

  const updated = await updateProfile(session.id, {
    name,
    phone: phone || undefined,
  });
  if (!updated) return fail("Could not update your profile.", 500);

  // Refresh the session so the new name/phone are reflected right away.
  const token = createSessionToken({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
  });

  const res = ok({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone ?? null,
      role: updated.role,
    },
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
