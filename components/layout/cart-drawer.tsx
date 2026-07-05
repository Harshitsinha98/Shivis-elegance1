"use client";

import Link from "next/link";
import { ShoppingBag, X, Minus, Plus } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { useUiStore } from "@/store/ui-store";
import { useCart } from "@/hooks/use-cart";

export function CartDrawer() {
  const { cartOpen, closeCart } = useUiStore();
  const { items, totals, isEmpty, updateQuantity, removeItem } = useCart();

  const progress = Math.min(100, (totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Drawer open={cartOpen} onClose={closeCart} title="Your Bag">
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
          <ShoppingBag size={40} className="text-champagne" />
          <p className="font-display text-2xl text-obsidian">Your bag is empty</p>
          <p className="text-sm text-warm-gray">
            Discover pieces made to be treasured.
          </p>
          <ButtonLink href="/shop" onClick={closeCart}>
            Shop the collection
          </ButtonLink>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          {/* Free shipping progress */}
          <div className="border-b border-border px-6 py-4">
            {totals.freeShippingRemaining > 0 ? (
              <p className="text-xs text-warm-gray">
                Add{" "}
                <span className="font-medium text-obsidian">
                  {formatPrice(totals.freeShippingRemaining)}
                </span>{" "}
                more for free insured shipping
              </p>
            ) : (
              <p className="text-xs font-medium text-champagne-dark">
                You've unlocked free insured shipping ✦
              </p>
            )}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-beige">
              <div className="h-full bg-champagne transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
            {items.map((item) => (
              <li key={item.key} className="flex gap-4 py-5">
                <Link
                  href={`/products/${item.slug}`}
                  onClick={closeCart}
                  className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-beige"
                >
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-display text-lg leading-tight text-obsidian">
                        {item.name}
                      </p>
                      {item.variantLabel && (
                        <p className="text-xs text-warm-gray">{item.variantLabel}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      aria-label="Remove"
                      className="text-warm-gray hover:text-obsidian"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-border">
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="grid h-8 w-8 place-items-center text-warm-gray hover:text-obsidian"
                        aria-label="Decrease"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="grid h-8 w-8 place-items-center text-warm-gray hover:text-obsidian"
                        aria-label="Increase"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-obsidian">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-4 border-t border-border p-6">
            <div className="flex justify-between text-sm text-warm-gray">
              <span>Subtotal</span>
              <span className="font-medium text-obsidian">{formatPrice(totals.subtotal)}</span>
            </div>
            <p className="text-xs text-warm-gray">
              Shipping & taxes calculated at checkout.
            </p>
            <ButtonLink href="/checkout" fullWidth size="lg" onClick={closeCart}>
              Checkout
            </ButtonLink>
            <Button variant="ghost" fullWidth onClick={closeCart}>
              Continue shopping
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
