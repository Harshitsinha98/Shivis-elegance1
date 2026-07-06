"use client";

import Link from "next/link";
import {
  Diamond,
  Gem,
  Droplets,
  Watch,
  CircleDashed,
  Heart as HeartIcon,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { useUiStore } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";

const MOBILE_CATEGORIES = [
  { label: "Rings", href: "/shop?category=rings", Icon: Diamond },
  { label: "Necklaces", href: "/shop?category=necklaces", Icon: Gem },
  { label: "Earrings", href: "/shop?category=earrings", Icon: Droplets },
  { label: "Bracelets", href: "/shop?category=bracelets", Icon: Watch },
  { label: "Bangles", href: "/shop?category=bangles", Icon: CircleDashed },
  { label: "Pendants", href: "/shop?category=pendants", Icon: HeartIcon },
];

export function MobileNav() {
  const { mobileNavOpen, closeMobileNav } = useUiStore();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Drawer open={mobileNavOpen} onClose={closeMobileNav} side="left" title={SITE.name}>
      <nav className="flex flex-col p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-champagne-dark">
          Shop by Category
        </p>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {MOBILE_CATEGORIES.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={closeMobileNav}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-blush/60 px-2 py-3 text-center transition hover:bg-blush"
            >
              <Icon size={20} strokeWidth={1.6} className="text-champagne" />
              <span className="text-[11px] font-medium text-elegant-gray">{label}</span>
            </Link>
          ))}
        </div>
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={closeMobileNav}
            className="border-b border-border py-4 font-display text-2xl text-obsidian transition hover:text-champagne-dark"
          >
            {l.label}
          </Link>
        ))}
        <div className="mt-6 space-y-3 text-sm text-warm-gray">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" onClick={closeMobileNav} className="block hover:text-obsidian">
                My Account
              </Link>
              <Link href="/dashboard/orders" onClick={closeMobileNav} className="block hover:text-obsidian">
                My Orders
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin" onClick={closeMobileNav} className="block text-champagne-dark hover:text-obsidian">
                  Admin Studio
                </Link>
              )}
              <button
                onClick={() => { closeMobileNav(); logout(); }}
                className="block hover:text-obsidian"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth/sign-in" onClick={closeMobileNav} className="block hover:text-obsidian">
              Sign in / Register
            </Link>
          )}
          <Link href="/contact" onClick={closeMobileNav} className="block hover:text-obsidian">
            Contact Concierge
          </Link>
        </div>
      </nav>
    </Drawer>
  );
}
