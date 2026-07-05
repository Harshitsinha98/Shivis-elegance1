"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { useUiStore } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";

export function MobileNav() {
  const { mobileNavOpen, closeMobileNav } = useUiStore();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Drawer open={mobileNavOpen} onClose={closeMobileNav} side="left" title={SITE.name}>
      <nav className="flex flex-col p-6">
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
