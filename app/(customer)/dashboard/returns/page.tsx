import { RotateCcw, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { ordersForUser, returnRequestsForUser } from "@/lib/db/repo";
import { formatDate, formatPrice } from "@/lib/utils";
import { RETURN_WINDOW_DAYS } from "@/lib/constants";
import { ReturnStatusBadge } from "@/components/admin/order-status-badge";
import { ReturnRequestDialog } from "@/components/dashboard/return-request-dialog";
import { ReturnTracking } from "@/components/dashboard/return-tracking";
import { CodRefundForm } from "@/components/dashboard/cod-refund-form";

export const metadata = { title: "Returns" };
export const dynamic = "force-dynamic";

/** True when a delivered order is still inside the return window. */
function withinWindow(deliveredIso?: string): boolean {
  if (!deliveredIso) return false;
  const deadline = new Date(deliveredIso).getTime() + RETURN_WINDOW_DAYS * 864e5;
  return Date.now() <= deadline;
}

export default async function ReturnsPage() {
  const user = await getCurrentUser();
  const [orders, requests] = user
    ? await Promise.all([
        ordersForUser(user.id, user.email),
        returnRequestsForUser(user.id, user.email),
      ])
    : [[], []];

  // Delivered orders with no active return and still inside the window.
  const eligible = orders.filter(
    (o) =>
      o.status === "delivered" &&
      withinWindow(o.deliveredAt) &&
      (!o.returnRequest || o.returnRequest.status === "rejected")
  );

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-obsidian">Returns &amp; exchanges</h2>

      <div className="flex items-start gap-4 rounded-2xl bg-cream p-6">
        <ShieldCheck className="mt-1 shrink-0 text-champagne-dark" size={22} />
        <div>
          <p className="font-medium text-obsidian">
            {RETURN_WINDOW_DAYS}-day, fully insured returns
          </p>
          <p className="mt-1 text-sm text-warm-gray">
            Unworn pieces in original packaging can be returned within {RETURN_WINDOW_DAYS} days of
            delivery. Engraved and bespoke items are final sale.
          </p>
        </div>
      </div>

      {/* Existing return requests */}
      {requests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-[0.14em] text-warm-gray">Your return requests</h3>
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-pearl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <p className="font-medium text-obsidian">{r.orderNumber}</p>
                  <p className="text-sm text-warm-gray">
                    Requested {formatDate(r.createdAt)} · {r.reason}
                  </p>
                </div>
                <ReturnStatusBadge status={r.status} />
              </div>
              <div className="space-y-3 pt-4">
                {r.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-obsidian">{item.name}</p>
                      <p className="text-xs text-warm-gray">
                        Qty {item.quantity} · {formatPrice(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {r.adminNotes && (
                <p className="mt-3 rounded-lg bg-cream px-3 py-2 text-sm text-warm-gray">
                  <span className="font-medium text-obsidian">Note from our team:</span> {r.adminNotes}
                </p>
              )}

              {/* COD refund details collection — shown when we still need them. */}
              {r.paymentProvider === "cod" &&
                r.status !== "rejected" &&
                (r.refundStatus === "awaiting_details" || !r.codDetailsSubmitted) && (
                  <div className="mt-4">
                    <CodRefundForm
                      returnId={r.id}
                      rejected={Boolean(r.financeRemarks) && r.refundStatus === "awaiting_details"}
                    />
                  </div>
                )}

              {/* Reverse-shipment tracking + refund status. */}
              <ReturnTracking request={r} />
            </div>
          ))}
        </div>
      )}

      {/* Eligible orders */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.14em] text-warm-gray">Eligible for return</h3>
        {eligible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-pearl py-16 text-center">
            <RotateCcw size={36} className="mx-auto text-champagne" />
            <p className="mt-4 font-display text-xl text-obsidian">No eligible items</p>
            <p className="mt-1 text-sm text-warm-gray">
              Delivered orders will appear here while they&apos;re within the {RETURN_WINDOW_DAYS}-day
              return window.
            </p>
          </div>
        ) : (
          eligible.map((order) => (
            <div key={order.id} className="rounded-2xl border border-border bg-pearl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <p className="font-medium text-obsidian">{order.number}</p>
                  <p className="text-sm text-warm-gray">
                    Delivered {order.deliveredAt ? formatDate(order.deliveredAt) : "—"}
                  </p>
                </div>
                <ReturnRequestDialog order={order} />
              </div>
              <div className="space-y-3 pt-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <img src={item.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="font-medium text-obsidian">{item.name}</p>
                      <p className="text-sm text-warm-gray">
                        Qty {item.quantity} · {formatPrice(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
