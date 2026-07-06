import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ScrollReveal, StaggerGroup } from "@/components/shared/scroll-reveal";

/** Prices are stored in paise, so ₹50,000 = 5_000_000. */
const BANDS = [
  { label: "Under ₹50K", href: "/shop?maxPrice=5000000&sort=price-asc" },
  { label: "Under ₹1 Lakh", href: "/shop?maxPrice=10000000&sort=price-asc" },
  { label: "Under ₹2.5 Lakh", href: "/shop?maxPrice=25000000&sort=price-asc" },
  { label: "Statement Pieces", href: "/shop?sort=price-desc" },
];

export function ShopByPrice() {
  return (
    <section className="container-luxe section-padding">
      <ScrollReveal className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">Every budget, beautifully</p>
        <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">Shop by price</h2>
      </ScrollReveal>

      <StaggerGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {BANDS.map((b) => (
          <ScrollReveal key={b.label}>
            <Link
              href={b.href}
              className="group relative flex aspect-[5/3] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-champagne to-champagne-dark p-6 text-pearl transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-pearl/10 blur-xl" />
              <ArrowUpRight size={20} className="self-end opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-pearl/70">Shop now</p>
                <p className="mt-1 font-display text-2xl md:text-3xl">{b.label}</p>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </StaggerGroup>
    </section>
  );
}
