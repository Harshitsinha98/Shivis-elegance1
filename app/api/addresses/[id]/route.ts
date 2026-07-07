import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/auth";
import { listAddresses, updateAddress, deleteAddress } from "@/lib/db/repo";
import type { Address } from "@/types/user";

export const dynamic = "force-dynamic";

type AddressPatch = Partial<Omit<Address, "id">>;

/** PATCH /api/addresses/[id] — update one of the signed-in user's addresses. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);
  const { id } = await params;

  const owned = await listAddresses(session.id);
  if (!owned.some((a) => a.id === id)) return fail("Address not found.", 404);

  let body: AddressPatch;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const patch: AddressPatch = {};
  for (const key of [
    "label",
    "fullName",
    "phone",
    "line1",
    "line2",
    "city",
    "state",
    "postalCode",
    "country",
  ] as const) {
    const value = body[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (key !== "line2" && !trimmed) return fail(`${key} cannot be empty`);
      (patch as Record<string, string>)[key] = trimmed;
    }
  }
  if (typeof body.isDefault === "boolean") patch.isDefault = body.isDefault;

  const address = await updateAddress(session.id, id, patch);
  if (!address) return fail("Could not update this address.", 500);
  return ok({ address });
}

/** DELETE /api/addresses/[id] — remove one of the signed-in user's addresses. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return fail("Please sign in first.", 401);
  const { id } = await params;

  const owned = await listAddresses(session.id);
  if (!owned.some((a) => a.id === id)) return fail("Address not found.", 404);

  await deleteAddress(id);
  return ok({ id });
}
