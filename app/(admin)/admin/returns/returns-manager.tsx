"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Truck,
  RotateCcw,
  RefreshCw,
  Warehouse,
  IndianRupee,
  ShieldCheck,
  Ban,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReturnStatusBadge } from "@/components/admin/order-status-badge";
import {
  approveReturnAction,
  rejectReturnAction,
  generateReversePickupAction,
  cancelReversePickupAction,
  refreshReturnTrackingAction,
  markWarehouseReceivedAction,
  initiateRefundAction,
  reviewCodRefundAction,
  markCodRefundProcessedAction,
  updateReturnStatusAction,
} from "@/lib/admin/actions";
import { toast } from "@/store/toast-store";
import { formatDate, formatPrice } from "@/lib/utils";
import type { ReturnRequest, ReturnStatus, ReturnTimelineEvent } from "@/types/order";

const FILTERS: { value: ReturnStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "pickup_scheduled", label: "Pickup" },
  { value: "picked_up", label: "In transit" },
  { value: "refund_initiated", label: "Refunding" },
  { value: "refund_completed", label: "Refunded" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const REFUND_TONE: Record<string, "gold" | "dark" | "muted" | "success" | "danger"> = {
  awaiting_details: "muted",
  details_submitted: "gold",
  verification_pending: "gold",
  verified: "dark",
  processing: "gold",
  completed: "success",
  failed: "danger",
  rejected: "danger",
};

const REFUND_LABEL: Record<string, string> = {
  awaiting_details: "Awaiting details",
  details_submitted: "Details submitted",
  verification_pending: "Verification pending",
  verified: "Verified",
  processing: "Refund processing",
  completed: "Refund completed",
  failed: "Refund failed",
  rejected: "Rejected",
};

export function ReturnsManager({ returns }: { returns: ReturnRequest[] }) {
  const [filter, setFilter] = useState<ReturnStatus | "all">("all");
  const filtered = useMemo(
    () => (filter === "all" ? returns : returns.filter((r) => r.status === filter)),
    [returns, filter]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.1em] transition ${
              filter === f.value
                ? "bg-obsidian text-ivory"
                : "bg-beige text-warm-gray hover:bg-champagne/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-pearl py-16 text-center text-warm-gray">
          No return requests{filter !== "all" ? " for this filter" : ""}.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <ReturnCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-warm-gray">{label}</p>
      <p className="text-sm text-obsidian">{value ?? "—"}</p>
    </div>
  );
}

function ReturnCard({ request }: { request: ReturnRequest }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(request.adminNotes ?? "");
  const [refundAmount, setRefundAmount] = useState(
    request.refundAmount != null ? String(request.refundAmount / 100) : ""
  );
  const [codRef, setCodRef] = useState("");
  const [codRemarks, setCodRemarks] = useState(request.financeRemarks ?? "");

  const itemsTotal = request.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const isCod = request.paymentProvider === "cod";
  const timeline = (request.timeline ?? []) as ReturnTimelineEvent[];

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string; data?: any }>) {
    setBusy(label);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) {
        toast.error(res.error ?? "Action failed.");
        return;
      }
      const reverse = res.data?.reverse;
      const refund = res.data?.refund;
      if (reverse?.mock) toast.info("Reverse pickup created (mock — Shiprocket not configured).");
      else if (refund && !refund.ok) toast.info(refund.message ?? "Refund pending.");
      else toast.success(`${label} done.`);
      router.refresh();
    });
  }

  const status = request.status;
  const canApprove = status === "requested";
  const hasReverse = Boolean(request.reverseAwb || request.reverseShipmentId);
  const received = Boolean(request.warehouseReceivedAt);
  const refundDone = request.refundStatus === "completed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-pearl p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-obsidian">{request.orderNumber}</p>
            <Badge tone={isCod ? "gold" : "dark"}>{isCod ? "COD" : "Prepaid"}</Badge>
          </div>
          <p className="text-sm text-warm-gray">
            {request.customerName ?? request.customerEmail ?? "Customer"} · Requested{" "}
            {formatDate(request.createdAt)}
          </p>
          <p className="mt-1 text-sm text-warm-gray">
            <span className="text-obsidian">Reason:</span> {request.reason}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ReturnStatusBadge status={request.status} />
          {request.refundStatus && (
            <Badge tone={REFUND_TONE[request.refundStatus] ?? "muted"}>
              {REFUND_LABEL[request.refundStatus] ?? request.refundStatus}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-6 py-5 lg:grid-cols-[1fr_340px]">
        {/* Left: items + logistics + timeline */}
        <div className="space-y-5">
          <div className="space-y-3">
            {request.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={it.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-obsidian">{it.name}</p>
                  <p className="text-xs text-warm-gray">
                    Qty {it.quantity} · {formatPrice(it.unitPrice)}
                  </p>
                </div>
              </div>
            ))}
            {request.description && (
              <p className="rounded-lg bg-cream px-3 py-2 text-sm text-warm-gray">{request.description}</p>
            )}
            <p className="text-sm text-warm-gray">
              Items value: <span className="text-obsidian">{formatPrice(itemsTotal)}</span>
            </p>
          </div>

          {/* Reverse logistics */}
          {hasReverse && (
            <div className="rounded-xl border border-border bg-ivory p-4">
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-warm-gray">
                <Truck size={14} /> Reverse shipment
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="AWB" value={request.reverseAwb} />
                <Field label="Courier" value={request.reverseCourier} />
                <Field label="Tracking" value={request.reverseTrackingStatus} />
                <Field
                  label="Pickup"
                  value={request.pickupScheduledDate ? formatDate(request.pickupScheduledDate) : undefined}
                />
                <Field
                  label="Warehouse"
                  value={
                    received ? (
                      <span className="text-green-700">
                        Received {formatDate(request.warehouseReceivedAt!)}
                      </span>
                    ) : (
                      "Awaiting"
                    )
                  }
                />
                {request.reverseLabelUrl && (
                  <Field
                    label="Label"
                    value={
                      <a
                        href={request.reverseLabelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-champagne-dark underline"
                      >
                        PDF
                      </a>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="rounded-xl border border-border bg-ivory p-4">
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-warm-gray">
                <Clock size={14} /> Timeline
              </p>
              <ol className="space-y-2">
                {timeline.map((e, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                    <span className="flex-1 text-obsidian">
                      {e.label}
                      {e.note ? <span className="text-warm-gray"> — {e.note}</span> : null}
                    </span>
                    <span className="text-xs text-warm-gray">{e.at ? formatDate(e.at) : ""}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* COD payout details + finance review */}
          {isCod && request.codDetailsSubmitted && (
            <div className="rounded-xl border border-champagne/40 bg-champagne/5 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-warm-gray">
                <ShieldCheck size={14} /> COD refund details ({request.refundMethod?.toUpperCase()})
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Holder" value={request.bankHolderName} />
                {request.refundMethod === "upi" ? (
                  <Field label="UPI" value={request.maskedUpiId} />
                ) : (
                  <>
                    <Field label="Account" value={request.maskedAccountNumber} />
                    <Field label="IFSC" value={request.ifscCode} />
                    <Field label="Bank" value={request.bankName} />
                  </>
                )}
              </div>
              {request.financeRemarks && (
                <p className="mt-2 text-xs text-warm-gray">Note: {request.financeRemarks}</p>
              )}

              {request.refundStatus === "verification_pending" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={codRemarks}
                    onChange={(e) => setCodRemarks(e.target.value)}
                    rows={2}
                    placeholder="Optional remarks…"
                    className="w-full rounded-lg border border-border bg-pearl px-3 py-2 text-sm focus:border-champagne focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run("Verify", () => reviewCodRefundAction(request.id, "verify", codRemarks))
                      }
                    >
                      <Check size={14} /> Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run("Reject", () => reviewCodRefundAction(request.id, "reject", codRemarks))
                      }
                    >
                      <X size={14} /> Reject
                    </Button>
                  </div>
                </div>
              )}

              {(request.refundStatus === "verified" || request.refundStatus === "processing") && (
                <div className="mt-3 space-y-2">
                  <input
                    value={codRef}
                    onChange={(e) => setCodRef(e.target.value)}
                    placeholder="Transaction reference (UTR/UPI ref)"
                    className="w-full rounded-lg border border-border bg-pearl px-3 py-2 text-sm focus:border-champagne focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="dark"
                    disabled={pending || !codRef.trim() || !received}
                    onClick={() =>
                      run("Mark paid", () => markCodRefundProcessedAction(request.id, codRef, codRemarks))
                    }
                  >
                    <IndianRupee size={14} /> Mark refund paid
                  </Button>
                  {!received && (
                    <p className="text-xs text-danger">Mark warehouse received before paying out.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: action rail */}
        <div className="space-y-4 rounded-xl border border-border bg-ivory p-4">
          {canApprove && (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() => run("Approve", () => approveReturnAction(request.id))}
              >
                <Check size={14} /> {busy === "Approve" ? "Approving…" : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run("Reject", () => rejectReturnAction(request.id, notes))}
              >
                <X size={14} /> Reject
              </Button>
            </div>
          )}

          {!canApprove && status !== "rejected" && (
            <div className="grid grid-cols-1 gap-2">
              {!hasReverse && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run("Generate pickup", () => generateReversePickupAction(request.id))}
                >
                  <Truck size={14} /> Generate pickup
                </Button>
              )}
              {hasReverse && !received && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run("Refresh tracking", () => refreshReturnTrackingAction(request.id))}
                  >
                    <RefreshCw size={14} />{" "}
                    {busy === "Refresh tracking" ? "Refreshing…" : "Refresh tracking"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run("Cancel pickup", () => cancelReversePickupAction(request.id))}
                  >
                    <Ban size={14} /> Cancel pickup
                  </Button>
                  <Button
                    size="sm"
                    variant="dark"
                    disabled={pending}
                    onClick={() => run("Warehouse received", () => markWarehouseReceivedAction(request.id))}
                  >
                    <Warehouse size={14} /> Mark warehouse received
                  </Button>
                </>
              )}
              {received && !refundDone && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run("Initiate refund", () => initiateRefundAction(request.id))}
                >
                  <IndianRupee size={14} />{" "}
                  {busy === "Initiate refund" ? "Refunding…" : "Initiate refund"}
                </Button>
              )}
            </div>
          )}

          {(request.refundId || request.refundReference || request.refundError) && (
            <div className="rounded-lg bg-cream px-3 py-2 text-xs text-warm-gray">
              {request.refundId && (
                <p>
                  Refund ID: <span className="text-obsidian">{request.refundId}</span>
                </p>
              )}
              {request.refundReference && (
                <p>
                  Reference: <span className="text-obsidian">{request.refundReference}</span>
                </p>
              )}
              {request.refundError && <p className="text-danger">Error: {request.refundError}</p>}
            </div>
          )}

          <details className="group">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.12em] text-warm-gray">
              Advanced
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-warm-gray">
                  Refund amount (₹)
                </label>
                <input
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={String(itemsTotal / 100)}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-border bg-pearl px-3 py-2 text-sm focus:border-champagne focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-warm-gray">
                  Admin notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-pearl px-3 py-2 text-sm focus:border-champagne focus:outline-none"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                fullWidth
                disabled={pending}
                onClick={() =>
                  run("Save", () =>
                    updateReturnStatusAction(
                      request.id,
                      undefined,
                      notes,
                      refundAmount.trim() ? Math.round(Number(refundAmount) * 100) : undefined
                    )
                  )
                }
              >
                <RotateCcw size={14} /> Save notes & amount
              </Button>
            </div>
          </details>
        </div>
      </div>
    </motion.div>
  );
}
