"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Ticket,
  Boxes,
  Star,
  ScanLine,
  ArrowLeft,
} from "lucide-react";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", Icon: Package },
  { href: "/admin/orders", label: "Orders", Icon: ShoppingCart },
  { href: "/admin/inventory", label: "Inventory", Icon: Boxes },
  { href: "/admin/scan", label: "Quick stock", Icon: ScanLine },
  { href: "/admin/customer", label: "Customers", Icon: Users },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/admin/coupons", label: "Coupons", Icon: Ticket },
  { href: "/admin/reviews", label: "Reviews", Icon: Star },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-elegant-gray/30 bg-obsidian text-ivory lg:h-screen lg:w-64 lg:border-b-0 lg:border-r print:hidden">
      <div className="border-b border-elegant-gray/30 px-6 py-6">
        <Link href="/admin" className="font-display text-2xl tracking-[0.16em]">
          {SITE.name.toUpperCase()}
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-champagne-light">Admin Studio</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-4 lg:flex-1 lg:flex-col lg:overflow-visible">
        {LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition",
                active ? "bg-champagne text-pearl" : "text-ivory/70 hover:bg-elegant-gray/40 hover:text-ivory"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-elegant-gray/30 p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-ivory/70 transition hover:bg-elegant-gray/40 hover:text-ivory"
        >
          <ArrowLeft size={17} /> Back to store
        </Link>
      </div>
    </aside>
  );
}
