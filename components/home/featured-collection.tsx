import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FEATURED_COLLECTIONS } from "@/lib/mock-data";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function FeaturedCollection() {
  const [primary, ...rest] = FEATURED_COLLECTIONS;
  if (!primary) return null;

  return (
    <section className="container-luxe section-padding">
      <ScrollReveal className="mb-12 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">Curated for you</p>
          <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">
            Featured collections
          </h2>
        </div>
        <Link
          href="/collections"
          className="hidden items-center gap-2 text-sm uppercase tracking-[0.14em] text-elegant-gray hover:text-champagne-dark md:flex"
        >
          View all <ArrowRight size={16} />
        </Link>
      </ScrollReveal>

      <div className="grid gap-4 md:grid-cols-2">
        <ScrollReveal>
          <Link
            href={`/collections/${primary.slug}`}
            className="group relative block h-full min-h-[420px] overflow-hidden rounded-2xl"
          >
            <img
              src={primary.heroImage}
              alt={primary.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 to-transparent" />
            <div className="absolute bottom-8 left-8 max-w-sm text-ivory">
              <h3 className="font-display text-3xl">{primary.name}</h3>
              <p className="mt-2 text-sm text-ivory/80">{primary.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-champagne-light">
                Discover <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        </ScrollReveal>

        <div className="grid gap-4">
          {rest.slice(0, 2).map((col, i) => (
            <ScrollReveal key={col.slug} delay={i * 0.1}>
              <Link
                href={`/collections/${col.slug}`}
                className="group relative block min-h-[200px] overflow-hidden rounded-2xl"
              >
                <img
                  src={col.heroImage}
                  alt={col.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-obsidian/60 to-transparent" />
                <div className="absolute bottom-6 left-6 text-ivory">
                  <h3 className="font-display text-2xl">{col.name}</h3>
                  <span className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-champagne-light">
                    Explore <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
