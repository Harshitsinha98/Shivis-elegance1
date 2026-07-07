import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { normalizeIndiaState } from "@/lib/india-states";

export const dynamic = "force-dynamic";

interface PostOffice {
  Name: string;
  District: string;
  State: string;
}
interface PincodeApiResult {
  Status: string;
  PostOffice: PostOffice[] | null;
}

/**
 * GET /api/pincode/[code] — resolve an Indian PIN code to city (district) +
 * state, via India Post's free public lookup (no API key required). Proxied
 * server-side to keep the third-party call off the client, matching the
 * pattern used by /api/shipping.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    return fail("A valid 6-digit pincode is required");
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
      // India Post has no cache headers of its own — avoid Next caching a stale miss.
      cache: "no-store",
    });
    if (!res.ok) return fail("Pincode lookup failed", 502);

    const [result] = (await res.json()) as PincodeApiResult[];
    const office = result?.PostOffice?.[0];
    if (result?.Status !== "Success" || !office) {
      return fail("Could not find this pincode", 404);
    }

    return ok({
      city: office.District,
      state: normalizeIndiaState(office.State) ?? office.State,
      areas: (result.PostOffice ?? []).map((o) => o.Name),
    });
  } catch (e) {
    return fail(`Pincode lookup failed: ${(e as Error).message}`, 502);
  }
}
