import { getBestSellers } from "@/lib/db/repo";
import { ProductRail } from "@/components/home/product-rail";

export async function BestSellers() {
  const bestSellers = await getBestSellers();
  return (
    <ProductRail
      eyebrow="Loved by many"
      title="Best sellers"
      href="/best-sellers"
      products={bestSellers}
      limit={8}
      tone="cream"
    />
  );
}
