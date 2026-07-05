"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  History,
  LocateFixed,
  Heart,
  MessageSquareText,
  LogOut,
  Sparkles,
  ChevronRight,
  Gift,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ITEMS = [
  { href: "/dashboard/orders", label: "Order History", Icon: History },
  { href: "/dashboard/orders", label: "Track Order", Icon: LocateFixed },
  { href: "/dashboard/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/contact", label: "Contact Us", Icon: MessageSquareText },
];

/** Navbar account button with a Tanishq-style dropdown menu. */
export function AccountMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const firstName = user?.name?.trim().split(" ")[0] || "Guest";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        aria-expanded={open}
        className="flex text-obsidian transition hover:text-wine"
      >
        <User size={19} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+14px)] z-50 w-72 origin-top-right overflow-hidden rounded-2xl border border-border bg-pearl shadow-[var(--shadow-hover)]">
          {/* User / greeting card */}
          <div className="p-3">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-wine to-wine-light p-4 text-pearl">
              <Sparkles className="absolute right-3 top-3 text-pearl/40" size={16} />
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-pearl/40 bg-pearl/15">
                  <User size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-xl leading-tight">
                    {isAuthenticated ? firstName : "Welcome"}
                  </p>
                  <p className="text-xs text-pearl/70">
                    {isAuthenticated ? "Shivis Elegance member" : "Sign in for privileges"}
                  </p>
                </div>
              </div>

              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="mt-3 flex items-center gap-2 rounded-full bg-pearl/15 px-3 py-2 text-xs backdrop-blur-sm transition hover:bg-pearl/25"
                >
                  <Gift size={13} /> View rewards &amp; profile
                  <ChevronRight size={13} className="ml-auto" />
                </Link>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="mt-3 flex items-center justify-center gap-2 rounded-full bg-pearl px-3 py-2 text-xs font-medium text-wine transition hover:bg-blush"
                >
                  Login / Signup
                </Link>
              )}
            </div>
          </div>

          {/* Menu items */}
          <nav className="px-2 pb-2">
            {ITEMS.map(({ href, label, Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-elegant-gray transition hover:bg-blush hover:text-obsidian"
              >
                <Icon size={17} className="text-wine" />
                {label}
              </Link>
            ))}

            {isAuthenticated && (
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-elegant-gray transition hover:bg-blush hover:text-obsidian"
              >
                <LogOut size={17} className="text-wine" />
                Log Out
              </button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
