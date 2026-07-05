import Link from "next/link";
import { CATEGORY_DATA } from "@/lib/mock-data";
import { ScrollReveal, StaggerGroup } from "@/components/shared/scroll-reveal";

export function CategoryShowcase() {
  return (
    <section className="container-luxe section-padding">
      <ScrollReveal className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">Find your piece</p>
        <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">Shop by category</h2>
      </ScrollReveal>

      <StaggerGroup className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {CATEGORY_DATA.map((cat) => (
          <ScrollReveal key={cat.slug}>
            <Link href={`/shop?category=${cat.slug}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-beige">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 to-transparent" />
                <span className="absolute inset-x-0 bottom-4 text-center font-display text-xl text-ivory">
                  {cat.name}
                </span>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </StaggerGroup>
    </section>
  );
}
