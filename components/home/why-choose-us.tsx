import { Gem, ShieldCheck, Sparkles, Heart } from "lucide-react";
import { CRAFTSMANSHIP_POINTS } from "@/lib/constants";
import { ScrollReveal, StaggerGroup } from "@/components/shared/scroll-reveal";

const ICONS = [Gem, ShieldCheck, Sparkles, Heart];

export function WhyChooseUs() {
  return (
    <section className="section-padding bg-beige/40">
      <div className="container-luxe grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <ScrollReveal className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=80"
              alt="Artisan hand-setting a diamond"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -right-6 hidden max-w-[220px] rounded-xl border border-champagne/30 bg-pearl p-5 shadow-[var(--shadow-hover)] sm:block">
            <p className="font-display text-3xl text-wine">25+</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-warm-gray">
              Years of craftsmanship
            </p>
          </div>
        </ScrollReveal>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">
            Why Shivis Elegance
          </p>
          <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">
            Made with intention, built to last
          </h2>
          <p className="mt-4 max-w-lg text-warm-gray">
            Every piece passes through the hands of our master artisans before it
            reaches yours — no shortcuts, no mass production.
          </p>

          <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2">
            {CRAFTSMANSHIP_POINTS.map((point, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <ScrollReveal key={point.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-wine/10 text-wine">
                    <Icon size={20} strokeWidth={1.5} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg text-obsidian">{point.title}</h3>
                    <p className="mt-1 text-sm text-warm-gray">{point.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
}
