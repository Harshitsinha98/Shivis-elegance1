/**
 * Data-access layer. Every read/write goes through here.
 *
 * When Postgres is configured (DATABASE_URL set + client generated) these
 * functions hit Prisma. Otherwise they transparently fall back to the static
 * catalogue in `lib/mock-data.ts`, so the app still renders with zero setup.
 * Mappers convert Prisma rows into the plain `types/*` shapes the UI expects.
 */
import { prisma, isDbEnabled } from "./prisma";
import { createShipment, cancelShiprocketOrder } from "@/lib/shipping/shiprocket";
import * as mock from "@/lib/mock-data";
import type {
  Product,
  Collection,
  Category,
  Review,
  CategorySlug,
  Metal,
  Gemstone,
} from "@/types/product";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderTimelineEvent,
  PaymentStatus,
  PaymentProvider,
  Coupon,
} from "@/types/order";
import type { User, Address } from "@/types/user";
import type { ProductQuery, Paginated } from "@/types/api";

// ───────────────────────────── helpers ─────────────────────────────

const db = () => prisma!; // only call inside `if (isDbEnabled())`

const PRODUCT_INCLUDE = {
  category: true,
  collections: true,
  variants: true,
} as const;

function mapProduct(p: any): Product {
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku ?? undefined,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? undefined,
    currency: (p.currency as "INR" | "USD") ?? "INR",
    category: (p.category?.slug ?? p.categoryId) as CategorySlug,
    collectionSlugs: (p.collections ?? []).map((c: any) => c.slug),
    metal: p.metal as Metal,
    gemstone: p.gemstone as Gemstone,
    purity: p.purity,
    weightGrams: p.weightGrams,
    images: (p.images ?? []) as string[],
    variants: (p.variants ?? []).map((v: any) => ({
      id: v.id,
      label: v.label,
      value: v.value,
      priceDelta: v.priceDelta,
      stock: v.stock,
    })),
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    tags: (p.tags ?? []) as string[],
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

function mapCollection(c: any): Collection {
  return {
    slug: c.slug,
    name: c.name,
    description: c.description,
    heroImage: c.heroImage ?? "",
    productSlugs: (c.products ?? []).map((p: any) => p.slug),
    featured: c.featured,
  };
}

function mapReview(r: any): Review & { approved?: boolean } {
  return {
    id: r.id,
    productId: r.productId,
    author: r.author,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    verified: r.verified,
    approved: r.approved,
  };
}

const STATUS_TO_DB: Record<OrderStatus, string> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  processing: "PROCESSING",
  shipped: "SHIPPED",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  returned: "RETURNED",
};
const STATUS_FROM_DB: Record<string, OrderStatus> = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([k, v]) => [v, k as OrderStatus])
) as Record<string, OrderStatus>;

const PAY_TO_DB: Record<PaymentStatus, string> = {
  unpaid: "UNPAID",
  paid: "PAID",
  refunded: "REFUNDED",
  failed: "FAILED",
};
const PAY_FROM_DB: Record<string, PaymentStatus> = Object.fromEntries(
  Object.entries(PAY_TO_DB).map(([k, v]) => [v, k as PaymentStatus])
) as Record<string, PaymentStatus>;

