"use client";

import { useState } from "react";
import { Tag, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { findCoupon } from "@/lib/pricing";

export function CartSummary({
  action,
}: {
  action?: React.ReactNode;
}) {
  const { totals, couponCode, applyCoupon } = useCart();
  const [code, setCode] = useState(couponCode ?? "");
  const [error, setError] = useState("");

  const apply = () => {
    const coupon = findCoupon(code);
    if (!coupon) {
      setError("Invalid or expired code");
      return;
    }
    if (coupon.minSubtotal && totals.subtotal < coupon.minSubtotal) {
      setError(`Minimum subtotal ${formatPrice(coupon.minSubtotal)} required`);
      return;
    }
    setError("");
    applyCoupon(coupon.code);
  };

  return (
    <div className="rounded-2xl border border-border bg-pearl p-6">
      <h3 className="font-display text-2xl text-obsidian">Order summary</h3>

      <div className="mt-5 space-y-3 text-sm">
        <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
        {totals.discount > 0 && (
          <Row label={`Discount (${couponCode})`} value={`− ${formatPrice(totals.discount)}`} accent />
        )}
        <Row
          label="Shipping"
          value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
        />
        <Row label="GST (3%)" value={formatPrice(totals.tax)} />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {couponCode && totals.discount > 0 ? (
          <p className="flex items-center gap-2 text-sm text-champagne-dark">
            <Check size={16} /> Coupon <b>{couponCode}</b> applied
          </p>
        ) : (
          <div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray"
                />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Promo code"
                  className="w-full rounded-lg border border-border bg-ivory py-2.5 pl-9 pr-3 text-sm uppercase focus:border-champagne focus:outline-none"
                />
              </div>
              <Button variant="outline" size="sm" onClick={apply}>
                Apply
              </Button>
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            <p className="mt-2 text-xs text-warm-gray">Try WELCOME10 or LUXE500</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
        <span className="font-display text-xl text-obsidian">Total</span>
        <span className="font-display text-2xl text-obsidian">{formatPrice(totals.total)}</span>
      </div>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-warm-gray">{label}</span>
      <span className={accent ? "text-champagne-dark" : "text-obsidian"}>{value}</span>
    </div>
  );
}
