"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertCircle, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createCouponAction,
  deleteCouponAction,
  toggleCouponAction,
  type ActionResult,
} from "@/lib/admin/actions";
import type { Coupon } from "@/types/order";

function couponValue(c: Coupon) {
  return c.type === "percentage" ? `${c.value}%` : formatPrice(c.value);
}

export function CouponsManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createCouponAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-obsidian">Coupons</h1>
          <p className="text-warm-gray">{coupons.length} promotional codes</p>
        </div>
        <Button onClick={() => setOpen((o) => !o)}>
          {open ? <X size={16} /> : <Plus size={16} />} {open ? "Close" : "New coupon"}
        </Button>
      </div>

      {open && (
        <form action={formAction} className="rounded-2xl border border-border bg-pearl p-6">
          <h3 className="mb-4 font-display text-xl text-obsidian">Create coupon</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Code" name="code" placeholder="WELCOME10" required />
            <Select label="Type" name="type" defaultValue="percentage">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₹)</option>
            </Select>
            <Input label="Value" name="value" type="number" step="0.01" placeholder="10" required />
            <Input label="Min. spend (₹, optional)" name="minSubtotal" type="number" step="0.01" />
            <div className="sm:col-span-2 lg:col-span-1">
              <Input label="Description" name="description" placeholder="10% off your first order" />
            </div>
          </div>
          {state && !state.ok && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={16} /> {state.error}
            </div>
          )}
          <div className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create coupon"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-pearl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-warm-gray">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Min. spend</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-warm-gray">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => <CouponRow key={c.code} coupon={c} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CouponRow({ coupon: c }: { coupon: Coupon }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) alert(res.error);
      else router.refresh();
    });

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-beige/40">
      <td className="px-4 py-3 font-mono font-medium text-obsidian">{c.code}</td>
      <td className="px-4 py-3 text-elegant-gray">{c.description}</td>
      <td className="px-4 py-3">{couponValue(c)}</td>
      <td className="px-4 py-3">{c.minSubtotal ? formatPrice(c.minSubtotal) : "—"}</td>
      <td className="px-4 py-3">
        {c.active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => act(() => toggleCouponAction(c.code, !c.active))}
            disabled={pending}
            className="text-xs text-champagne-dark hover:underline disabled:opacity-40"
          >
            {c.active ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete coupon ${c.code}?`)) act(() => deleteCouponAction(c.code));
            }}
            disabled={pending}
            className="text-red-500 hover:text-red-600 disabled:opacity-40"
            aria-label={`Delete ${c.code}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
