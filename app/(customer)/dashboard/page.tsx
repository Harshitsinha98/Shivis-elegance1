import Link from "next/link";
import { Package, Heart, MapPin, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { ordersForUser } from "@/lib/db/repo";
import { formatPrice, formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";

export const metadata = { title: "My Account" };
export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  const orders = user ? await ordersForUser(user.id, user.email) : [];
  const recent = orders[0];

  const tiles = [
    { href: "/dashboard/orders", label: "Orders", value: orders.length, Icon: Package },
    { href: "/dashboard/wishlist", label: "Wishlist items", value: "—", Icon: Heart },
    { href: "/dashboard/addresses", label: "Saved addresses", value: user?.addresses.length ?? 0, Icon: MapPin },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map(({ href, label, value, Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-border bg-pearl p-6 transition hover:shadow-[var(--shadow-card)]"
          >
            <Icon className="text-champagne-dark" size={22} />
            <p className="mt-4 font-display text-3xl text-obsidian">{value}</p>
            <p className="text-sm text-warm-gray">{label}</p>
          </Link>
        ))}
      </div>

      {recent && (
        <div className="rounded-2xl border border-border bg-pearl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-obsidian">Recent order</h2>
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-1 text-sm text-champagne-dark hover:underline"
            >
              All orders <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={recent.items[0].image}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div>
                <p className="font-medium text-obsidian">{recent.number}</p>
                <p className="text-sm text-warm-gray">
                  {recent.items.length} item · {formatDate(recent.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <OrderStatusBadge status={recent.status} />
              <span className="font-medium text-obsidian">{formatPrice(recent.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