const STATUS_RANK: OrderStatus[] = [
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

/** Derive a display timeline from an order's status + timestamps. */
export function buildTimeline(
  status: OrderStatus,
  createdAt: string,
  updatedAt: string,
  trackingNumber?: string
): OrderTimelineEvent[] {
  if (status === "cancelled" || status === "returned") {
    return [
      { status: "confirmed", label: "Order confirmed", at: createdAt, done: true },
      {
        status,
        label: status === "cancelled" ? "Order cancelled" : "Order returned",
        at: updatedAt,
        done: true,
      },
    ];
  }
  const current = status === "pending" ? -1 : STATUS_RANK.indexOf(status);
  const labels: Record<string, string> = {
    confirmed: "Order confirmed",
    processing: "Being crafted & packed",
    shipped: trackingNumber ? `Shipped · ${trackingNumber}` : "Shipped",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
  };
  return STATUS_RANK.map((s, i) => ({
    status: s,
    label: labels[s],
    at: i === 0 ? createdAt : i <= current ? updatedAt : "",
    done: i <= current,
  }));
}

function mapOrder(o: any): Order {
  const createdAt =
    o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt;
  const updatedAt =
    o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt;
  const status = STATUS_FROM_DB[o.status] ?? "pending";
  return {
    id: o.id,
    number: o.number,
    items: (o.items ?? []).map(
      (it: any): OrderItem => ({
        productId: it.productId ?? "",
        slug: it.slug,
        name: it.name,
        image: it.image,
        variantLabel: it.variantLabel ?? undefined,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })
    ),
    subtotal: o.subtotal,
    shipping: o.shipping,
    discount: o.discount,
    tax: o.tax,
    total: o.total,
    currency: (o.currency as "INR" | "USD") ?? "INR",
    status,
    paymentStatus: PAY_FROM_DB[o.paymentStatus] ?? "unpaid",
    paymentProvider: o.paymentProvider as PaymentProvider,
    shippingAddress: o.shippingAddress as Address,
    trackingNumber: o.trackingNumber ?? o.awb ?? undefined,
    awb: o.awb ?? undefined,
    courier: o.courier ?? undefined,
    shipmentId: o.shipmentId ?? undefined,
    labelUrl: o.labelUrl ?? undefined,
    shippedAt:
      o.shippedAt instanceof Date ? o.shippedAt.toISOString() : o.shippedAt ?? undefined,
    timeline: buildTimeline(status, createdAt, updatedAt, o.awb ?? o.trackingNumber),
    createdAt,
  };
}

function mapCoupon(c: any): Coupon {
  return {
    code: c.code,
    description: c.description,
    type: c.type as "percentage" | "fixed",
    value: c.value,
    minSubtotal: c.minSubtotal ?? undefined,
    active: c.active,
    expiresAt:
      c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt ?? undefined,
  };
}

function mapUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role === "ADMIN" ? "admin" : "customer") as User["role"],
    avatarUrl: u.avatarUrl ?? undefined,
    phone: u.phone ?? undefined,
    addresses: (u.addresses ?? []).map(mapAddress),
    createdAt:
      u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}

function mapAddress(a: any): Address {
  return {
    id: a.id,
    label: a.label,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    isDefault: a.isDefault,
  };
}

// ──────────────────────────── products ────────────────────────────

export async function listProducts(
  q: ProductQuery = {}
): Promise<Paginated<Product>> {
  if (!isDbEnabled()) return mock.queryProducts(q);

  const where: any = {};
  if (q.category) where.category = { slug: q.category };
  if (q.collection) where.collections = { some: { slug: q.collection } };
  if (q.metal) where.metal = q.metal;
  if (q.gemstone) where.gemstone = q.gemstone;
  if (typeof q.minPrice === "number") where.price = { ...where.price, gte: q.minPrice };
  if (typeof q.maxPrice === "number") where.price = { ...where.price, lte: q.maxPrice };
  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: "insensitive" } },
      { tagline: { contains: q.q, mode: "insensitive" } },
      { tags: { has: q.q.toLowerCase() } },
    ];
  }

  const orderBy: any =
    q.sort === "newest"
      ? { createdAt: "desc" }
      : q.sort === "price-asc"
        ? { price: "asc" }
        : q.sort === "price-desc"
          ? { price: "desc" }
          : q.sort === "rating"
            ? { rating: "desc" }
            : { isBestSeller: "desc" };

  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 12;

  const [rows, total] = await Promise.all([
    db().product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: PRODUCT_INCLUDE,
    }),
    db().product.count({ where }),
  ]);

  return {
    items: rows.map(mapProduct),
    total,
    page,
    pageSize,
    hasMore: (page - 1) * pageSize + pageSize < total,
  };
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (!isDbEnabled()) return mock.getProductBySlug(slug) ?? null;
  const row = await db().product.findUnique({
    where: { slug },
    include: PRODUCT_INCLUDE,
  });
  return row ? mapProduct(row) : null;
}

export async function getProductsByCategory(
  category: CategorySlug
): Promise<Product[]> {
  if (!isDbEnabled()) return mock.getProductsByCategory(category);
  const rows = await db().product.findMany({
    where: { category: { slug: category } },
    include: PRODUCT_INCLUDE,
  });
  return rows.map(mapProduct);
}

export async function getProductsByCollection(
  slug: string
): Promise<Product[]> {
  if (!isDbEnabled()) return mock.getProductsByCollection(slug);
  const rows = await db().product.findMany({
    where: { collections: { some: { slug } } },
    include: PRODUCT_INCLUDE,
  });
  return rows.map(mapProduct);
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  if (!isDbEnabled()) return mock.getRelatedProducts(product, limit);
  const rows = await db().product.findMany({
    where: {
      slug: { not: product.slug },
      OR: [
        { category: { slug: product.category } },
        { collections: { some: { slug: { in: product.collectionSlugs } } } },
      ],
    },
    include: PRODUCT_INCLUDE,
    take: limit,
  });
  return rows.map(mapProduct);
}

export async function getNewArrivals(): Promise<Product[]> {
  if (!isDbEnabled()) return mock.NEW_ARRIVALS;
  const rows = await db().product.findMany({
    where: { isNew: true },
    include: PRODUCT_INCLUDE,
  });
  return rows.map(mapProduct);
}

