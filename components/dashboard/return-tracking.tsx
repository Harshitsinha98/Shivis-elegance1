"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, ExternalLink, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";
import { formatDate, formatPrice } from "@/lib/utils";
import type { ReturnRequest, ReturnTimelineEvent } from "@/types/order";

function Cell({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-warm-gray">{label}</p>
      <p className="text-sm text-obsidian">{value ?? "—"}</p>
    </div>
  );
}

/** Customer-facing reverse-shipment tracking + refund status for one return. */
export function ReturnTracking({ request }: { request: ReturnRequest }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const timeline = (request.timeline ?? []) as ReturnTimelineEvent[];
  const externalUrl =
    request.reverseTrackingUrl && /^https?:\/\//.test(request.reverseTrackingUrl)
      ? request.reverseTrackingUrl
      : null;
  const received = Boolean(request.warehouseReceivedAt);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/returns/${request.id}/tracking`, { cache: "no-store" });
      if (res.ok) {
        toast.success("Tracking refreshed.");
        router.refresh();
      } else {
        toast.error("Could not refresh tracking.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setRefreshing(false);
    }
  }

  const hasReverse = Boolean(request.reverseAwb || request.reverseShipmentId);

  return (
    <div className="mt-4 space-y-4">
      {hasReverse && (
        <div className="rounded-xl border border-border bg-ivory p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-warm-gray">
              <Truck size={14} /> Return shipment
            </p>
            {request.reverseTrackingStatus && (
              <span className="rounded-full bg-champagne/15 px-3 py-1 text-xs text-champagne-dark">
                {request.reverseTrackingStatus}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Cell label="Courier" value={request.reverseCourier} />
            <Cell label="AWB / Tracking" value={request.reverseAwb} />
            <Cell
              label="Pickup"
              value={request.pickupScheduledDate ? formatDate(request.pickupScheduledDate) : "To be scheduled"}
            />
            <Cell
              label="Est. delivery"
              value={request.estimatedDeliveryAt ? formatDate(request.estimatedDeliveryAt) : undefined}
            />
            <Cell
              label="Warehouse"
              value={
                received ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <CheckCircle2 size={13} /> Received
                  </span>
                ) : (
                  "In transit"
                )
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {externalUrl ? (
              <a href={externalUrl} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <ExternalLink size={14} /> Track return shipment
                </Button>
              </a>
            ) : (
              <Button size="sm" disabled={refreshing} onClick={refresh}>
                <RefreshCw size={14} /> {refreshing ? "Refreshing…" : "Track return shipment"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Refund status */}
      {request.refundStatus && (
        <div className="rounded-xl border border-border bg-ivory p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-warm-gray">Refund</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Cell label="Status" value={request.refundStatus.replace(/_/g, " ")} />
            {request.refundAmount != null && (
              <Cell label="Amount" value={formatPrice(request.refundAmount)} />
            )}
            {(request.refundReference || request.refundId) && (
              <Cell label="Reference" value={request.refundReference ?? request.refundId} />
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="rounded-xl border border-border bg-ivory p-4">
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-warm-gray">
            <Clock size={14} /> Progress
          </p>
          <ol className="space-y-2">
            {timeline.map((e, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                <span className="flex-1 text-obsidian">{e.label}</span>
                <span className="text-xs text-warm-gray">{e.at ? formatDate(e.at) : ""}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
