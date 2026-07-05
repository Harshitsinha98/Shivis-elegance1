import { PRESS_MENTIONS } from "@/lib/constants";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function PressStrip() {
  return (
    <section className="border-b border-border bg-pearl">
      <ScrollReveal className="container-luxe flex flex-col items-center gap-6 py-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-warm-gray">
          As featured in
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {PRESS_MENTIONS.map((name) => (
            <span
              key={name}
              className="font-display text-xl text-warm-gray/60 grayscale transition hover:text-champagne-dark hover:grayscale-0 md:text-2xl"
            >
              {name}
            </span>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
