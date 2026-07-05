import type { NextRequest } from "next/server";
import { PRODUCTS, COLLECTIONS } from "@/lib/mock-data";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/search?q= — quick storefront search across products & collections. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q) return ok({ products: [], collections: [] });

  const products = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
  )
    .slice(0, 8)
    .map((p) => ({ slug: p.slug, name: p.name, tagline: p.tagline, image: p.images[0], price: p.price }));

  const collections = COLLECTIONS.filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 4)
    .map((c) => ({ slug: c.slug, name: c.name }));

  return ok({ products, collections });
}
