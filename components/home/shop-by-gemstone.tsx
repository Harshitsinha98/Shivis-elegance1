import Link from "next/link";
import { ScrollReveal, StaggerGroup } from "@/components/shared/scroll-reveal";

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;

const STONES = [
  { label: "Diamond", href: "/shop?gemstone=diamond", image: IMG("photo-1605100804763-247f67b3557e") },
  { label: "Emerald", href: "/shop?gemstone=emerald", image: IMG("photo-1535632066927-ab7c9ab60908") },
  { label: "Ruby", href: "/shop?gemstone=ruby", image: IMG("photo-1602751584552-8ba73aad10e1") },
  { label: "Sapphire", href: "/shop?gemstone=sapphire", image: IMG("photo-1611652022419-a9419f74343d") },
  { label: "Pearl", href: "/shop?gemstone=pearl", image: IMG("photo-1599643478518-a784e5dc4c8f") },
  { label: "Gold", href: "/shop?metal=yellow-gold", image: IMG("photo-1515562141207-7a88fb7ce338") },
];

export function ShopByGemstone() {
  return (
    <section className="bg-cream">
      <div className="container-luxe section-padding">
        <ScrollReveal className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">Pick your sparkle</p>
          <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">Shop by gemstone</h2>
        </ScrollReveal>

        <StaggerGroup className="grid grid-cols-3 gap-4 md:grid-cols-6">
          {STONES.map((s) => (
            <ScrollReveal key={s.label}>
              <Link href={s.href} className="group block text-center">
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full ring-1 ring-champagne/15 transition group-hover:ring-champagne/40">
                  <img
                    src={s.image}
                    alt={s.label}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-obsidian/10 transition group-hover:bg-obsidian/0" />
                </div>
                <span className="mt-3 block text-sm font-medium text-elegant-gray transition group-hover:text-champagne-dark">
                  {s.label}
                </span>
              </Link>
            </ScrollReveal>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
