import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/auth";
import { ordersForUser } from "@/lib/db/repo";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  OrderStatusBadge,
  ReturnStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderTimeline } from "@/components/admin/prder-timeline";
import { CancelOrderDialog } from "@/components/dashboard/cancel-order-dialog";

export const metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const orders = user ? await ordersForUser(user.id, user.email) : [];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-obsidian">Order history</h2>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-border bg-pearl p-10 text-center">
          <p className="text-warm-gray">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block text-sm text-champagne-dark hover:underline"
          >
            Start shopping
          </Link>
        </div>
      )}

      {orders.map((order) => (
        <div key={order.id} className="rounded-2xl border border-border bg-pearl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="font-medium text-obsidian">{order.number}</p>
              <p className="text-sm text-warm-gray">Placed {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-4">
              <OrderStatusBadge status={order.status} />
              <span className="font-medium text-obsidian">{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="grid gap-8 py-5 md:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4">
                  <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="font-display text-lg text-obsidian hover:text-champagne-dark"
                    >
                      {item.name}
                    </Link>
                    {item.variantLabel && (
                      <p className="text-xs text-warm-gray">{item.variantLabel}</p>
                    )}
                    <p className="text-sm text-warm-gray">
                      Qty {item.quantity} · {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
              {(order.awb || order.trackingNumber) && (
                <div className="rounded-lg border border-border bg-ivory px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-warm-gray">
                      Courier:{" "}
                      <span className="text-obsidian">{order.courier ?? "In transit"}</span>
                    </span>
                    <span className="text-warm-gray">
                      AWB / Tracking:{" "}
                      <span className="font-mono text-obsidian">
                        {order.awb ?? order.trackingNumber}
                      </span>
                    </span>
                  </div>
                  <Link
                    href={`/track/${order.awb ?? order.trackingNumber}`}
                    className="mt-1 inline-block text-champagne-dark hover:underline"
                  >
                    Track shipment →
                  </Link>
                </div>
              )}
            </div>

            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.14em] text-warm-gray">Status</p>
              <OrderTimeline events={order.timeline} />
            </div>
          </div>

          {/* Actions + return status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {order.returnRequest && (
                <>
                  <span className="text-xs uppercase tracking-[0.12em] text-warm-gray">
                    Return
                  </span>
                  <ReturnStatusBadge status={order.returnRequest.status} />
                </>
              )}
              {order.status === "cancelled" && order.cancelReason && (
                <span className="text-sm text-warm-gray">Reason: {order.cancelReason}</span>
              )}
            </div>
            <CancelOrderDialog number={order.number} status={order.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
