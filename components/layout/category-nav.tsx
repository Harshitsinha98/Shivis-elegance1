import Link from "next/link";
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

interface CategoryItem {
  label: string;
  href: string;
  Icon: LucideIcon;
}

/** Top-level jewellery categories with icons, à la Tanishq's category bar. */
const CATEGORIES: CategoryItem[] = [
  { label: "All Jewellery", href: "/shop", Icon: Sparkles },
  { label: "Rings", href: "/shop?category=rings", Icon: Diamond },
  { label: "Necklaces", href: "/shop?category=necklaces", Icon: Gem },
  { label: "Earrings", href: "/shop?category=earrings", Icon: Droplets },
  { label: "Bracelets", href: "/shop?category=bracelets", Icon: Watch },
  { label: "Bangles", href: "/shop?category=bangles", Icon: CircleDashed },
  { label: "Pendants", href: "/shop?category=pendants", Icon: Heart },
  { label: "Collections", href: "/collections", Icon: Sparkles },
];

export function CategoryNav() {
  return (
    <div className="hidden border-t border-border/60 lg:block">
      <ul className="container-luxe flex items-center justify-center gap-2 py-2.5">
        {CATEGORIES.map(({ label, href, Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="group flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 transition hover:bg-blush"
            >
              <Icon
                size={22}
                strokeWidth={1.5}
                className="text-elegant-gray transition group-hover:text-wine"
              />
              <span className="text-xs font-medium tracking-wide text-elegant-gray transition group-hover:text-wine">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
