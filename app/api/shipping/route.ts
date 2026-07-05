import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getShippingRate } from "@/lib/shipping/shiprocket";

export const dynamic = "force-dynamic";

/** POST /api/shipping — get a shipping rate + ETA for a destination pincode. */
export async function POST(req: NextRequest) {
  let body: { pincode?: string; weightKg?: number; cod?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  if (!body.pincode || !/^\d{5,6}$/.test(body.pincode)) {
    return fail("A valid destination pincode is required");
  }

  try {
    const rate = await getShippingRate({
      toPincode: body.pincode,
      weightKg: body.weightKg ?? 0.2,
      cod: body.cod,
    });
    return ok(rate);
  } catch (e) {
    return fail(`Shipping lookup failed: ${(e as Error).message}`, 502);
  }
}
