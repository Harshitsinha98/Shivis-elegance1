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
      <div className="bg-obsidian text-center text-[11px] uppercase tracking-[0.2em] text-ivory">
        <div className="container-luxe py-2">
          Complimentary insured shipping on all orders over ₹5,000
        </div>
      </div>

      <nav className="container-luxe flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3 lg:flex-1">
          <button
            onClick={openMobileNav}
            className="lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <button
            onClick={useUiStore.getState().openSearch}
            className="hidden text-obsidian transition hover:text-champagne-dark lg:block"
            aria-label="Search"
          >
            <Search size={19} />
          </button>
        </div>

        <Link
          href="/"
          className="font-display text-2xl tracking-[0.18em] text-obsidian lg:text-3xl"
        >
          {SITE.name.toUpperCase()}
        </Link>

        <div className="flex items-center justify-end gap-4 lg:flex-1">
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
              <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-champagne text-[9px] text-obsidian">
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
              <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-champagne text-[9px] text-obsidian">
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
