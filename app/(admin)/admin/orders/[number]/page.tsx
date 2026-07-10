import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrderByNumber } from "@/lib/db/repo";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ReturnStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderTimeline } from "@/components/admin/prder-timeline";
import { OrderActions } from "./order-actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order) notFound();

  const a = order.shippingAddress;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="mb-2 inline-flex items-center gap-1 text-sm text-warm-gray hover:text-obsidian">
          <ArrowLeft size={14} /> Back to orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-obsidian">{order.number}</h1>
            <p className="text-warm-gray">Placed {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <PaymentStatusBadge status={order.paymentStatus} />
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <div className="rounded-2xl border border-border bg-pearl p-6">
            <h3 className="mb-4 font-display text-xl text-obsidian">Items</h3>
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-medium text-obsidian">{item.name}</p>
                    {item.variantLabel && <p className="text-xs text-warm-gray">{item.variantLabel}</p>}
                    <p className="text-sm text-warm-gray">Qty {item.quantity} · {formatPrice(item.unitPrice)}</p>
                  </div>
                  <p className="font-medium text-obsidian">{formatPrice(item.unitPrice * item.quantity)}</p>
                </div>
              ))}
            </div>

            <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal)} />
              <Row label="Shipping" value={formatPrice(order.shipping)} />
              {order.discount > 0 && <Row label="Discount" value={`− ${formatPrice(order.discount)}`} />}
              {order.tax > 0 && <Row label="Tax" value={formatPrice(order.tax)} />}
              <div className="flex justify-between border-t border-border pt-2 text-base font-medium text-obsidian">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </div>

          {/* Shipping address */}
          <div className="rounded-2xl border border-border bg-pearl p-6">
            <h3 className="mb-3 font-display text-xl text-obsidian">Shipping address</h3>
            <div className="text-sm leading-relaxed text-elegant-gray">
              <p className="font-medium text-obsidian">{a.fullName}</p>
              <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
              <p>{a.city}, {a.state} {a.postalCode}</p>
              <p>{a.country}</p>
              {a.phone && <p className="mt-1">📞 {a.phone}</p>}
            </div>
          </div>

          {/* Cancellation reason */}
          {order.status === "cancelled" && order.cancelReason && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h3 className="mb-1 font-display text-xl text-obsidian">Cancellation</h3>
              <p className="text-sm text-warm-gray">
                <span className="text-obsidian">Reason:</span> {order.cancelReason}
              </p>
            </div>
          )}

          {/* Return request summary */}
          {order.returnRequest && (
            <div className="rounded-2xl border border-border bg-pearl p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-xl text-obsidian">Return request</h3>
                <ReturnStatusBadge status={order.returnRequest.status} />
              </div>
              <p className="text-sm text-warm-gray">
                <span className="text-obsidian">Reason:</span> {order.returnRequest.reason}
              </p>
              {order.returnRequest.description && (
                <p className="mt-1 text-sm text-warm-gray">{order.returnRequest.description}</p>
              )}
              <div className="mt-3 space-y-2">
                {order.returnRequest.items.map((it, i) => (
                  <p key={i} className="text-sm text-elegant-gray">
                    {it.name} × {it.quantity}
                  </p>
                ))}
              </div>
              <Link
                href="/admin/returns"
                className="mt-3 inline-block text-sm text-champagne-dark hover:underline"
              >
                Manage in Returns →
              </Link>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-pearl p-6">
            <h3 className="mb-4 font-display text-xl text-obsidian">Progress</h3>
            <OrderTimeline events={order.timeline} />
          </div>
        </div>

        <OrderActions order={order} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-warm-gray">
      <dt>{label}</dt>
      <dd className="text-elegant-gray">{value}</dd>
    </div>
  );
}