export async function getBestSellers(): Promise<Product[]> {
  if (!isDbEnabled()) return mock.BEST_SELLERS;
  const rows = await db().product.findMany({
    where: { isBestSeller: true },
    include: PRODUCT_INCLUDE,
  });
  return rows.map(mapProduct);
}

export async function listAllProducts(): Promise<Product[]> {
  if (!isDbEnabled()) return mock.PRODUCTS;
  const rows = await db().product.findMany({
    include: PRODUCT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapProduct);
}

export interface VariantInput {
  label: string;
  value: string;
  priceDelta?: number;
  stock?: number;
}

export interface ProductInput {
  name: string;
  slug?: string;
  sku?: string;
  tagline?: string;
  description?: string;
  price: number; // paise
  compareAtPrice?: number;
  category: CategorySlug;
  metal: Metal;
  gemstone: Gemstone;
  purity?: string;
  weightGrams?: number;
  images?: string[];
  stock?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  tags?: string[];
  variants?: VariantInput[];
  collectionSlugs?: string[];
}

/** Build a human, unique-ish SKU: LJ-<CAT>-<5 random base36>. */
function generateSku(category: string): string {
  const cat = category.slice(0, 3).toUpperCase();
  let rand = "";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // Derived from time-ish entropy via crypto when available.
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(5))
      : [0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 256));
  for (const b of bytes) rand += chars[b % chars.length];
  return `LJ-${cat}-${rand}`;
}

/** Ensure a Category row exists for a slug, return its id. */
async function categoryIdForSlug(slug: string): Promise<string> {
  const name =
    mock.CATEGORY_DATA.find((c) => c.slug === slug)?.name ??
    slug.charAt(0).toUpperCase() + slug.slice(1);
  const cat = await db().category.upsert({
    where: { slug },
    update: {},
    create: { slug, name },
  });
  return cat.id;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  if (!isDbEnabled()) throw new Error("Database not configured");
  const slug =
    input.slug?.trim() ||
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const categoryId = await categoryIdForSlug(input.category);
  const sku = input.sku?.trim().toUpperCase() || generateSku(input.category);
  const row = await db().product.create({
    data: {
      slug,
      sku,
      name: input.name,
      tagline: input.tagline ?? "",
      description: input.description ?? "",
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      categoryId,
      metal: input.metal,
      gemstone: input.gemstone,
      purity: input.purity ?? "18K",
      weightGrams: input.weightGrams ?? 0,
      images: input.images ?? [],
      stock: input.stock ?? 0,
      isNew: input.isNew ?? false,
      isBestSeller: input.isBestSeller ?? false,
      tags: input.tags ?? [],
      ...(input.variants?.length
        ? {
            variants: {
              create: input.variants.map((v) => ({
                label: v.label,
                value: v.value,
                priceDelta: Math.round(v.priceDelta ?? 0),
                stock: Math.max(0, Math.round(v.stock ?? 0)),
              })),
            },
          }
        : {}),
      ...(input.collectionSlugs?.length
        ? { collections: { connect: input.collectionSlugs.map((slug) => ({ slug })) } }
        : {}),
    },
    include: PRODUCT_INCLUDE,
  });
  return mapProduct(row);
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<Product | null> {
  if (!isDbEnabled()) return null;
  const data: any = {
    name: input.name,
    sku: input.sku?.trim().toUpperCase(),
    tagline: input.tagline,
    description: input.description,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    metal: input.metal,
    gemstone: input.gemstone,
    purity: input.purity,
    weightGrams: input.weightGrams,
    images: input.images,
    stock: input.stock,
    isNew: input.isNew,
    isBestSeller: input.isBestSeller,
    tags: input.tags,
  };
  if (input.category) data.categoryId = await categoryIdForSlug(input.category);
  // Drop undefined keys so we only update provided fields.
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  // Variants are replaced wholesale when provided (simplest reconcile).
  if (input.variants) {
    data.variants = {
      deleteMany: {},
      create: input.variants.map((v) => ({
        label: v.label,
        value: v.value,
        priceDelta: Math.round(v.priceDelta ?? 0),
        stock: Math.max(0, Math.round(v.stock ?? 0)),
      })),
    };
  }

  // Collections are replaced wholesale when provided (`set` disconnects any
  // not in the list, connects the rest — matches the variants reconcile).
  if (input.collectionSlugs) {
    data.collections = { set: input.collectionSlugs.map((slug) => ({ slug })) };
  }

  const row = await db().product.update({
    where: { id },
    data,
    include: PRODUCT_INCLUDE,
  });
  return mapProduct(row);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isDbEnabled()) return;
  await db().product.delete({ where: { id } });
}

