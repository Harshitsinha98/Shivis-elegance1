"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Diamond,
  Gem,
  Droplets,
  Watch,
  CircleDashed,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { MEGA_MENU } from "@/lib/constants";
import type { CategorySlug } from "@/types/product";

interface CategoryItem {
  label: string;
  href: string;
  Icon: LucideIcon;
  slug?: CategorySlug;
}

/** Top-level jewellery categories with icons, à la Tanishq's category bar. */
const CATEGORIES: CategoryItem[] = [
  { label: "All Jewellery", href: "/shop", Icon: Sparkles },
  { label: "Rings", href: "/shop?category=rings", Icon: Diamond, slug: "rings" },
  { label: "Necklaces", href: "/shop?category=necklaces", Icon: Gem, slug: "necklaces" },
  { label: "Earrings", href: "/shop?category=earrings", Icon: Droplets, slug: "earrings" },
  { label: "Bracelets", href: "/shop?category=bracelets", Icon: Watch, slug: "bracelets" },
  { label: "Bangles", href: "/shop?category=bangles", Icon: CircleDashed, slug: "bangles" },
  { label: "Pendants", href: "/shop?category=pendants", Icon: Heart, slug: "pendants" },
  { label: "Collections", href: "/collections", Icon: Sparkles },
];

export function CategoryNav() {
  const [hovered, setHovered] = useState<CategorySlug | null>(null);
  const active = MEGA_MENU.find((m) => m.slug === hovered);

  return (
    <div
      className="relative hidden border-t border-border/60 bg-ivory md:block"
      onMouseLeave={() => setHovered(null)}
    >
      <ul className="container-luxe flex items-center justify-between gap-1 overflow-x-auto py-2.5 lg:gap-2">
        {CATEGORIES.map(({ label, href, Icon, slug }) => (
          <li key={label} onMouseEnter={() => setHovered(slug ?? null)}>
            <Link
              href={href}
              className="group flex flex-col items-center gap-1.5 rounded-2xl px-2.5 py-1.5 transition lg:px-4"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-full bg-blush text-champagne ring-1 ring-champagne/10 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-champagne group-hover:text-pearl group-hover:shadow-[0_8px_18px_-6px_var(--color-champagne)] ${
                  slug && hovered === slug ? "-translate-y-0.5 bg-champagne text-pearl shadow-[0_8px_18px_-6px_var(--color-champagne)]" : ""
                }`}
              >
                <Icon size={20} strokeWidth={1.6} />
              </span>
              <span
                className={`text-[11px] font-medium tracking-wide text-elegant-gray transition group-hover:text-champagne-dark ${
                  slug && hovered === slug ? "text-champagne-dark" : ""
                }`}
              >
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-full border-t border-border/60 bg-ivory shadow-[var(--shadow-card)]"
          >
            <div className="container-luxe grid grid-cols-2 gap-6 py-6 sm:grid-cols-4 lg:gap-10 lg:py-8">
              {active.columns.map((col) => (
                <div key={col.title}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-champagne-dark">
                    {col.title}
                  </p>
                  <ul className="space-y-2.5">
                    {col.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="text-sm text-elegant-gray transition hover:text-champagne-dark"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <Link
                href={active.promo.href}
                className="group relative overflow-hidden rounded-2xl"
              >
                <img
                  src={active.promo.image}
                  alt={active.promo.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-obsidian/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-ivory">
                  <p className="font-display text-lg">{active.promo.title}</p>
                  <p className="mt-1 text-xs text-ivory/80">{active.promo.description}</p>
                  <span className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-champagne-light">
                    Shop Now →
                  </span>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
