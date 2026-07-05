import { RotateCcw, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { ordersForUser } from "@/lib/db/repo";
import { formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Returns" };
export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const user = await getCurrentUser();
  const orders = user ? await ordersForUser(user.id, user.email) : [];
  const returnable = orders.filter((o) => o.status === "delivered");

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-obsidian">Returns & exchanges</h2>

      <div className="flex items-start gap-4 rounded-2xl bg-cream p-6">
        <ShieldCheck className="mt-1 shrink-0 text-champagne-dark" size={22} />
        <div>
          <p className="font-medium text-obsidian">30-day, fully insured returns</p>
          <p className="mt-1 text-sm text-warm-gray">
            Unworn pieces in original packaging can be returned within 30 days of delivery.
            Engraved and bespoke items are final sale.
          </p>
        </div>
      </div>

      {returnable.length === 0 ? (
        <div className="rounded-2xl border border-border bg-pearl py-16 text-center">
          <RotateCcw size={36} className="mx-auto text-champagne" />
          <p className="mt-4 font-display text-xl text-obsidian">No eligible items</p>
          <p className="mt-1 text-sm text-warm-gray">
            Delivered orders will appear here when they're eligible for return.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {returnable.map((order) => (
            <div key={order.id} className="rounded-2xl border border-border bg-pearl p-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <p className="font-medium text-obsidian">{order.number}</p>
                <p className="text-sm text-warm-gray">Delivered {formatDate(order.createdAt)}</p>
              </div>
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 pt-4">
                  <img src={item.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-medium text-obsidian">{item.name}</p>
                    <p className="text-sm text-warm-gray">{formatPrice(item.unitPrice)}</p>
                  </div>
                  <Button variant="outline" size="sm">Request return</Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