export async function setProductStock(
  id: string,
  stock: number
): Promise<Product | null> {
  if (!isDbEnabled()) return null;
  const row = await db().product.update({
    where: { id },
    data: { stock: Math.max(0, Math.round(stock)) },
    include: PRODUCT_INCLUDE,
  });
  return mapProduct(row);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isDbEnabled()) return mock.PRODUCTS.find((p) => p.id === id) ?? null;
  const row = await db().product.findUnique({
    where: { id },
    include: PRODUCT_INCLUDE,
  });
  return row ? mapProduct(row) : null;
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  if (!isDbEnabled()) return null;
  const row = await db().product.findUnique({
    where: { sku: sku.trim().toUpperCase() },
    include: PRODUCT_INCLUDE,
  });
  return row ? mapProduct(row) : null;
}

/**
 * Adjust a product's stock by SKU. `mode: "add"` increments (goods received),
 * `mode: "set"` overwrites (stock take). Used by the QR/SKU quick-stock scanner.
 */
export async function adjustStockBySku(
  sku: string,
  quantity: number,
  mode: "add" | "set" = "add"
): Promise<Product | null> {
  if (!isDbEnabled()) return null;
  const existing = await db().product.findUnique({
    where: { sku: sku.trim().toUpperCase() },
  });
  if (!existing) return null;
  const next =
    mode === "add"
      ? Math.max(0, existing.stock + Math.round(quantity))
      : Math.max(0, Math.round(quantity));
  const row = await db().product.update({
    where: { id: existing.id },
    data: { stock: next },
    include: PRODUCT_INCLUDE,
  });
  return mapProduct(row);
}

// ─────────────────────────── collections ───────────────────────────

export async function listCollections(): Promise<Collection[]> {
  if (!isDbEnabled()) return mock.COLLECTIONS;
  const rows = await db().collection.findMany({ include: { products: true } });
  return rows.map(mapCollection);
}

export async function getCollection(slug: string): Promise<Collection | null> {
  if (!isDbEnabled()) return mock.getCollectionBySlug(slug) ?? null;
  const row = await db().collection.findUnique({
    where: { slug },
    include: { products: true },
  });
  return row ? mapCollection(row) : null;
}

export async function getFeaturedCollections(): Promise<Collection[]> {
  if (!isDbEnabled()) return mock.FEATURED_COLLECTIONS;
  const rows = await db().collection.findMany({
    where: { featured: true },
    include: { products: true },
  });
  return rows.map(mapCollection);
}

export async function listCategories(): Promise<Category[]> {
  if (!isDbEnabled()) return mock.CATEGORY_DATA;
  const rows = await db().category.findMany();
  // Category rows in DB don't carry description; merge from mock where possible.
  return rows.map((c: any) => {
    const m = mock.CATEGORY_DATA.find((x) => x.slug === c.slug);
    return {
      slug: c.slug as CategorySlug,
      name: c.name,
      description: m?.description ?? "",
      image: c.image ?? m?.image ?? "",
    };
  });
}

// ───────────────────────────── reviews ─────────────────────────────

