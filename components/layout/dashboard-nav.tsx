"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, Heart, MapPin, RotateCcw, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const LINKS = [
  { href: "/dashboard", label: "Overview", Icon: LayoutGrid },
  { href: "/dashboard/orders", label: "Orders", Icon: Package },
  { href: "/dashboard/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/dashboard/addresses", label: "Addresses", Icon: MapPin },
  { href: "/dashboard/returns", label: "Returns", Icon: RotateCcw },
  { href: "/dashboard/terms", label: "Preferences", Icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  return (
    <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm transition",
              active
                ? "bg-obsidian text-ivory"
                : "text-elegant-gray hover:bg-beige"
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm text-warm-gray transition hover:bg-beige"
      >
        <LogOut size={17} /> Sign out
      </button>
    </nav>
  );
}
