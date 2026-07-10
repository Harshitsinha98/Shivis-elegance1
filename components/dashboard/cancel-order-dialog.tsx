"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";
import type { OrderStatus } from "@/types/order";

/** Statuses from which a customer may still cancel (mirrors the backend rule). */
const CANCELLABLE: OrderStatus[] = ["pending", "confirmed", "processing"];

export function CancelOrderDialog({
  number,
  status,
}: {
  number: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!CANCELLABLE.includes(status)) return null;

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(number)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Could not cancel this order.");
        return;
      }
      toast.success("Your order has been cancelled.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <XCircle size={14} /> Cancel order
      </Button>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} title="Cancel this order?">
        <p className="text-sm text-warm-gray">
          Are you sure you want to cancel order <strong className="text-obsidian">{number}</strong>?
          If you&apos;ve already paid, a refund will be initiated to your original payment method.
          This can&apos;t be undone.
        </p>

        <label className="mt-5 block text-xs uppercase tracking-[0.12em] text-warm-gray">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Tell us why you're cancelling…"
          className="mt-1.5 w-full rounded-lg border border-border bg-ivory px-3 py-2.5 text-sm focus:border-champagne focus:outline-none"
        />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => setOpen(false)}>
            Keep order
          </Button>
          <Button variant="dark" size="sm" disabled={loading} onClick={submit}>
            {loading ? "Cancelling…" : "Yes, cancel order"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