export async function getReviewsForProduct(
  productId: string,
  approvedOnly = true
): Promise<Review[]> {
  if (!isDbEnabled()) return mock.getReviewsForProduct(productId);
  const rows = await db().review.findMany({
    where: { productId, ...(approvedOnly ? { approved: true } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapReview);
}

export async function listReviews(): Promise<(Review & { approved?: boolean })[]> {
  if (!isDbEnabled())
    return mock.REVIEWS.map((r) => ({ ...r, approved: true }));
  const rows = await db().review.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapReview);
}

export async function createReview(input: {
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  userId?: string;
}): Promise<Review> {
  if (!isDbEnabled()) {
    return {
      id: `r_${Date.now()}`,
      productId: input.productId,
      author: input.author,
      rating: input.rating,
      title: input.title,
      body: input.body,
      createdAt: new Date().toISOString(),
      verified: false,
    };
  }
  const row = await db().review.create({
    data: {
      productId: input.productId,
      author: input.author,
      rating: input.rating,
      title: input.title,
      body: input.body,
      userId: input.userId,
      verified: Boolean(input.userId),
      approved: false,
    },
  });
  return mapReview(row);
}

export async function setReviewApproved(id: string, approved: boolean) {
  if (!isDbEnabled()) return;
  await db().review.update({ where: { id }, data: { approved } });
}

export async function deleteReview(id: string) {
  if (!isDbEnabled()) return;
  await db().review.delete({ where: { id } });
}

// ───────────────────────────── coupons ─────────────────────────────

export async function listCoupons(): Promise<Coupon[]> {
  if (!isDbEnabled()) return mock.COUPONS;
  const rows = await db().coupon.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapCoupon);
}

export async function findCoupon(code?: string | null): Promise<Coupon | null> {
  if (!code) return null;
  if (!isDbEnabled()) return mock.COUPONS.find(
    (c) => c.active && c.code.toLowerCase() === code.trim().toLowerCase()
  ) ?? null;
  const row = await db().coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  return row && row.active ? mapCoupon(row) : null;
}

export async function createCoupon(input: Coupon): Promise<Coupon> {
  if (!isDbEnabled()) return input;
  const row = await db().coupon.create({
    data: {
      code: input.code.toUpperCase(),
      description: input.description,
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal,
      active: input.active,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
  return mapCoupon(row);
}

export async function updateCoupon(
  code: string,
  input: Partial<Coupon>
): Promise<Coupon | null> {
  if (!isDbEnabled()) return null;
  const row = await db().coupon.update({
    where: { code: code.toUpperCase() },
    data: {
      description: input.description,
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal,
      active: input.active,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
    // Only update provided fields.
  });
  return mapCoupon(row);
}

export async function setCouponActive(code: string, active: boolean) {
  if (!isDbEnabled()) return;
  await db().coupon.update({
    where: { code: code.toUpperCase() },
    data: { active },
  });
}

export async function deleteCoupon(code: string) {
  if (!isDbEnabled()) return;
  await db().coupon.delete({ where: { code: code.toUpperCase() } });
}

// ────────────────────────────── users ──────────────────────────────

export async function upsertUserFromAuth(input: {
  firebaseUid?: string;
  email: string;
  name: string;
  phone?: string;
  role: "customer" | "admin";
}): Promise<User> {
  const dbRole = input.role === "admin" ? "ADMIN" : "CUSTOMER";
  if (!isDbEnabled()) {
    return {
      id: `u_${Buffer.from(input.email).toString("hex").slice(0, 16)}`,
      name: input.name,
      email: input.email,
      role: input.role,
      phone: input.phone,
      addresses: [],
      createdAt: new Date().toISOString(),
    };
  }
  const row = await db().user.upsert({
    where: { email: input.email },
    update: {
      firebaseUid: input.firebaseUid,
      phone: input.phone ?? undefined,
      // promote to admin if configured, but never silently demote
      ...(dbRole === "ADMIN" ? { role: "ADMIN" } : {}),
    },
    create: {
      firebaseUid: input.firebaseUid,
      email: input.email,
      name: input.name,
      phone: input.phone,
      role: dbRole as any,
    },
    include: { addresses: true },
  });
  return mapUser(row);
}

export async function getUserById(id: string): Promise<User | null> {
  if (!isDbEnabled()) return null;
  const row = await db().user.findUnique({
    where: { id },
    include: { addresses: true },
  });
  return row ? mapUser(row) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!isDbEnabled()) return null;
  const row = await db().user.findUnique({
    where: { email },
    include: { addresses: true },
  });
  return row ? mapUser(row) : null;
}

export async function listUsers(): Promise<
  (User & { orderCount: number; totalSpent: number })[]
> {
  if (!isDbEnabled()) return [];
  const rows = await db().user.findMany({
    include: { addresses: true, orders: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((u: any) => ({
    ...mapUser(u),
    orderCount: u.orders.length,
    totalSpent: u.orders.reduce((s: number, o: any) => s + o.total, 0),
  }));
}

export async function updateProfile(
  id: string,
  data: { name?: string; phone?: string; marketingOptIn?: boolean }
): Promise<User | null> {
  if (!isDbEnabled()) return null;
  const row = await db().user.update({
    where: { id },
    data,
    include: { addresses: true },
  });
  return mapUser(row);
}

// ───────────────────────────── addresses ───────────────────────────

export async function listAddresses(userId: string): Promise<Address[]> {
  if (!isDbEnabled()) return [];
  const rows = await db().address.findMany({
    where: { userId },
    orderBy: { isDefault: "desc" },
  });
  return rows.map(mapAddress);
}

export async function createAddress(
  userId: string,
  input: Omit<Address, "id">
): Promise<Address> {
  if (!isDbEnabled()) return { ...input, id: `a_${Date.now()}` };
  if (input.isDefault) {
    await db().address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  const row = await db().address.create({
    data: { ...input, userId },
  });
  return mapAddress(row);
}

export async function updateAddress(
  userId: string,
  id: string,
  input: Partial<Omit<Address, "id">>
): Promise<Address | null> {
  if (!isDbEnabled()) return null;
  if (input.isDefault) {
    await db().address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  const row = await db().address.update({
    where: { id },
    data: input,
  });
  return mapAddress(row);
}

export async function deleteAddress(id: string) {
  if (!isDbEnabled()) return;
  await db().address.delete({ where: { id } });
}

// ───────────────────────────── wishlist ────────────────────────────

export async function listWishlist(userId: string): Promise<Product[]> {
  if (!isDbEnabled()) return [];
  const rows = await db().wishlistItem.findMany({
    where: { userId },
    include: { product: { include: PRODUCT_INCLUDE } },
  });
  return rows.map((w: any) => mapProduct(w.product));
}

export async function addWishlist(userId: string, productId: string) {
  if (!isDbEnabled()) return;
  await db().wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
  });
}

export async function removeWishlist(userId: string, productId: string) {
  if (!isDbEnabled()) return;
  await db()
    .wishlistItem.deleteMany({ where: { userId, productId } });
}

// ────────────────────────────── orders ─────────────────────────────

export interface CreateOrderInput {
  number: string;
  userId?: string;
  email?: string;
  phone?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  currency?: "INR" | "USD";
  paymentProvider: PaymentProvider;
  paymentRef?: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  shippingAddress: Record<string, any>;
  couponCode?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (!isDbEnabled()) {
    const now = new Date().toISOString();
    return {
      id: `o_${input.number}`,
      number: input.number,
      items: input.items,
      subtotal: input.subtotal,
      shipping: input.shipping,
      discount: input.discount,
      tax: input.tax,
      total: input.total,
      currency: input.currency ?? "INR",
      status: input.status,
      paymentStatus: input.paymentStatus,
      paymentProvider: input.paymentProvider,
      shippingAddress: input.shippingAddress as Address,
      timeline: buildTimeline(input.status, now, now),
      createdAt: now,
    };
  }
  // Link items to catalogue rows only for products that actually exist in the
  // DB. The catalogue is served from mock-data, so a product can be orderable
  // without a Product row (e.g. newly added items). Passing a dangling
  // productId would violate the OrderItem→Product foreign key and 500 the whole
  // checkout — so unknown products are stored with productId=null; the item
  // still keeps its slug/name/image/price, so the order is fully intact.
  const orderedIds = input.items
    .map((it) => it.productId)
    .filter(Boolean) as string[];
  const knownIds = orderedIds.length
    ? new Set(
        (
          await db()
            .product.findMany({
              where: { id: { in: orderedIds } },
              select: { id: true },
            })
            .catch(() => [] as { id: string }[])
        ).map((p) => p.id)
      )
    : new Set<string>();

  const row = await db().order.create({
    data: {
      number: input.number,
      userId: input.userId,
      email: input.email,
      phone: input.phone,
      subtotal: input.subtotal,
      shipping: input.shipping,
      discount: input.discount,
      tax: input.tax,
      total: input.total,
      currency: input.currency ?? "INR",
      status: STATUS_TO_DB[input.status] as any,
      paymentStatus: PAY_TO_DB[input.paymentStatus] as any,
      paymentProvider: input.paymentProvider,
      paymentRef: input.paymentRef,
      couponCode: input.couponCode,
      shippingAddress: input.shippingAddress,
      items: {
        create: input.items.map((it) => ({
          productId:
            it.productId && knownIds.has(it.productId) ? it.productId : null,
          slug: it.slug,
          name: it.name,
          image: it.image,
          variantLabel: it.variantLabel,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
        })),
      },
    },
    include: { items: true },
  });
  // If the order is already confirmed (COD / mock gateway / immediate paid),
  // auto-generate the AWB now so a shipping label + tracking are ready.
  if (input.status === "confirmed" && !row.awb) {
    return (await assignAwbToOrder(input.number).catch(() => null)) ?? mapOrder(row);
  }
  return mapOrder(row);
}

export async function ordersForUser(
  userId?: string,
  email?: string
): Promise<Order[]> {
  if (!isDbEnabled()) return mock.SAMPLE_ORDERS;
  const rows = await db().order.findMany({
    where: {
      OR: [userId ? { userId } : undefined, email ? { email } : undefined].filter(
        Boolean
      ) as any,
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function getOrderByNumber(number: string): Promise<Order | null> {
  if (!isDbEnabled())
    return mock.SAMPLE_ORDERS.find((o) => o.number === number) ?? null;
  const row = await db().order.findUnique({
    where: { number },
    include: { items: true },
  });
  return row ? mapOrder(row) : null;
}

/** Public shipment tracking lookup by AWB or manual tracking number. */
export async function getOrderByAwb(awb: string): Promise<Order | null> {
  if (!isDbEnabled())
    return mock.SAMPLE_ORDERS.find((o) => o.trackingNumber === awb) ?? null;
  const row = await db().order.findFirst({
    where: { OR: [{ awb }, { trackingNumber: awb }] },
    include: { items: true },
  });
  return row ? mapOrder(row) : null;
}

export async function listOrders(): Promise<Order[]> {
  if (!isDbEnabled()) return mock.SAMPLE_ORDERS;
  const rows = await db().order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export interface UpdateOrderStatusResult {
  order: Order | null;
  /** Only populated when `status === "cancelled"` and an AWB was on file. */
  shiprocketCancel?: { ok: boolean; message?: string };
}

export async function updateOrderStatus(
  number: string,
  status: OrderStatus,
  trackingNumber?: string
): Promise<UpdateOrderStatusResult> {
  if (!isDbEnabled()) return { order: null };
  const row = await db().order.update({
    where: { number },
    data: {
      status: STATUS_TO_DB[status] as any,
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(status === "shipped" || status === "out_for_delivery"
        ? { shippedAt: new Date() }
        : {}),
      ...(status === "shipped" || status === "out_for_delivery" || status === "delivered"
        ? { paymentStatus: "PAID" as any }
        : {}),
      ...(status === "cancelled" ? { cancelledAt: new Date() } : {}),
    },
    include: { items: true },
  });

  // Moving to shipped without an AWB yet? Auto-assign one now.
  if (status === "shipped" && !row.awb) {
    return { order: (await assignAwbToOrder(number)) ?? mapOrder(row) };
  }

  // Cancelling: best-effort tell Shiprocket too, so the courier shipment
  // doesn't stay alive after the local order is cancelled.
  if (status === "cancelled" && row.awb) {
    const shiprocketCancel = await cancelShiprocketOrder(row.shiprocketOrderId, row.awb).catch(
      () => ({
        ok: false,
        message: "Could not reach Shiprocket to cancel",
      })
    );
    return { order: mapOrder(row), shiprocketCancel };
  }

  return { order: mapOrder(row) };
}

/**
 * Assign an AWB + courier to an order (idempotent — returns the existing AWB
 * if one is already set). Creates the shipment via Shiprocket when configured,
 * else a deterministic mock AWB. This is what powers the "shipping slip" and
 * customer tracking, Meesho/Flipkart-style.
 */
export async function assignAwbToOrder(
  number: string,
  opts: { force?: boolean } = {}
): Promise<Order | null> {
  if (!isDbEnabled()) return null;
  const existing = await db().order.findUnique({
    where: { number },
    include: { items: true },
  });
  if (!existing) return null;
  if (existing.awb && !opts.force) return mapOrder(existing);

  // Real weight/SKU come from the linked Product where still available;
  // deleted/variant-only items fall back to a light default.
  const productIds = existing.items
    .map((it) => it.productId)
    .filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await db().product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, sku: true, weightGrams: true },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const weightKg = existing.items.reduce((sum, it) => {
    const grams = (it.productId && productById.get(it.productId)?.weightGrams) || 5;
    return sum + (grams / 1000) * it.quantity;
  }, 0);

  const addr = (existing.shippingAddress ?? {}) as Record<string, string>;
  const shipment = await createShipment({
    orderNumber: number,
    orderDate: existing.createdAt.toISOString(),
    paymentMethod: existing.paymentProvider === "cod" ? "COD" : "Prepaid",
    subtotal: existing.subtotal / 100,
    address: {
      name: addr.fullName || "Customer",
      phone: addr.phone || existing.phone || "9999999999",
      email: addr.email || existing.email || undefined,
      address: addr.line1 || "",
      address2: addr.line2,
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.postalCode || "",
      country: addr.country || "IN",
    },
    items: existing.items.map((it) => ({
      name: it.name,
      sku: (it.productId && productById.get(it.productId)?.sku) || it.slug,
      units: it.quantity,
      sellingPrice: it.unitPrice / 100,
    })),
    weightKg,
  });

  const row = await db().order.update({
    where: { number },
    data: {
      awb: shipment.awb,
      courier: shipment.courier,
      trackingNumber: shipment.awb,
      shipmentId: shipment.shipmentId,
      shiprocketOrderId: shipment.shiprocketOrderId,
      labelUrl: shipment.labelUrl,
    },
    include: { items: true },
  });
  return mapOrder(row);
}

export async function markOrderPaid(
  number: string,
  paymentRef?: string
): Promise<Order | null> {
  if (!isDbEnabled()) return null;
  const row = await db().order.update({
    where: { number },
    data: {
      paymentStatus: "PAID" as any,
      status: "CONFIRMED" as any,
      ...(paymentRef ? { paymentRef } : {}),
    },
    include: { items: true },
  });
  // Payment confirmed → auto-generate the AWB so fulfilment can start.
  if (!row.awb) {
    return (await assignAwbToOrder(number).catch(() => null)) ?? mapOrder(row);
  }
  return mapOrder(row);
}

// ─────────────────────────── admin stats ───────────────────────────

export interface AdminStats {
  revenue: number; // paise, paid orders only
  revenue30d: number;
  orderCount: number;
  orderCount30d: number;
  productCount: number;
  lowStockCount: number;
  customerCount: number;
  pendingReviews: number;
  monthlyRevenue: { label: string; value: number }[]; // last 7 months, ₹ thousands
  topSellers: { label: string; value: number }[]; // by units sold
  categoryBreakdown: { label: string; value: number }[];
  weeklyOrders: { label: string; value: number }[]; // last 8 weeks
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Aggregate figures for the dashboard + analytics pages. */
export async function getAdminStats(now = new Date()): Promise<AdminStats> {
  if (!isDbEnabled()) {
    // Mock fallback keeps the pages rendering with zero setup.
    const revenue = mock.SAMPLE_ORDERS.reduce((s, o) => s + o.total, 0);
    return {
      revenue,
      revenue30d: revenue,
      orderCount: mock.SAMPLE_ORDERS.length,
      orderCount30d: mock.SAMPLE_ORDERS.length,
      productCount: mock.PRODUCTS.length,
      lowStockCount: mock.PRODUCTS.filter((p) => p.stock <= 6).length,
      customerCount: 0,
      pendingReviews: 0,
      monthlyRevenue: MONTH_LABELS.slice(0, 7).map((label, i) => ({
        label,
        value: 400 + i * 60,
      })),
      topSellers: mock.BEST_SELLERS.slice(0, 5).map((p) => ({
        label: p.name.split(" ").slice(0, 2).join(" "),
        value: p.reviewCount,
      })),
      categoryBreakdown: mock.CATEGORY_DATA.map((c) => ({
        label: c.name,
        value: mock.PRODUCTS.filter((p) => p.category === c.slug).length,
      })),
      weeklyOrders: Array.from({ length: 8 }, (_, i) => ({
        label: `W${i + 1}`,
        value: 20 + i * 4,
      })),
    };
  }

  const cutoff30 = new Date(now.getTime() - 30 * 864e5);
  const cutoff8w = new Date(now.getTime() - 56 * 864e5);

  const [orders, productCount, lowStockCount, customerCount, pendingReviews, items] =
    await Promise.all([
      db().order.findMany({
        select: { total: true, paymentStatus: true, createdAt: true },
      }),
      db().product.count(),
      db().product.count({ where: { stock: { lte: 6 } } }),
      db().user.count(),
      db().review.count({ where: { approved: false } }),
      db().orderItem.findMany({ select: { name: true, quantity: true } }),
    ]);

  const paid = orders.filter((o: any) => o.paymentStatus === "PAID");
  const revenue = paid.reduce((s: number, o: any) => s + o.total, 0);
  const revenue30d = paid
    .filter((o: any) => o.createdAt >= cutoff30)
    .reduce((s: number, o: any) => s + o.total, 0);
  const orderCount30d = orders.filter((o: any) => o.createdAt >= cutoff30).length;

  // Monthly revenue, last 7 calendar months, in ₹ thousands.
  const monthlyRevenue: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const value = paid
      .filter((o: any) => o.createdAt >= d && o.createdAt < next)
      .reduce((s: number, o: any) => s + o.total, 0);
    monthlyRevenue.push({
      label: MONTH_LABELS[d.getMonth()],
      value: Math.round(value / 100 / 1000), // paise → ₹ → thousands
    });
  }

  // Weekly order counts, last 8 weeks.
  const weeklyOrders: { label: string; value: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date(now.getTime() - (w + 1) * 7 * 864e5);
    const end = new Date(now.getTime() - w * 7 * 864e5);
    const value = orders.filter(
      (o: any) => o.createdAt >= start && o.createdAt < end && o.createdAt >= cutoff8w
    ).length;
    weeklyOrders.push({ label: `W${8 - w}`, value });
  }

  // Top sellers by units sold.
  const unitsByName = new Map<string, number>();
  for (const it of items) {
    unitsByName.set(it.name, (unitsByName.get(it.name) ?? 0) + it.quantity);
  }
  const topSellers = [...unitsByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({
      label: name.split(" ").slice(0, 2).join(" "),
      value,
    }));

  // Catalogue by category.
  const cats = await db().category.findMany({
    include: { _count: { select: { products: true } } },
  });
  const categoryBreakdown = cats.map((c: any) => ({
    label: c.name,
    value: c._count.products,
  }));

  return {
    revenue,
    revenue30d,
    orderCount: orders.length,
    orderCount30d,
    productCount,
    lowStockCount,
    customerCount,
    pendingReviews,
    monthlyRevenue,
    topSellers,
    categoryBreakdown,
    weeklyOrders,
  };
}
