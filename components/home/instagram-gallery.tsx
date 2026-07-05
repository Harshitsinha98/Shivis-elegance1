import { Instagram } from "lucide-react";
import { SOCIAL_GALLERY } from "@/lib/mock-data";
import { SITE } from "@/lib/constants";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function InstagramGallery() {
  return (
    <section className="section-padding">
      <ScrollReveal className="container-luxe mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">@shiviselegance</p>
        <h2 className="mt-3 font-display text-4xl text-obsidian md:text-5xl">
          As worn by you
        </h2>
        <p className="mt-2 text-sm text-warm-gray">
          Tag us for a chance to be featured
        </p>
      </ScrollReveal>

      <div className="grid grid-cols-3 gap-1 md:grid-cols-6">
        {SOCIAL_GALLERY.map((post) => (
          <a
            key={post.id}
            href={SITE.social.instagram}
            className="group relative aspect-square overflow-hidden"
            aria-label={`${post.handle} on Instagram`}
          >
            <img
              src={post.image}
              alt={post.handle}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-obsidian/40 opacity-0 transition group-hover:opacity-100">
              <Instagram size={22} className="text-ivory" />
              <span className="text-xs font-medium text-ivory">{post.handle}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
