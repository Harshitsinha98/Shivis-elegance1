import Link from "next/link";
import {
  IndianRupee,
  ShoppingCart,
  Package,
  Star,
  ArrowRight,
  TrendingUp,
  Trophy,
  Receipt,
} from "lucide-react";
import { getAdminStats, listOrders } from "@/lib/db/repo";
import { formatPrice, formatDate } from "@/lib/utils";
import { AnalyticsChart, BarList } from "@/components/admin/analytics-chart";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { StatCard } from "@/components/admin/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, orders] = await Promise.all([getAdminStats(), listOrders()]);
  const recent = orders.slice(0, 6);

  const cards = [
    {
      label: "Revenue (30d)",
      value: formatPrice(stats.revenue30d),
      Icon: IndianRupee,
      trend: `${formatPrice(stats.revenue)} all-time`,
    },
    {
      label: "Orders (30d)",
      value: String(stats.orderCount30d),
      Icon: ShoppingCart,
      trend: `${stats.orderCount} all-time`,
    },
    {
      label: "Products",
      value: String(stats.productCount),
      Icon: Package,
      trend:
        stats.lowStockCount > 0 ? `${stats.lowStockCount} low stock` : "healthy",
    },
    {
      label: "Pending reviews",
      value: String(stats.pendingReviews),
      Icon: Star,
      trend: `${stats.customerCount} customers`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Dashboard</h1>
        <p className="text-warm-gray">Welcome back — here&apos;s how the store is performing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <StatCard key={card.label} index={i} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-pearl p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-champagne-dark" size={18} />
            <h2 className="font-display text-2xl text-obsidian">Revenue</h2>
          </div>
          <p className="text-sm text-warm-gray">Monthly paid revenue, in ₹ thousands</p>
          <div className="mt-4">
            <AnalyticsChart data={stats.monthlyRevenue} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-pearl p-6">
          <div className="flex items-center gap-2">
            <Trophy className="text-champagne-dark" size={18} />
            <h2 className="font-display text-2xl text-obsidian">Top sellers</h2>
          </div>
          <p className="text-sm text-warm-gray">By units sold</p>
          <div className="mt-6">
            {stats.topSellers.length > 0 ? (
              <BarList data={stats.topSellers} />
            ) : (
              <p className="text-sm text-warm-gray">No sales yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-pearl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="text-champagne-dark" size={18} />
            <h2 className="font-display text-2xl text-obsidian">Recent orders</h2>
          </div>
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-champagne-dark hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-6 text-sm text-warm-gray">No orders yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.1em] text-warm-gray">
              <tr className="border-b border-border">
                <th className="py-3">Order</th>
                <th className="py-3">Customer</th>
                <th className="py-3">Date</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-border/60 transition last:border-0 hover:bg-champagne/5"
                >
                  <td className="py-3 font-medium text-obsidian">{o.number}</td>
                  <td className="py-3 text-elegant-gray">
                    <span className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-champagne/15 text-xs font-medium text-champagne-dark">
                        {o.shippingAddress.fullName.charAt(0).toUpperCase()}
                      </span>
                      {o.shippingAddress.fullName}
                    </span>
                  </td>
                  <td className="py-3 text-warm-gray">{formatDate(o.createdAt)}</td>
                  <td className="py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="py-3 text-right text-obsidian">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
