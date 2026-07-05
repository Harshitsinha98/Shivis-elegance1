import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getNewArrivals } from "@/lib/db/repo";
import { ProductGrid } from "@/components/product/product-grid";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export async function NewArrivals() {
  const newArrivals = await getNewArrivals();
  return (
    <section className="container-luxe section-padding">
      <ScrollReveal className="mb-12 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">Just landed</p>
          <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">New arrivals</h2>
        </div>
        <Link
          href="/new-arrivals"
          className="hidden items-center gap-2 text-sm uppercase tracking-[0.14em] text-elegant-gray hover:text-champagne-dark md:flex"
        >
          View all <ArrowRight size={16} />
        </Link>
      </ScrollReveal>

      <ProductGrid products={newArrivals.slice(0, 4)} />
    </section>
  );
}
