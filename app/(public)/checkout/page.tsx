"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { CartSummary } from "@/components/cart/cart-summary";
import { ButtonLink } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

export default function CheckoutPage() {
  const { isEmpty } = useCart();

  return (
    <div className="container-luxe py-14">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-[0.18em] text-obsidian">
          LUXEJEWELS
        </Link>
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-warm-gray">
          <Lock size={14} /> Secure checkout
        </span>
      </div>

      {isEmpty ? (
        <div className="py-20 text-center">
          <p className="font-display text-3xl text-obsidian">Your bag is empty</p>
          <ButtonLink href="/shop" className="mt-6">
            Shop the collection
          </ButtonLink>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
          <CheckoutForm />
          <div className="lg:sticky lg:top-40 lg:self-start">
            <CartSummary />
          </div>
        </div>
      )}
    </div>
  );
}
