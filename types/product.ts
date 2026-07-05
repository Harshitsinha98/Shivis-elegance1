export type Metal =
  | "yellow-gold"
  | "white-gold"
  | "rose-gold"
  | "platinum"
  | "sterling-silver";

export type Gemstone =
  | "diamond"
  | "emerald"
  | "ruby"
  | "sapphire"
  | "pearl"
  | "none";

export type CategorySlug =
  | "rings"
  | "necklaces"
  | "earrings"
  | "bracelets"
  | "bangles"
  | "pendants";

export interface ProductVariant {
  id: string;
  /** e.g. ring size or chain length */
  label: string;
  value: string;
  /** price delta in the smallest currency unit (paise/cents) */
  priceDelta: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  /** stock-keeping unit — encoded in the product QR label */
  sku?: string;
  name: string;
  /** short one-line tagline */
  tagline: string;
  description: string;
  /** price in the smallest currency unit (paise) */
  price: number;
  compareAtPrice?: number;
  currency: "INR" | "USD";
  category: CategorySlug;
  collectionSlugs: string[];
  metal: Metal;
  gemstone: Gemstone;
  /** metal purity, e.g. "18K" or "925" */
  purity: string;
  /** total weight in grams */
  weightGrams: number;
  images: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  stock: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  tags: string[];
  createdAt: string;
}

export interface Collection {
  slug: string;
  name: string;
  description: string;
  heroImage: string;
  productSlugs: string[];
  featured?: boolean;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  image: string;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
}
