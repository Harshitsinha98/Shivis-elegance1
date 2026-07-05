"use client";

import { useWishlistStore } from "@/store/wishlist-store";
import { PRODUCTS } from "@/lib/mock-data";

export function useWishlist() {
  const ids = useWishlistStore((s) => s.ids);
  const toggle = useWishlistStore((s) => s.toggle);
  const clear = useWishlistStore((s) => s.clear);

  const items = PRODUCTS.filter((p) => ids.includes(p.id));

  return {
    ids,
    items,
    count: ids.length,
    has: (id: string) => ids.includes(id),
    toggle,
    clear,
  };
}
