import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/types/product";
import { ProductGrid } from "@/components/product/product-grid";

/**
 * A titled row of products for the homepage — eyebrow + heading on the left,
 * a "view all" link on the right, then a responsive product grid. Reused for
 * New Arrivals, Best Sellers, Trending, etc. `tone="cream"` gives an alternate
 * background so consecutive rails read as distinct bands.
 */
export function ProductRail({
  eyebrow,
  title,
  href = "/shop",
  products,
  limit = 8,
  tone = "plain",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  products: Product[];
  limit?: number;
  tone?: "plain" | "cream";
}) {
  const items = products.slice(0, limit);
  if (items.length === 0) return null;

  return (
    <section className={tone === "cream" ? "bg-cream" : ""}>
      <div className="container-luxe section-padding">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">{eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl text-obsidian md:text-4xl">{title}</h2>
          </div>
          <Link
            href={href}
            className="group hidden shrink-0 items-center gap-2 border-b border-champagne pb-1 text-xs uppercase tracking-[0.14em] text-champagne-dark transition hover:gap-3 md:flex"
          >
            View all
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <ProductGrid products={items} />

        <div className="mt-10 text-center md:hidden">
          <Link
            href={href}
            className="inline-flex items-center gap-2 border-b border-champagne pb-1 text-xs uppercase tracking-[0.14em] text-champagne-dark"
          >
            View all <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
