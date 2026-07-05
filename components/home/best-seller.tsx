import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BEST_SELLERS } from "@/lib/mock-data";
import { ProductGrid } from "@/components/product/product-grid";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function BestSellers() {
  return (
    <section className="bg-cream">
      <div className="container-luxe section-padding">
        <ScrollReveal className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">Loved by many</p>
            <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">Best sellers</h2>
          </div>
          <Link
            href="/best-sellers"
            className="hidden items-center gap-2 text-sm uppercase tracking-[0.14em] text-elegant-gray hover:text-champagne-dark md:flex"
          >
            View all <ArrowRight size={16} />
          </Link>
        </ScrollReveal>

        <ProductGrid products={BEST_SELLERS.slice(0, 4)} />
      </div>
    </section>
  );
}
