"use client";

import { useState } from "react";
import { Heart, Check, Truck, ShieldCheck, RotateCcw, Minus, Plus } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice, discountPercent } from "@/lib/utils";
import { METALS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/shared/stars";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { DeliveryEstimator } from "@/components/product/delivery-estimator";

export function ProductDetails({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();
  const { has, toggle } = useWishlist();
  const wished = has(product.id);

  const [variant, setVariant] = useState(product.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const off = discountPercent(product.price, product.compareAtPrice);
  const metalLabel = METALS.find((m) => m.value === product.metal)?.label ?? product.metal;
  const selectedVariant = product.variants.find((v) => v.id === variant);

  const handleAdd = () => {
    addItem(product, {
      quantity: qty,
      variantId: variant || undefined,
      variantLabel: selectedVariant
        ? `${selectedVariant.label} ${selectedVariant.value}`
        : undefined,
    });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="muted">{metalLabel}</Badge>
          {product.gemstone !== "none" && (
            <Badge tone="gold">{product.gemstone}</Badge>
          )}
          {product.isBestSeller && <Badge tone="dark">Best Seller</Badge>}
        </div>
        <h1 className="mt-3 font-display text-4xl leading-tight text-obsidian md:text-5xl">
          {product.name}
        </h1>
        <p className="mt-2 text-warm-gray">{product.tagline}</p>
        <div className="mt-3 flex items-center gap-3">
          <Stars rating={product.rating} showValue />
          <span className="text-sm text-warm-gray">{product.reviewCount} reviews</span>
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-medium text-obsidian">
          {formatPrice(product.price, product.currency)}
        </span>
        {product.compareAtPrice && (
          <>
            <span className="text-lg text-warm-gray line-through">
              {formatPrice(product.compareAtPrice, product.currency)}
            </span>
            <Badge tone="gold">Save {off}%</Badge>
          </>
        )}
      </div>

      <p className="leading-relaxed text-elegant-gray">{product.description}</p>

      {product.variants.length > 0 && (
        <div>
          <span className="text-xs uppercase tracking-[0.14em] text-warm-gray">
            {product.variants[0].label}
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariant(v.id)}
                disabled={v.stock === 0}
                className={`min-w-12 rounded-lg border px-4 py-2 text-sm transition disabled:opacity-40 ${
                  variant === v.id
                    ? "border-champagne bg-champagne/10 text-obsidian"
                    : "border-border text-warm-gray hover:border-champagne/50"
                }`}
              >
                {v.value}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-full border border-border">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-11 w-11 place-items-center text-warm-gray hover:text-obsidian"
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center text-sm">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="grid h-11 w-11 place-items-center text-warm-gray hover:text-obsidian"
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>
        <span className="text-xs text-warm-gray">
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </span>
      </div>

      <div className="flex gap-3">
        <Button size="lg" fullWidth onClick={handleAdd} disabled={product.stock === 0}>
          {added ? (
            <>
              <Check size={16} /> Added to bag
            </>
          ) : (
            "Add to bag"
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => toggle(product.id)}
          aria-label="Toggle wishlist"
          className="px-5"
        >
          <Heart size={18} className={wished ? "fill-champagne text-champagne" : ""} />
        </Button>
      </div>

      <DeliveryEstimator
        weightGrams={product.weightGrams}
        productPrice={product.price}
      />

      <dl className="grid grid-cols-2 gap-4 rounded-xl bg-beige/60 p-5 text-sm">
        <div>
          <dt className="text-warm-gray">Metal</dt>
          <dd className="text-obsidian">{metalLabel} · {product.purity}</dd>
        </div>
        <div>
          <dt className="text-warm-gray">Weight</dt>
          <dd className="text-obsidian">{product.weightGrams} g</dd>
        </div>
        <div>
          <dt className="text-warm-gray">Gemstone</dt>
          <dd className="capitalize text-obsidian">{product.gemstone}</dd>
        </div>
        <div>
          <dt className="text-warm-gray">SKU</dt>
          <dd className="uppercase text-obsidian">{product.id}-{product.category}</dd>
        </div>
      </dl>

      <ul className="space-y-3 pt-2 text-sm text-elegant-gray">
        <li className="flex items-center gap-3">
          <Truck size={18} className="text-champagne-dark" /> Free insured shipping over ₹5,000
        </li>
        <li className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-champagne-dark" /> BIS hallmarked · GIA certified · Lifetime warranty
        </li>
        <li className="flex items-center gap-3">
          <RotateCcw size={18} className="text-champagne-dark" /> 30-day easy returns
        </li>
      </ul>
    </div>
  );
}
