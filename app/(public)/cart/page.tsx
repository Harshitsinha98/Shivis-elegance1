"use client";

import { ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { ButtonLink } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

export default function CartPage() {
  const { items, isEmpty } = useCart();

  return (
    <>
      <PageHeader title="Your Bag" crumbs={[{ label: "Home", href: "/" }, { label: "Bag" }]} />

      <div className="container-luxe py-14">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <ShoppingBag size={44} className="text-champagne" />
            <p className="font-display text-3xl text-obsidian">Your bag is empty</p>
            <p className="text-warm-gray">Beautiful things await.</p>
            <ButtonLink href="/shop" size="lg" className="mt-2">
              Shop the collection
            </ButtonLink>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            <div className="divide-y divide-border">
              {items.map((item) => (
                <CartItem key={item.key} item={item} />
              ))}
            </div>
            <div className="lg:sticky lg:top-40 lg:self-start">
              <CartSummary
                action={
                  <ButtonLink href="/checkout" fullWidth size="lg">
                    Proceed to checkout
                  </ButtonLink>
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
