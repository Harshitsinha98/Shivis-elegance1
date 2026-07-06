"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, Printer, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateAwbAction,
  updateOrderStatusAction,
} from "@/lib/admin/actions";
import type { Order, OrderStatus } from "@/types/order";

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }>
  ) => {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong");
      else {
        const shiprocketCancel = res.data?.shiprocketCancel as
          | { ok: boolean; message?: string }
          | undefined;
        if (shiprocketCancel) {
          setInfo(
            shiprocketCancel.ok
              ? shiprocketCancel.message ?? "Cancelled on Shiprocket"
              : `Order cancelled locally. ${shiprocketCancel.message ?? "Could not cancel on Shiprocket — cancel it there manually."}`
          );
        }
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-pearl p-6">
      <h3 className="font-display text-xl text-obsidian">Fulfilment</h3>

      {/* AWB */}
      <div className="rounded-xl border border-border bg-ivory p-4">
        {order.awb ? (
          <>
            <p className="text-xs uppercase tracking-[0.12em] text-warm-gray">AWB assigned</p>
            <p className="mt-1 font-mono text-lg text-obsidian">{order.awb}</p>
            {order.courier && <p className="text-sm text-warm-gray">{order.courier}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {order.labelUrl ? (
                <a href={order.labelUrl} target="_blank" rel="noreferrer">
                  <Button type="button" size="sm">
                    <FileText size={14} /> Download courier label
                  </Button>
                </a>
              ) : null}
              <a href={`/admin/orders/${order.number}/label`} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" size="sm">
                  <Printer size={14} /> Print shipping slip
                </Button>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => run(() => generateAwbAction(order.number, true))}
              >
                <RefreshCw size={14} /> Regenerate
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-warm-gray">No AWB yet. Generate one to create the shipping label &amp; tracking.</p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              disabled={pending}
              onClick={() => run(() => generateAwbAction(order.number))}
            >
              <Truck size={14} /> Generate AWB
            </Button>
          </>
        )}
      </div>

      {/* Status */}
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-warm-gray">Order status</label>
        <select
          value={order.status}
          disabled={pending}
          onChange={(e) => run(() => updateOrderStatusAction(order.number, e.target.value as OrderStatus))}
          className="w-full rounded-lg border border-border bg-ivory px-3 py-2.5 text-sm capitalize focus:border-champagne focus:outline-none disabled:opacity-50"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Manual tracking override */}
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-warm-gray">Tracking number (override)</label>
        <div className="flex gap-2">
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Courier tracking no."
            className="flex-1 rounded-lg border border-border bg-ivory px-3 py-2.5 text-sm focus:border-champagne focus:outline-none"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || !tracking.trim()}
            onClick={() => run(() => updateOrderStatusAction(order.number, order.status, tracking.trim()))}
          >
            Save
          </Button>
        </div>
      </div>

      {info && (
        <div className="flex items-center gap-2 rounded-lg border border-champagne/30 bg-blush/40 p-3 text-sm text-obsidian">
          <AlertCircle size={16} /> {info}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}
    </div>
  );
}
