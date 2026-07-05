"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Truck, Loader2, PackageCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { Button } from "@/components/ui/button";

interface RateResult {
  courier: string;
  fee: number; // paise
  estimatedDays: number;
  mock: boolean;
}

const PIN_KEY = "lj_pincode";

/**
 * Pincode → estimated delivery date widget for the product page.
 * Hits POST /api/shipping (Shiprocket serviceability) and turns the returned
 * `estimatedDays` into a friendly delivery date. Remembers the last pincode so
 * a returning shopper sees an estimate straight away.
 */
export function DeliveryEstimator({
  weightGrams,
  productPrice,
}: {
  weightGrams: number;
  productPrice: number;
}) {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<RateResult | null>(null);

  const check = useCallback(
    async (pin: string) => {
      if (!/^\d{6}$/.test(pin)) {
        setError("Enter a valid 6-digit pincode");
        setRate(null);
        return;
      }
      setError(null);
      setLoading(true);
      setRate(null);
      try {
        const res = await fetch("/api/shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pincode: pin,
            weightKg: Math.max(0.1, weightGrams / 1000),
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Delivery lookup failed");
        setRate(json.data as RateResult);
        try {
          localStorage.setItem(PIN_KEY, pin);
        } catch {
          /* storage unavailable — non-fatal */
        }
      } catch (e) {
        setError((e as Error).message || "Could not check delivery");
      } finally {
        setLoading(false);
      }
    },
    [weightGrams]
  );

  // On mount: restore the last pincode and show its estimate immediately.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PIN_KEY);
    } catch {
      /* ignore */
    }
    if (saved && /^\d{6}$/.test(saved)) {
      setPincode(saved);
      check(saved);
    }
  }, [check]);

  const deliveryDate =
    rate &&
    new Date(Date.now() + rate.estimatedDays * 86_400_000).toLocaleDateString(
      "en-IN",
      { weekday: "short", day: "numeric", month: "short" }
    );

  const freeShipping = productPrice >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="rounded-xl border border-border bg-pearl/60 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-obsidian">
        <MapPin size={16} className="text-champagne-dark" />
        Estimate delivery date
      </div>

      <div className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && check(pincode)}
          placeholder="Enter 6-digit pincode"
          className="w-full rounded-lg border border-border bg-pearl px-4 py-2.5 text-sm text-obsidian placeholder:text-warm-gray/70 focus:border-champagne focus:outline-none focus:ring-2 focus:ring-champagne/30"
          aria-label="Destination pincode"
        />
        <Button
          variant="outline"
          onClick={() => check(pincode)}
          disabled={loading}
          className="px-5"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Check"}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {rate && deliveryDate && (
        <div className="mt-4 space-y-1.5 text-sm">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-obsidian">
            <PackageCheck size={16} className="text-green-600" />
            Delivery by <span className="font-semibold">{deliveryDate}</span>
            <span className="text-warm-gray">· ~{rate.estimatedDays} days</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-warm-gray">
            <Truck size={15} className="text-champagne-dark" />
            via {rate.courier} ·{" "}
            {freeShipping ? (
              <span className="text-green-600">Free shipping</span>
            ) : (
              <>{formatPrice(rate.fee, "INR")} shipping</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
