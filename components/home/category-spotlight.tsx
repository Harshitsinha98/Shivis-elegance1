import { getProductsByCategory } from "@/lib/db/repo";
import { ProductRail } from "@/components/home/product-rail";
import type { CategorySlug } from "@/types/product";

/** A rail spotlighting one category — reads live from the DB. */
export async function CategorySpotlight({
  category,
  eyebrow,
  title,
  tone,
}: {
  category: CategorySlug;
  eyebrow: string;
  title: string;
  tone?: "plain" | "cream";
}) {
  const products = await getProductsByCategory(category);
  return (
    <ProductRail
      eyebrow={eyebrow}
      title={title}
      href={`/shop?category=${category}`}
      products={products}
      limit={4}
      tone={tone}
    />
  );
}
