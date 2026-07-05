"use client";

import { Heart } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { useWishlist } from "@/hooks/use-wishlist";

export default function WishlistPage() {
  const { items, count } = useWishlist();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-obsidian">
          Wishlist {count > 0 && <span className="text-warm-gray">({count})</span>}
        </h2>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-pearl py-20 text-center">
          <Heart size={40} className="text-champagne" />
          <p className="font-display text-2xl text-obsidian">Your wishlist is empty</p>
          <p className="text-sm text-warm-gray">Tap the heart on any piece to save it here.</p>
          <ButtonLink href="/shop" className="mt-2">Discover pieces</ButtonLink>
        </div>
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
