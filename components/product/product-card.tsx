"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice, discountPercent, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/shared/stars";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/hooks/use-cart";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const { addItem, openCart } = useCart();
  const wished = has(product.id);
  const off = discountPercent(product.price, product.compareAtPrice);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, { quantity: 1 });
    openCart();
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="group"
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-beige">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
            loading={index < 4 ? "eager" : "lazy"}
          />
          {product.images[1] && (
            <img
              src={product.images[1]}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              loading="lazy"
            />
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {product.isNew && <Badge tone="dark">New</Badge>}
            {off > 0 && <Badge tone="gold">−{off}%</Badge>}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              toggle(product.id);
            }}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-pearl/90 text-obsidian shadow-sm backdrop-blur transition hover:scale-110"
          >
            <Heart size={16} className={cn(wished && "fill-champagne text-champagne")} />
          </button>

          <button
            onClick={quickAdd}
            className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-2 rounded-full bg-obsidian/95 py-3 text-xs font-medium uppercase tracking-[0.14em] text-ivory opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <ShoppingBag size={15} /> Quick add
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg leading-tight text-obsidian">
              {product.name}
            </h3>
          </div>
          <p className="line-clamp-1 text-sm text-warm-gray">{product.tagline}</p>
          <div className="flex items-center gap-2 pt-1">
            <Stars rating={product.rating} />
            <span className="text-xs text-warm-gray">({product.reviewCount})</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-[15px] font-medium text-obsidian">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-warm-gray line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
