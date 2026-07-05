import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/product";

export interface CartLineItem {
  key: string; // productId + variant
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number; // unit price in paise
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  maxStock: number;
}

interface CartState {
  items: CartLineItem[];
  couponCode: string | null;
  addItem: (
    product: Product,
    opts?: { variantId?: string; variantLabel?: string; quantity?: number }
  ) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  applyCoupon: (code: string | null) => void;
  clear: () => void;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,

      addItem: (product, opts = {}) => {
        const variantId = opts.variantId;
        const key = variantId ? `${product.id}:${variantId}` : product.id;
        const qty = opts.quantity ?? 1;

        set((state) => {
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key
                  ? { ...i, quantity: Math.min(i.maxStock, i.quantity + qty) }
                  : i
              ),
            };
          }
          const line: CartLineItem = {
            key,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.images[0],
            price: product.price,
            quantity: qty,
            variantId,
            variantLabel: opts.variantLabel,
            maxStock: product.stock,
          };
          return { items: [...state.items, line] };
        });
      },

      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      updateQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.key === key
                ? { ...i, quantity: Math.max(0, Math.min(i.maxStock, quantity)) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),

      applyCoupon: (code) => set({ couponCode: code }),

      clear: () => set({ items: [], couponCode: null }),

      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
    }),
    { name: "luxejewels-cart" }
  )
);
