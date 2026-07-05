import { Award, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { TRUST_BADGES } from "@/lib/constants";
import { ScrollReveal, StaggerGroup } from "@/components/shared/scroll-reveal";

const ICONS = [Award, ShieldCheck, Truck, RotateCcw];

export function BrandTrust() {
  return (
    <section className="border-y border-border bg-beige/40">
      <StaggerGroup className="container-luxe grid grid-cols-2 gap-8 py-14 md:grid-cols-4">
        {TRUST_BADGES.map((badge, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <ScrollReveal key={badge.title} className="text-center">
              <Icon size={28} className="mx-auto text-champagne-dark" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg text-obsidian">{badge.title}</h3>
              <p className="mt-1 text-sm text-warm-gray">{badge.desc}</p>
            </ScrollReveal>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
