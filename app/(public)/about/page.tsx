import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { BrandTrust } from "@/components/home/brand-trust";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Our Story" };

const STATS = [
  { value: "1998", label: "Founded in Mumbai" },
  { value: "50k+", label: "Pieces crafted" },
  { value: "100%", label: "Ethically sourced" },
  { value: "4.9★", label: "Average rating" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Since 1998"
        title="Our Story"
        subtitle="Three generations of master jewellers, one enduring belief: jewellery should be made to be inherited."
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <section className="container-luxe grid items-center gap-12 py-16 md:grid-cols-2">
        <ScrollReveal>
          <img
            src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=80"
            alt="The Shivis Elegance atelier"
            className="rounded-2xl object-cover"
          />
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h2 className="font-display text-4xl text-obsidian">Craft over everything</h2>
          <div className="mt-5 space-y-4 leading-relaxed text-elegant-gray">
            <p>
              Shivis Elegance began at a single bench in Mumbai's Zaveri Bazaar, where our
              founder set diamonds by lamplight. Today, that same obsession with detail
              guides everything we make.
            </p>
            <p>
              Every stone is ethically sourced and independently certified. Every piece
              is hallmarked, hand-finished, and backed by a lifetime warranty. We make
              fewer things, better — jewellery designed to outlive trends and be passed
              down through families.
            </p>
          </div>
          <ButtonLink href="/shop" className="mt-8">
            Explore our work
          </ButtonLink>
        </ScrollReveal>
      </section>

      <section className="border-y border-border bg-cream">
        <div className="container-luxe grid grid-cols-2 gap-8 py-14 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl text-champagne-dark md:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm text-warm-gray">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <BrandTrust />
    </>
  );
}
