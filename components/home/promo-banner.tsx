import { ButtonLink } from "@/components/ui/button";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { COUPONS } from "@/lib/mock-data";

export function PromoBanner() {
  const coupon = COUPONS.find((c) => c.code === "BRIDAL15" && c.active);
  const discount = coupon ? `${coupon.value}%` : "15%";

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=2000&q=80"
          alt=""
          className="h-full w-full scale-105 object-cover"
        />
        <div className="absolute inset-0 bg-obsidian/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent" />
      </div>

      <div className="container-luxe relative py-28 text-center text-ivory">
        <ScrollReveal>
          <span className="inline-block rounded-full border border-champagne-light/40 px-4 py-1 text-xs uppercase tracking-[0.3em] text-champagne-light">
            The Bridal Event
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-4xl leading-tight md:text-6xl">
            Up to {discount} off engagement & bridal
          </h2>
          <p className="mx-auto mt-4 max-w-md text-ivory/80">
            {coupon?.description ?? "For a limited time on all bridal pieces."}{" "}
            Complimentary resizing and engraving included. Use code{" "}
            <span className="font-medium text-champagne-light">{coupon?.code ?? "BRIDAL15"}</span>.
          </p>
          <ButtonLink href="/collections/bridal" size="lg" className="mt-8">
            Shop bridal
          </ButtonLink>
        </ScrollReveal>
      </div>
    </section>
  );
}
