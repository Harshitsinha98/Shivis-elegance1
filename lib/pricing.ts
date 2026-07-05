import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_FEE, TAX_RATE } from "./constants";
import { COUPONS } from "./mock-data";
import type { Coupon } from "@/types/order";

export interface CartLine {
  price: number; // unit price in paise
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  freeShippingRemaining: number;
}

export function findCoupon(code?: string | null): Coupon | undefined {
  if (!code) return undefined;
  return COUPONS.find(
    (c) => c.active && c.code.toLowerCase() === code.trim().toLowerCase()
  );
}

export function computeTotals(lines: CartLine[], couponCode?: string | null): CartTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const coupon = findCoupon(couponCode);
  let discount = 0;
  if (coupon && (!coupon.minSubtotal || subtotal >= coupon.minSubtotal)) {
    discount =
      coupon.type === "percentage"
        ? Math.round((subtotal * coupon.value) / 100)
        : Math.min(coupon.value, subtotal);
  }

  const taxable = Math.max(0, subtotal - discount);
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  const tax = Math.round(taxable * TAX_RATE);
  const total = taxable + shipping + tax;

  return {
    subtotal,
    shipping,
    discount,
    tax,
    total,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
  };
}
