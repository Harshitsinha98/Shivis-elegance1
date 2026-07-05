"use client";

import { useMemo } from "react";
import { useCartStore } from "@/store/cart-store";
import { useUiStore } from "@/store/ui-store";
import { computeTotals } from "@/lib/pricing";

/** Convenience hook exposing cart state + derived totals + drawer controls. */
export function useCart() {
  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const clear = useCartStore((s) => s.clear);
  const openCart = useUiStore((s) => s.openCart);

  const totals = useMemo(
    () => computeTotals(items.map((i) => ({ price: i.price, quantity: i.quantity })), couponCode),
    [items, couponCode]
  );

  const count = items.reduce((n, i) => n + i.quantity, 0);

  return {
    items,
    count,
    couponCode,
    totals,
    isEmpty: items.length === 0,
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    clear,
    openCart,
  };
}
