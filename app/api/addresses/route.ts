import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { listAddresses, createAddress } from "@/lib/db/repo";
import type { Address } from "@/types/user";

export const dynamic = "force-dynamic";

type AddressInput = Omit<Address, "id">;

function parseAddressBody(body: Partial<AddressInput>): AddressInput | string {
  const label = body.label?.trim();
  const fullName = body.fullName?.trim();
  const phone = body.phone?.trim();
  const line1 = body.line1?.trim();
  const city = body.city?.trim();
  const state = body.state?.trim();
  const postalCode = body.postalCode?.trim();

  if (!label) return "Label is required";
  if (!fullName) return "Full name is required";
  if (!phone) return "Phone is required";
  if (!line1) return "Address line 1 is required";
  if (!city) return "City is required";
  if (!state) return "State is required";
  if (!postalCode) return "Postal code is required";

  return {
    label,
    fullName,
    phone,
    line1,
    line2: body.line2?.trim() || undefined,
    city,
    state,
    postalCode,
    country: body.country?.trim() || "India",
    isDefault: Boolean(body.isDefault),
  };
}

/** GET /api/addresses — list the signed-in user's saved addresses. */
export async function GET() {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);

  const addresses = await listAddresses(session.id);
  return ok({ addresses });
}

/** POST /api/addresses — save a new address for the signed-in user. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);

  let body: Partial<AddressInput>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const parsed = parseAddressBody(body);
  if (typeof parsed === "string") return fail(parsed);

  const address = await createAddress(session.id, parsed);
  return ok({ address }, { status: 201 });
}
