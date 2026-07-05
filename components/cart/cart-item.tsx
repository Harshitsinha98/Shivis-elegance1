"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CartLineItem } from "@/store/cart-store";
import { useCart } from "@/hooks/use-cart";

export function CartItem({ item }: { item: CartLineItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-5 py-6">
      <Link
        href={`/products/${item.slug}`}
        className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-beige"
      >
        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex justify-between gap-4">
          <div>
            <Link
              href={`/products/${item.slug}`}
              className="font-display text-xl text-obsidian hover:text-champagne-dark"
            >
              {item.name}
            </Link>
            {item.variantLabel && (
              <p className="mt-0.5 text-sm text-warm-gray">{item.variantLabel}</p>
            )}
          </div>
          <p className="font-medium text-obsidian">{formatPrice(item.price * item.quantity)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center rounded-full border border-border">
            <button
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              className="grid h-9 w-9 place-items-center text-warm-gray hover:text-obsidian"
              aria-label="Decrease"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              className="grid h-9 w-9 place-items-center text-warm-gray hover:text-obsidian"
              aria-label="Increase"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={() => removeItem(item.key)}
            className="flex items-center gap-1 text-xs text-warm-gray hover:text-obsidian"
          >
            <X size={14} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}
