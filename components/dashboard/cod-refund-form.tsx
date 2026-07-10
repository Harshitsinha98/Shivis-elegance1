"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";
import { isValidUpi, isValidIfsc, isValidAccountNumber } from "@/lib/security/validate-bank";

/**
 * COD refund payout collection. Client-side validation mirrors the server for
 * UX only — the server re-validates and encrypts. Account numbers are never
 * pre-filled and are entered twice to prevent typos.
 */
export function CodRefundForm({
  returnId,
  rejected,
}: {
  returnId: string;
  rejected?: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [loading, setLoading] = useState(false);

  const [holderName, setHolderName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!holderName.trim()) return "Account holder name is required.";
    if (method === "upi") {
      if (!isValidUpi(upiId)) return "Enter a valid UPI ID (e.g. name@bank).";
      return null;
    }
    if (!isValidAccountNumber(accountNumber)) return "Enter a valid account number (9–18 digits).";
    if (accountNumber.replace(/\s/g, "") !== confirmAccountNumber.replace(/\s/g, ""))
      return "Account numbers do not match.";
    if (!isValidIfsc(ifsc)) return "Enter a valid IFSC code (e.g. HDFC0001234).";
    return null;
  }

  async function submit() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setLoading(true);
    const body =
      method === "upi"
        ? { method, holderName, upiId }
        : { method, holderName, accountNumber, confirmAccountNumber, ifsc, bankName };
    try {
      const res = await fetch(`/api/returns/${returnId}/cod-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Could not save your details.");
        return;
      }
      toast.success("Refund details submitted for verification.");
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-pearl px-3 py-2.5 text-sm focus:border-champagne focus:outline-none";

  return (
    <div className="rounded-xl border border-champagne/40 bg-champagne/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-obsidian">
        <ShieldCheck size={16} className="text-champagne-dark" />
        {rejected ? "Please re-enter your refund details" : "Add your refund details"}
      </p>
      <p className="mt-1 text-xs text-warm-gray">
        This was a Cash-on-Delivery order, so we need where to send your refund. Your details are
        encrypted and only used for this payout.
      </p>

      {/* Method toggle */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMethod("upi")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
            method === "upi"
              ? "border-champagne bg-champagne/10 text-obsidian"
              : "border-border text-warm-gray"
          }`}
        >
          <Smartphone size={15} /> UPI
        </button>
        <button
          type="button"
          onClick={() => setMethod("bank")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
            method === "bank"
              ? "border-champagne bg-champagne/10 text-obsidian"
              : "border-border text-warm-gray"
          }`}
        >
          <Landmark size={15} /> Bank account
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <input
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="Account holder name"
          className={inputCls}
        />
        {method === "upi" ? (
          <input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@bank"
            autoComplete="off"
            className={inputCls}
          />
        ) : (
          <>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Account number"
              inputMode="numeric"
              autoComplete="off"
              className={inputCls}
            />
            <input
              value={confirmAccountNumber}
              onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Confirm account number"
              inputMode="numeric"
              autoComplete="off"
              className={inputCls}
            />
            <input
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              placeholder="IFSC code"
              autoComplete="off"
              className={inputCls}
            />
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bank name (optional)"
              className={inputCls}
            />
          </>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <Button size="sm" fullWidth disabled={loading} onClick={submit}>
          {loading ? "Submitting…" : "Submit refund details"}
        </Button>
      </div>
    </div>
  );
}
