import type { NextRequest } from "next/server";
import { queryProducts, getProductBySlug } from "@/lib/mock-data";
import { ok, fail } from "@/lib/api";
import type { ProductQuery } from "@/types/api";

export const dynamic = "force-dynamic";

/** GET /api/products — list/filter products, or fetch one via ?slug= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const slug = sp.get("slug");
  if (slug) {
    const product = getProductBySlug(slug);
    return product ? ok(product) : fail("Product not found", 404);
  }

  const query: ProductQuery = {
    category: sp.get("category") ?? undefined,
    collection: sp.get("collection") ?? undefined,
    metal: sp.get("metal") ?? undefined,
    gemstone: sp.get("gemstone") ?? undefined,
    minPrice: sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined,
    maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
    sort: (sp.get("sort") as ProductQuery["sort"]) ?? undefined,
    q: sp.get("q") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 12,
  };

  return ok(queryProducts(query));
}
