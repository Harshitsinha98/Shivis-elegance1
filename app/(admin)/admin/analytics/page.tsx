import { getAdminStats } from "@/lib/db/repo";
import { formatPrice } from "@/lib/utils";
import { AnalyticsChart, BarList } from "@/components/admin/analytics-chart";

export const metadata = { title: "Analytics · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const stats = await getAdminStats();

  const kpis = [
    { label: "All-time revenue", value: formatPrice(stats.revenue) },
    { label: "Revenue (30d)", value: formatPrice(stats.revenue30d) },
    { label: "Orders (30d)", value: String(stats.orderCount30d) },
    { label: "Customers", value: String(stats.customerCount) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Analytics</h1>
        <p className="text-warm-gray">Store performance at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-pearl p-5">
            <p className="font-display text-3xl text-obsidian">{k.value}</p>
            <p className="text-sm text-warm-gray">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-pearl p-6">
          <h2 className="font-display text-2xl text-obsidian">Revenue</h2>
          <p className="text-sm text-warm-gray">Monthly, ₹ thousands</p>
          <div className="mt-4"><AnalyticsChart data={stats.monthlyRevenue} /></div>
        </div>
        <div className="rounded-2xl border border-border bg-pearl p-6">
          <h2 className="font-display text-2xl text-obsidian">Orders</h2>
          <p className="text-sm text-warm-gray">Weekly count, last 8 weeks</p>
          <div className="mt-4"><AnalyticsChart data={stats.weeklyOrders} color="#A07840" /></div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-pearl p-6">
          <h2 className="font-display text-2xl text-obsidian">Catalogue by category</h2>
          <div className="mt-6"><BarList data={stats.categoryBreakdown} /></div>
        </div>
        <div className="rounded-2xl border border-border bg-pearl p-6">
          <h2 className="font-display text-2xl text-obsidian">Top sellers</h2>
          <p className="text-sm text-warm-gray">By units sold</p>
          <div className="mt-6">
            {stats.topSellers.length > 0 ? (
              <BarList color="#A07840" data={stats.topSellers} />
            ) : (
              <p className="text-sm text-warm-gray">No sales yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
