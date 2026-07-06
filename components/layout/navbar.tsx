"use client";

import Link from "next/link";
import { Search, Heart, ShoppingBag, Menu } from "lucide-react";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useScroll } from "@/hooks/use-scroll";
import { useUiStore } from "@/store/ui-store";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { AccountMenu } from "./account-menu";
import { CategoryNav } from "./category-nav";

export function Navbar() {
  const { scrolled } = useScroll(20);
  const { openCart, openMobileNav } = useUiStore();
  const { count } = useCart();
  const wishlist = useWishlist();

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-ivory/90 shadow-[var(--shadow-card)] backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-champagne-dark via-champagne to-champagne-dark text-center text-[11px] uppercase tracking-[0.24em] text-pearl">
        <div className="container-luxe flex items-center justify-center gap-2 py-2">
          <span className="hidden sm:inline text-champagne-light">✦</span>
          Complimentary insured shipping on all orders over ₹5,000
          <span className="hidden sm:inline text-champagne-light">✦</span>
        </div>
      </div>

      <nav className="container-luxe flex items-center gap-2 py-3 sm:gap-4 sm:py-4 lg:gap-8">
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <button
            onClick={openMobileNav}
            className="md:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Link
            href="/"
            className="whitespace-nowrap font-display text-base tracking-[0.08em] text-champagne transition-colors hover:text-champagne-dark sm:text-xl sm:tracking-[0.18em] lg:text-2xl"
          >
            {SITE.name.toUpperCase()}
          </Link>

          <button
            onClick={useUiStore.getState().openSearch}
            aria-label="Search"
            className="hidden w-56 items-center gap-2 rounded-full border border-border/70 bg-pearl/60 px-4 py-2 text-left text-xs text-warm-gray/70 transition hover:border-champagne/60 md:flex lg:w-64"
          >
            <Search size={16} className="shrink-0 text-warm-gray/60" />
            <span className="truncate">Search rings, necklaces…</span>
          </button>
        </div>

        <button
          onClick={useUiStore.getState().openSearch}
          className="ml-auto text-obsidian transition hover:text-champagne-dark md:hidden"
          aria-label="Search"
        >
          <Search size={19} />
        </button>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-3 sm:gap-4">
          <div className="hidden sm:block">
            <AccountMenu />
          </div>
          <Link
            href="/dashboard/wishlist"
            aria-label="Wishlist"
            className="relative text-obsidian transition hover:text-champagne-dark"
          >
            <Heart size={19} />
            {wishlist.count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-champagne text-[9px] text-pearl">
                {wishlist.count}
              </span>
            )}
          </Link>
          <button
            onClick={openCart}
            aria-label="Cart"
            className="relative text-obsidian transition hover:text-champagne-dark"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-champagne text-[9px] text-pearl">
                {count}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Category bar */}
      <CategoryNav />
    </header>
  );
}
