/**
 * Data-access layer. Every read/write goes through here.
 *
 * When Postgres is configured (DATABASE_URL set + client generated) these
 * functions hit Prisma. Otherwise they transparently fall back to the static
 * catalogue in `lib/mock-data.ts`, so the app still renders with zero setup.
 * Mappers convert Prisma rows into the plain `types/*` shapes the UI expects.
 */
import { prisma, isDbEnabled } from "./prisma";
import {
  createShipment,
  cancelShiprocketOrder,
  createReturnShipment,
  assignReverseAwb,
  generateReversePickup,
  cancelReversePickup,
  generateReverseLabel,
  trackReverseShipment,
  mapReverseStatus,
  isReverseException,
  REVERSE_STATUS_LABEL,
  type ReverseTrackingCode,
} from "@/lib/shipping/shiprocket";
import { refundRazorpayPayment } from "@/lib/payments/razorpay";
import { refundStripePayment } from "@/lib/payments/stripe";
import { encrypt, tryDecrypt } from "@/lib/security/crypto";
import { maskAccountNumber, maskUpiId } from "@/lib/security/mask";
import { validateCodRefundInput, type CodRefundInput } from "@/lib/security/validate-bank";
import { RETURN_WINDOW_DAYS } from "@/lib/constants";
import { sendEmail, returnReverseUpdateEmail } from "@/lib/notifications/email";
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
  ReturnRequest,
  ReturnStatus,
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

// Orders always load their items + the latest-first return requests so the
// mapper can surface the active return without an extra round-trip.
const ORDER_INCLUDE = {
  items: true,
  returnRequests: { include: { items: true }, orderBy: { createdAt: "desc" as const } },
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
  return_requested: "RETURN_REQUESTED",
  returned: "RETURNED",
};
const STATUS_FROM_DB: Record<string, OrderStatus> = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([k, v]) => [v, k as OrderStatus])
) as Record<string, OrderStatus>;

const RETURN_STATUS_TO_DB: Record<ReturnStatus, string> = {
  requested: "REQUESTED",
  approved: "APPROVED",
  rejected: "REJECTED",
  pickup_scheduled: "PICKUP_SCHEDULED",
  picked_up: "PICKED_UP",
  refund_initiated: "REFUND_INITIATED",
  refund_completed: "REFUND_COMPLETED",
  completed: "COMPLETED",
};
const RETURN_STATUS_FROM_DB: Record<string, ReturnStatus> = Object.fromEntries(
  Object.entries(RETURN_STATUS_TO_DB).map(([k, v]) => [v, k as ReturnStatus])
) as Record<string, ReturnStatus>;

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
  if (status === "cancelled") {
    return [
      { status: "confirmed", label: "Order confirmed", at: createdAt, done: true },
      { status: "cancelled", label: "Order cancelled", at: updatedAt, done: true },
    ];
  }
  if (status === "return_requested" || status === "returned") {
    return [
      { status: "confirmed", label: "Order confirmed", at: createdAt, done: true },
      { status: "delivered", label: "Delivered", at: "", done: true },
      {
        status: "return_requested",
        label: "Return requested",
        at: status === "return_requested" ? updatedAt : "",
        done: true,
      },
      {
        status: "returned",
        label: "Return completed",
        at: status === "returned" ? updatedAt : "",
        done: status === "returned",
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

const iso = (d: any): string | undefined =>
  d instanceof Date ? d.toISOString() : d ?? undefined;

function mapReturnRequest(r: any): ReturnRequest {
  return {
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.order?.number,
    userId: r.userId ?? undefined,
    status: RETURN_STATUS_FROM_DB[r.status] ?? "requested",
    reason: r.reason,
    description: r.description ?? undefined,
    images: (r.images ?? []) as string[],
    adminNotes: r.adminNotes ?? undefined,
    refundAmount: r.refundAmount ?? undefined,
    items: (r.items ?? []).map((it: any) => ({
      orderItemId: it.orderItemId ?? undefined,
      name: it.name,
      image: it.image,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
    })),
    approvedAt: iso(r.approvedAt),
    rejectedAt: iso(r.rejectedAt),
    refundedAt: iso(r.refundedAt),
    completedAt: iso(r.completedAt),
    createdAt: iso(r.createdAt) ?? new Date(0).toISOString(),
    updatedAt: iso(r.updatedAt) ?? new Date(0).toISOString(),
    customerName: r.order?.user?.name ?? undefined,
    customerEmail: r.order?.user?.email ?? r.order?.email ?? undefined,

    // Payment context from the parent order.
    paymentProvider: (r.order?.paymentProvider as PaymentProvider) ?? undefined,
    isPrepaid: r.order ? r.order.paymentProvider !== "cod" : undefined,

    // Reverse logistics.
    reverseShipmentId: r.reverseShipmentId ?? undefined,
    reverseOrderId: r.reverseOrderId ?? undefined,
    reverseAwb: r.reverseAwb ?? undefined,
    reverseCourier: r.reverseCourier ?? undefined,
    pickupId: r.pickupId ?? undefined,
    pickupScheduledDate: iso(r.pickupScheduledDate),
    reverseLabelUrl: r.reverseLabelUrl ?? undefined,
    reverseTrackingStatus: r.reverseTrackingStatus ?? undefined,
    reverseTrackingCode: (r.reverseTrackingCode as ReverseTrackingCode) ?? undefined,
    reverseTrackingUrl: r.reverseTrackingUrl ?? undefined,
    estimatedPickupAt: iso(r.estimatedPickupAt),
    estimatedDeliveryAt: iso(r.estimatedDeliveryAt),
    warehouseReceivedAt: iso(r.warehouseReceivedAt),
    warehouseReceivedBy: r.warehouseReceivedBy ?? undefined,
    timeline: Array.isArray(r.timeline) ? (r.timeline as any) : undefined,

    // Refund.
    refundMethod: r.refundMethod ?? undefined,
    refundStatus: r.refundStatus ?? undefined,
    refundId: r.refundId ?? undefined,
    refundReference: r.refundReference ?? undefined,
    refundProcessedAt: iso(r.refundProcessedAt),
    refundError: r.refundError ?? undefined,

    // COD refund collection — only masked values ever leave the server.
    codDetailsSubmitted: Boolean(r.upiIdEncrypted || r.bankAccountEncrypted),
    maskedUpiId: r.upiIdEncrypted ? maskUpiId(tryDecrypt(r.upiIdEncrypted)) : undefined,
    maskedAccountNumber: r.bankAccountEncrypted
      ? maskAccountNumber(safeAccountFromEncrypted(r.bankAccountEncrypted))
      : undefined,
    ifscCode: r.ifscCode ?? undefined,
    bankHolderName: r.bankHolderName ?? undefined,
    bankName: r.bankName ?? undefined,
    financeRemarks: r.financeRemarks ?? undefined,
  };
}

/** Decrypt the stored bank JSON and pull just the account number (for masking). */
function safeAccountFromEncrypted(enc: string): string | null {
  const raw = tryDecrypt(enc);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { accountNumber?: string }).accountNumber ?? null;
  } catch {
    return null;
  }
}

function mapOrder(o: any): Order {
  const createdAt =
    o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt;
  const updatedAt =
    o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt;
  const status = STATUS_FROM_DB[o.status] ?? "pending";
  // Latest return request (queries order returnRequests desc by createdAt).
  const latestReturn = (o.returnRequests ?? [])[0];
  return {
    id: o.id,
    number: o.number,
    userId: o.userId ?? undefined,
    email: o.email ?? undefined,
    items: (o.items ?? []).map(
      (it: any): OrderItem => ({
        id: it.id ?? undefined,
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
    shippedAt: iso(o.shippedAt),
    deliveredAt: iso(o.deliveredAt),
    cancelledAt: iso(o.cancelledAt),
    cancelReason: o.cancelReason ?? undefined,
    returnRequestedAt: iso(o.returnRequestedAt),
    returnedAt: iso(o.returnedAt),
    returnRequest: latestReturn ? mapReturnRequest(latestReturn) : null,
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
    include: ORDER_INCLUDE,
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
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function getOrderByNumber(number: string): Promise<Order | null> {
  if (!isDbEnabled())
    return mock.SAMPLE_ORDERS.find((o) => o.number === number) ?? null;
  const row = await db().order.findUnique({
    where: { number },
    include: ORDER_INCLUDE,
  });
  return row ? mapOrder(row) : null;
}

/** Public shipment tracking lookup by AWB or manual tracking number. */
export async function getOrderByAwb(awb: string): Promise<Order | null> {
  if (!isDbEnabled())
    return mock.SAMPLE_ORDERS.find((o) => o.trackingNumber === awb) ?? null;
  const row = await db().order.findFirst({
    where: { OR: [{ awb }, { trackingNumber: awb }] },
    include: ORDER_INCLUDE,
  });
  return row ? mapOrder(row) : null;
}

export async function listOrders(): Promise<Order[]> {
  if (!isDbEnabled()) return mock.SAMPLE_ORDERS;
  const rows = await db().order.findMany({
    include: ORDER_INCLUDE,
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
      // Anchor the return window the moment an order is marked delivered.
      ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
      ...(status === "cancelled" ? { cancelledAt: new Date() } : {}),
    },
    include: ORDER_INCLUDE,
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
    include: ORDER_INCLUDE,
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
    include: ORDER_INCLUDE,
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
    include: ORDER_INCLUDE,
  });
  // Payment confirmed → auto-generate the AWB so fulfilment can start.
  if (!row.awb) {
    return (await assignAwbToOrder(number).catch(() => null)) ?? mapOrder(row);
  }
  return mapOrder(row);
}

// ──────────────────── cancellation & returns ───────────────────────

/** Order statuses a customer is still allowed to cancel from. */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
];

export interface CancelOrderResult {
  order: Order;
  refund?: { ok: boolean; message?: string };
  shiprocketCancel?: { ok: boolean; message?: string };
}

/**
 * Best-effort gateway refund for a paid order/return (paise). Returns a rich
 * result (gateway refund id + raw payload) for the return-refund audit trail.
 * `idempotencyKey` is forwarded to the gateway to make retries safe.
 */
async function refundPayment(
  provider: PaymentProvider,
  paymentRef: string | null | undefined,
  amount: number,
  idempotencyKey?: string
): Promise<{ ok: boolean; message?: string; refundId?: string; payload?: unknown }> {
  try {
    if (provider === "razorpay") {
      const r = await refundRazorpayPayment(paymentRef, amount, { idempotencyKey });
      return { ok: r.ok, message: r.message, refundId: r.id, payload: r.payload };
    }
    if (provider === "stripe") {
      const r = await refundStripePayment(paymentRef, amount);
      return { ok: r.ok, message: r.message, refundId: (r as any).id };
    }
    // COD — nothing was charged online, so nothing to refund via a gateway.
    return { ok: true, message: "No online payment to refund (COD)" };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Increment product stock for each order/return line that maps to a product. */
async function restoreStock(
  tx: any,
  lines: { productId?: string | null; quantity: number }[]
) {
  for (const line of lines) {
    if (!line.productId) continue;
    await tx.product.update({
      where: { id: line.productId },
      data: { stock: { increment: line.quantity } },
    }).catch(() => null); // product may have been deleted — ignore
  }
}

/**
 * Cancel an order. Enforces the status rule inside a transaction (so a racing
 * second request can't double-cancel), restores inventory, flips payment to
 * REFUNDED when it was paid, then best-effort cancels the courier shipment and
 * issues a gateway refund. Throws a coded Error the API layer maps to 4xx.
 */
export async function cancelOrder(input: {
  number: string;
  reason?: string;
}): Promise<CancelOrderResult> {
  if (!isDbEnabled()) {
    throw new Error("DB_DISABLED");
  }

  const updated = await db().$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({
      where: { number: input.number },
      include: { items: true },
    });
    if (!order) throw new Error("NOT_FOUND");

    const status = STATUS_FROM_DB[order.status] ?? "pending";
    if (!CANCELLABLE_STATUSES.includes(status)) {
      throw new Error("NOT_CANCELLABLE");
    }

    await restoreStock(tx, order.items);

    const wasPaid = order.paymentStatus === "PAID";
    return tx.order.update({
      where: { number: input.number },
      data: {
        status: "CANCELLED" as any,
        cancelledAt: new Date(),
        cancelReason: input.reason?.trim() || null,
        ...(wasPaid ? { paymentStatus: "REFUNDED" as any } : {}),
      },
      include: ORDER_INCLUDE,
    });
  });

  // External side-effects run after the DB commit so a slow/broken courier or
  // gateway never rolls back the cancellation the customer already saw succeed.
  let refund: { ok: boolean; message?: string } | undefined;
  if (updated.paymentStatus === "REFUNDED") {
    refund = await refundPayment(
      updated.paymentProvider as PaymentProvider,
      updated.paymentRef,
      updated.total
    );
  }

  let shiprocketCancel: { ok: boolean; message?: string } | undefined;
  if (updated.awb) {
    shiprocketCancel = await cancelShiprocketOrder(
      updated.shiprocketOrderId,
      updated.awb
    ).catch(() => ({ ok: false, message: "Could not reach Shiprocket to cancel" }));
  }

  return { order: mapOrder(updated), refund, shiprocketCancel };
}

export interface CreateReturnRequestInput {
  number: string;
  reason: string;
  description?: string;
  images?: string[];
  items: { orderItemId: string; quantity: number }[];
}

/**
 * Raise a per-item return request. Validates the order is delivered, still
 * within the return window, has no active return, and that every requested line
 * belongs to the order with a quantity within what was purchased. Flips the
 * order to RETURN_REQUESTED. Throws coded Errors for the API layer.
 */
export async function createReturnRequest(
  input: CreateReturnRequestInput
): Promise<{ order: Order; returnRequest: ReturnRequest }> {
  if (!isDbEnabled()) throw new Error("DB_DISABLED");

  const reason = input.reason?.trim();
  if (!reason) throw new Error("REASON_REQUIRED");

  const result = await db().$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({
      where: { number: input.number },
      include: {
        items: true,
        returnRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!order) throw new Error("NOT_FOUND");
    if (order.status !== "DELIVERED" && order.status !== "RETURN_REQUESTED") {
      throw new Error("NOT_DELIVERED");
    }

    // Return window: delivered date (fallback to updatedAt) + N days.
    const delivered = order.deliveredAt ?? order.updatedAt;
    const deadline = new Date(
      new Date(delivered).getTime() + RETURN_WINDOW_DAYS * 864e5
    );
    if (new Date() > deadline) throw new Error("WINDOW_EXPIRED");

    // Block duplicate/active returns.
    const active = order.returnRequests[0];
    if (active && active.status !== "REJECTED") {
      throw new Error("RETURN_EXISTS");
    }

    // Validate requested lines against the order.
    const itemById = new Map(order.items.map((it: any) => [it.id, it]));
    const lines = input.items?.filter((l) => l.quantity > 0) ?? [];
    if (!lines.length) throw new Error("NO_ITEMS");
    for (const line of lines) {
      const oi = itemById.get(line.orderItemId) as any;
      if (!oi) throw new Error("ITEM_NOT_IN_ORDER");
      if (line.quantity > oi.quantity) throw new Error("QUANTITY_TOO_HIGH");
    }

    const created = await tx.returnRequest.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        status: "REQUESTED" as any,
        reason,
        description: input.description?.trim() || null,
        images: (input.images ?? []).filter(Boolean),
        items: {
          create: lines.map((line) => {
            const oi = itemById.get(line.orderItemId) as any;
            return {
              orderItemId: oi.id,
              name: oi.name,
              image: oi.image,
              unitPrice: oi.unitPrice,
              quantity: line.quantity,
            };
          }),
        },
      },
      include: { items: true, order: { include: { user: true } } },
    });

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: "RETURN_REQUESTED" as any, returnRequestedAt: new Date() },
      include: ORDER_INCLUDE,
    });

    return { order: updatedOrder, ret: created };
  });

  return {
    order: mapOrder(result.order),
    returnRequest: mapReturnRequest(result.ret),
  };
}

const RETURN_REQUEST_INCLUDE = {
  items: true,
  order: { include: { user: true } },
} as const;

export async function listReturnRequests(
  filterStatus?: ReturnStatus
): Promise<ReturnRequest[]> {
  if (!isDbEnabled()) return [];
  const rows = await db().returnRequest.findMany({
    where: filterStatus ? { status: RETURN_STATUS_TO_DB[filterStatus] as any } : {},
    include: RETURN_REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapReturnRequest);
}

export async function returnRequestsForUser(
  userId?: string,
  email?: string
): Promise<ReturnRequest[]> {
  if (!isDbEnabled()) return [];
  const rows = await db().returnRequest.findMany({
    where: {
      OR: [
        userId ? { userId } : undefined,
        email ? { order: { email } } : undefined,
      ].filter(Boolean) as any,
    },
    include: RETURN_REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapReturnRequest);
}

export async function getReturnRequestById(
  id: string
): Promise<ReturnRequest | null> {
  if (!isDbEnabled()) return null;
  const row = await db().returnRequest.findUnique({
    where: { id },
    include: RETURN_REQUEST_INCLUDE,
  });
  return row ? mapReturnRequest(row) : null;
}

export interface UpdateReturnResult {
  returnRequest: ReturnRequest;
  refund?: { ok: boolean; message?: string };
}

/** Valid forward transitions for a return request (admin-driven). */
const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["pickup_scheduled", "rejected"],
  pickup_scheduled: ["picked_up"],
  picked_up: ["refund_initiated", "completed"],
  refund_initiated: ["refund_completed"],
  refund_completed: ["completed"],
  completed: [],
  rejected: [],
};

/**
 * Admin transition of a return request. Guards the state machine, and on the
 * terminal steps restores inventory (COMPLETED) and issues the refund
 * (REFUND_COMPLETED → order paymentStatus REFUNDED + gateway refund).
 */
export async function updateReturnRequestStatus(input: {
  id: string;
  status?: ReturnStatus;
  adminNotes?: string;
  refundAmount?: number;
}): Promise<UpdateReturnResult> {
  if (!isDbEnabled()) throw new Error("DB_DISABLED");

  const outcome = await db().$transaction(async (tx: any) => {
    const current = await tx.returnRequest.findUnique({
      where: { id: input.id },
      include: { items: true, order: true },
    });
    if (!current) throw new Error("NOT_FOUND");

    const from = RETURN_STATUS_FROM_DB[current.status] ?? "requested";
    const to = input.status;
    if (to && to !== from && !RETURN_TRANSITIONS[from]?.includes(to)) {
      throw new Error("INVALID_TRANSITION");
    }

    const now = new Date();
    const data: any = {};
    if (typeof input.adminNotes === "string") data.adminNotes = input.adminNotes.trim() || null;
    if (typeof input.refundAmount === "number") data.refundAmount = Math.max(0, Math.round(input.refundAmount));

    let doRefund = false;
    if (to && to !== from) {
      data.status = RETURN_STATUS_TO_DB[to] as any;
      if (to === "approved") data.approvedAt = now;
      if (to === "rejected") data.rejectedAt = now;
      if (to === "refund_completed") data.refundedAt = now;
      if (to === "completed") data.completedAt = now;

      // On completion the goods are physically back — restore inventory and
      // mark the order fully RETURNED.
      if (to === "completed") {
        const orderItems = await tx.orderItem.findMany({
          where: { id: { in: current.items.map((i: any) => i.orderItemId).filter(Boolean) } },
          select: { id: true, productId: true },
        });
        const productByItem = new Map<string, string | null>(orderItems.map((o: any) => [o.id, o.productId]));
        await restoreStock(
          tx,
          current.items.map((i: any) => ({
            productId: i.orderItemId ? productByItem.get(i.orderItemId) : null,
            quantity: i.quantity,
          }))
        );
        await tx.order.update({
          where: { id: current.orderId },
          data: { status: "RETURNED" as any, returnedAt: now },
        });
      }

      // Refund completed → flag the order refunded + fire the gateway refund.
      if (to === "refund_completed") {
        await tx.order.update({
          where: { id: current.orderId },
          data: { paymentStatus: "REFUNDED" as any },
        });
        doRefund = current.order.paymentStatus === "PAID";
      }
    }

    const saved = await tx.returnRequest.update({
      where: { id: input.id },
      data,
      include: RETURN_REQUEST_INCLUDE,
    });
    return { saved, doRefund, order: current.order };
  });

  let refund: { ok: boolean; message?: string } | undefined;
  if (outcome.doRefund) {
    const amount = outcome.saved.refundAmount ?? outcome.order.total;
    refund = await refundPayment(
      outcome.order.paymentProvider as PaymentProvider,
      outcome.order.paymentRef,
      amount
    );
  }

  return { returnRequest: mapReturnRequest(outcome.saved), refund };
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVERSE LOGISTICS & REFUND AUTOMATION
//
//  End-to-end: admin approves → reverse Shiprocket pickup + AWB + label →
//  webhook/tracking drives the reverse shipment → warehouse receipt gates the
//  refund → prepaid auto-refunds via Razorpay (idempotent) / COD runs the
//  secure collect-details → verify → payout flow. Every state change is
//  appended to a JSON timeline and written to the ReturnAuditLog.
// ═══════════════════════════════════════════════════════════════════════════

export interface ReturnTimelineEventRow {
  code: string;
  label: string;
  at: string;
  note?: string;
  actor?: string;
}

/** Append events to a return's JSON timeline (dedup identical trailing codes). */
function appendTimeline(
  existing: unknown,
  events: { code: string; label: string; note?: string; actor?: string }[]
): ReturnTimelineEventRow[] {
  const now = new Date().toISOString();
  const list: ReturnTimelineEventRow[] = Array.isArray(existing)
    ? (existing as ReturnTimelineEventRow[])
    : [];
  for (const e of events) {
    const last = list[list.length - 1];
    if (last && last.code === e.code && !e.note) continue; // skip noisy repeats
    list.push({ code: e.code, label: e.label, at: now, note: e.note, actor: e.actor });
  }
  return list;
}

/** Write an audit-trail row. Best-effort — never blocks the caller. */
async function writeReturnAudit(
  returnRequestId: string,
  action: string,
  actor?: string,
  detail?: string,
  metadata?: unknown
): Promise<void> {
  if (!isDbEnabled()) return;
  await db()
    .returnAuditLog.create({
      data: {
        returnRequestId,
        action,
        actor: actor ?? "system",
        detail: detail ?? null,
        metadata: (metadata as any) ?? undefined,
      },
    })
    .catch(() => null);
}

/** Fetch the raw return row + parent order (internal, not mapped). */
async function loadReturnRow(id: string) {
  return db().returnRequest.findUnique({
    where: { id },
    include: { items: true, order: { include: { items: true, user: true } } },
  });
}

/** Coded errors the API layer maps to HTTP statuses. */
export class ReturnError extends Error {}

/** True when the order behind a return was paid online (Razorpay/Stripe). */
function isPrepaidOrder(order: any): boolean {
  return order?.paymentProvider && order.paymentProvider !== "cod";
}

/** Best-effort reverse-shipment lifecycle email to the customer. */
function notifyReverse(row: any, code: ReverseTrackingCode | "refund_initiated" | "refund_completed" | "refund_failed" | "cod_required") {
  const to = row?.order?.user?.email || row?.order?.email;
  if (!to) return;
  const email = returnReverseUpdateEmail({
    to,
    orderNumber: row?.order?.number ?? "",
    code,
    reverseAwb: row?.reverseAwb ?? undefined,
    courier: row?.reverseCourier ?? undefined,
    refundAmount: row?.refundAmount ?? row?.order?.total ?? undefined,
    refundReference: row?.refundId ?? row?.refundReference ?? undefined,
  });
  if (email) void sendEmail(email);
}

/**
 * Approve a return AND create the reverse Shiprocket pickup in one go.
 *
 * Idempotent: if a reverse shipment already exists it is not recreated. The DB
 * state change (status→APPROVED) commits first; the courier calls run after so
 * a Shiprocket hiccup never rolls back an approval the admin already saw.
 */
export async function approveReturnWithReversePickup(input: {
  id: string;
  actor?: string;
}): Promise<{ returnRequest: ReturnRequest; reverse: { ok: boolean; mock?: boolean; message?: string } }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const actor = input.actor ?? "admin";

  const row = await loadReturnRow(input.id);
  if (!row) throw new ReturnError("NOT_FOUND");
  const from = RETURN_STATUS_FROM_DB[row.status] ?? "requested";
  if (from === "rejected") throw new ReturnError("INVALID_TRANSITION");

  // Mark approved (idempotent) + default the refund track for the payment type.
  if (from === "requested") {
    const prepaid = isPrepaidOrder(row.order);
    await db().returnRequest.update({
      where: { id: input.id },
      data: {
        status: "APPROVED" as any,
        approvedAt: row.approvedAt ?? new Date(),
        refundMethod: prepaid ? "razorpay" : row.refundMethod ?? null,
        refundStatus: prepaid ? "verification_pending" : "awaiting_details",
        timeline: appendTimeline(row.timeline, [
          { code: "return_approved", label: "Return approved", actor },
        ]) as any,
      },
    });
    await writeReturnAudit(input.id, "return_approved", actor);
    if (!prepaid) notifyReverse(row, "cod_required");
  }

  // Create the reverse shipment unless one already exists.
  let reverse: { ok: boolean; mock?: boolean; message?: string } = {
    ok: true,
    message: "Reverse shipment already exists",
  };
  const fresh = await loadReturnRow(input.id);
  if (fresh && !fresh.reverseAwb && !fresh.reverseShipmentId) {
    reverse = await createReverseShipmentForReturn(input.id, actor);
  }

  const finalRow = await loadReturnRow(input.id);
  return { returnRequest: mapReturnRequest(finalRow), reverse };
}

/** Weight/dimensions/items helper shared by forward + reverse shipment calls. */
function shipmentItemsFor(row: any) {
  const items = (row.items?.length ? row.items : row.order?.items ?? []) as any[];
  return items.map((it) => ({
    name: it.name,
    sku: it.slug ?? it.name,
    units: it.quantity,
    sellingPrice: it.unitPrice / 100,
  }));
}

/**
 * Create (or re-create) the reverse shipment + AWB + pickup + label for a
 * return and persist everything. Used by approve + the manual "Generate Pickup"
 * fallback. Never throws — returns a status object.
 */
export async function createReverseShipmentForReturn(
  id: string,
  actor = "admin"
): Promise<{ ok: boolean; mock?: boolean; message?: string }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const row = await loadReturnRow(id);
  if (!row) throw new ReturnError("NOT_FOUND");

  const order = row.order;
  const addr = (order?.shippingAddress ?? {}) as Record<string, string>;
  const weightKg = Math.max(
    0.05,
    ((row.items?.length ? row.items : order?.items ?? []) as any[]).reduce(
      (s, it) => s + 0.05 * it.quantity,
      0
    )
  );

  const shipment = await createReturnShipment({
    returnId: id,
    orderNumber: order?.number ?? id,
    orderDate: (order?.createdAt ?? new Date()).toISOString?.() ?? new Date().toISOString(),
    customer: {
      name: addr.fullName || order?.user?.name || "Customer",
      phone: addr.phone || order?.phone || "9999999999",
      email: addr.email || order?.email || undefined,
      address: addr.line1 || "",
      address2: addr.line2,
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.postalCode || "",
      country: addr.country || "India",
    },
    items: shipmentItemsFor(row),
    subtotal: (row.refundAmount ?? order?.subtotal ?? 0) / 100,
    weightKg,
  });

  await db().returnRequest.update({
    where: { id },
    data: {
      status: "PICKUP_SCHEDULED" as any,
      reverseShipmentId: shipment.reverseShipmentId ?? null,
      reverseOrderId: shipment.reverseOrderId ?? null,
      reverseAwb: shipment.reverseAwb || null,
      reverseCourier: shipment.courier ?? null,
      reverseLabelUrl: shipment.labelUrl ?? null,
      reverseTrackingUrl: shipment.trackingUrl ?? null,
      reverseTrackingStatus: REVERSE_STATUS_LABEL[shipment.status],
      reverseTrackingCode: shipment.status,
      pickupScheduledDate: shipment.pickupScheduledDate
        ? new Date(shipment.pickupScheduledDate)
        : row.pickupScheduledDate ?? null,
      estimatedPickupAt: shipment.pickupScheduledDate
        ? new Date(shipment.pickupScheduledDate)
        : null,
      timeline: appendTimeline(row.timeline, [
        { code: "reverse_pickup_created", label: "Reverse pickup created", actor },
        { code: "awb_generated", label: `AWB generated${shipment.reverseAwb ? ` · ${shipment.reverseAwb}` : ""}`, actor },
        { code: "pickup_scheduled", label: "Pickup scheduled", actor },
      ]) as any,
    },
  });
  await writeReturnAudit(id, "reverse_pickup_created", actor, undefined, {
    reverseAwb: shipment.reverseAwb,
    courier: shipment.courier,
    mock: shipment.mock,
  });

  const after = await loadReturnRow(id);
  notifyReverse(after, "pickup_scheduled");
  return { ok: true, mock: shipment.mock };
}

/** Manual fallback: (re)assign a reverse AWB for an existing reverse shipment. */
export async function generateReverseAwbForReturn(
  id: string,
  actor = "admin"
): Promise<{ ok: boolean; awb?: string; message?: string }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const row = await loadReturnRow(id);
  if (!row) throw new ReturnError("NOT_FOUND");
  if (!row.reverseShipmentId) {
    const created = await createReverseShipmentForReturn(id, actor);
    const r = await loadReturnRow(id);
    return { ok: created.ok, awb: r?.reverseAwb ?? undefined, message: created.message };
  }
  const res = await assignReverseAwb(row.reverseShipmentId);
  if (res.awb) {
    await db().returnRequest.update({
      where: { id },
      data: {
        reverseAwb: res.awb,
        reverseCourier: res.courier ?? row.reverseCourier,
        reverseTrackingUrl: `https://shiprocket.co/tracking/${res.awb}`,
        timeline: appendTimeline(row.timeline, [
          { code: "awb_generated", label: `AWB generated · ${res.awb}`, actor },
        ]) as any,
      },
    });
    await writeReturnAudit(id, "awb_generated", actor, res.awb);
  }
  return { ok: res.ok, awb: res.awb, message: res.message };
}

/** Manual fallback: schedule / re-schedule the courier pickup. */
export async function scheduleReversePickupForReturn(
  id: string,
  actor = "admin"
): Promise<{ ok: boolean; message?: string }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const row = await loadReturnRow(id);
  if (!row) throw new ReturnError("NOT_FOUND");
  if (!row.reverseShipmentId) throw new ReturnError("NO_REVERSE_SHIPMENT");
  const res = await generateReversePickup(row.reverseShipmentId);
  await db().returnRequest.update({
    where: { id },
    data: {
      status: "PICKUP_SCHEDULED" as any,
      pickupScheduledDate: res.pickupScheduledDate
        ? new Date(res.pickupScheduledDate)
        : row.pickupScheduledDate,
      reverseTrackingCode: "pickup_scheduled",
      reverseTrackingStatus: REVERSE_STATUS_LABEL.pickup_scheduled,
      timeline: appendTimeline(row.timeline, [
        { code: "pickup_scheduled", label: "Pickup scheduled", actor },
      ]) as any,
    },
  });
  await writeReturnAudit(id, "pickup_scheduled", actor, res.message);
  return { ok: res.ok, message: res.message };
}

/** Cancel the reverse pickup on Shiprocket + locally. */
export async function cancelReversePickupForReturn(
  id: string,
  actor = "admin"
): Promise<{ ok: boolean; message?: string }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const row = await loadReturnRow(id);
  if (!row) throw new ReturnError("NOT_FOUND");
  const res = await cancelReversePickup(row.reverseAwb);
  await db().returnRequest.update({
    where: { id },
    data: {
      status: "APPROVED" as any,
      reverseTrackingCode: "cancelled",
      reverseTrackingStatus: REVERSE_STATUS_LABEL.cancelled,
      timeline: appendTimeline(row.timeline, [
        { code: "pickup_cancelled", label: "Pickup cancelled", actor, note: res.message },
      ]) as any,
    },
  });
  await writeReturnAudit(id, "pickup_cancelled", actor, res.message);
  return res;
}

/**
 * Apply a reverse-tracking update (from a manual refresh or a webhook). Updates
 * the free-text status + normalised code + timeline, and — crucially — when the
 * shipment is DELIVERED to our warehouse, records receipt and triggers the
 * refund. This is the ONLY automatic path that can release a refund.
 */
export async function applyReverseTrackingUpdate(input: {
  id: string;
  code: ReverseTrackingCode;
  rawStatus?: string;
  estimatedDeliveryAt?: string;
  actor?: string;
  webhookPayload?: unknown;
}): Promise<{ returnRequest: ReturnRequest; refund?: RefundOutcome }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const actor = input.actor ?? "system";
  const row = await loadReturnRow(input.id);
  if (!row) throw new ReturnError("NOT_FOUND");

  const label = REVERSE_STATUS_LABEL[input.code] ?? input.rawStatus ?? "Update received";
  const data: any = {
    reverseTrackingCode: input.code,
    reverseTrackingStatus: input.rawStatus || label,
    timeline: appendTimeline(row.timeline, [{ code: input.code, label, actor }]) as any,
  };
  if (input.estimatedDeliveryAt) data.estimatedDeliveryAt = new Date(input.estimatedDeliveryAt);
  if (input.webhookPayload) data.shiprocketWebhookPayload = input.webhookPayload as any;

  // Advance the coarse ReturnStatus for picked-up / in-transit milestones.
  const cur = RETURN_STATUS_FROM_DB[row.status] ?? "requested";
  if (
    (input.code === "picked_up" || input.code === "in_transit" || input.code === "out_for_delivery") &&
    (cur === "approved" || cur === "pickup_scheduled")
  ) {
    data.status = "PICKED_UP" as any;
  }

  await db().returnRequest.update({ where: { id: input.id }, data });
  await writeReturnAudit(input.id, `reverse_${input.code}`, actor, input.rawStatus);

  const afterRow = await loadReturnRow(input.id);
  notifyReverse(afterRow, input.code);

  // Delivered to warehouse → record receipt + auto-refund.
  if (input.code === "delivered") {
    const refund = await markWarehouseReceivedAndRefund({
      id: input.id,
      actor,
      via: actor === "webhook" ? "webhook" : "system",
    });
    return { returnRequest: refund.returnRequest, refund: refund.refund };
  }

  return { returnRequest: mapReturnRequest(afterRow) };
}

/** Pull live tracking from Shiprocket and apply it. Admin "Refresh Tracking". */
export async function refreshReverseTracking(
  id: string,
  actor = "admin"
): Promise<{ returnRequest: ReturnRequest; refund?: RefundOutcome; message?: string }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const row = await loadReturnRow(id);
  if (!row) throw new ReturnError("NOT_FOUND");
  if (!row.reverseAwb) throw new ReturnError("NO_REVERSE_AWB");

  const snap = await trackReverseShipment(row.reverseAwb);
  if (!snap || snap.mock) {
    return {
      returnRequest: mapReturnRequest(row),
      message: snap?.mock ? "No live tracking for this shipment (mock/unconfigured)." : "Tracking unavailable.",
    };
  }
  return applyReverseTrackingUpdate({
    id,
    code: snap.code,
    rawStatus: snap.rawStatus,
    estimatedDeliveryAt: snap.estimatedDeliveryAt,
    actor,
  });
}

export interface RefundOutcome {
  ok: boolean;
  status?: string;
  message?: string;
  refundId?: string;
  manual?: boolean;
}

/**
 * Record warehouse receipt (webhook or manual) and immediately kick off the
 * refund. Refunds NEVER happen before this point.
 */
export async function markWarehouseReceivedAndRefund(input: {
  id: string;
  actor?: string;
  via?: string;
}): Promise<{ returnRequest: ReturnRequest; refund?: RefundOutcome }> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const actor = input.actor ?? "admin";
  const row = await loadReturnRow(input.id);
  if (!row) throw new ReturnError("NOT_FOUND");

  if (!row.warehouseReceivedAt) {
    await db().returnRequest.update({
      where: { id: input.id },
      data: {
        warehouseReceivedAt: new Date(),
        warehouseReceivedBy: input.via ?? actor,
        reverseTrackingCode: "delivered",
        reverseTrackingStatus: REVERSE_STATUS_LABEL.delivered,
        status: RETURN_STATUS_FROM_DB[row.status] === "requested" ? row.status : ("PICKED_UP" as any),
        timeline: appendTimeline(row.timeline, [
          { code: "warehouse_received", label: "Received at warehouse", actor },
        ]) as any,
      },
    });
    await writeReturnAudit(input.id, "warehouse_received", actor);
  }

  const refund = await initiateReturnRefund({ id: input.id, actor, auto: true });
  const finalRow = await loadReturnRow(input.id);
  return { returnRequest: mapReturnRequest(finalRow), refund };
}

/**
 * Initiate the refund for a return. Idempotent (a unique idempotency key + a
 * status guard prevent double refunds). Prepaid → Razorpay/Stripe gateway
 * refund + auto-complete. COD → requires finance-verified payout details, then
 * moves to `processing` for the admin to mark paid with a reference.
 */
export async function initiateReturnRefund(input: {
  id: string;
  actor?: string;
  auto?: boolean;
}): Promise<RefundOutcome> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const actor = input.actor ?? "admin";
  const row = await loadReturnRow(input.id);
  if (!row) throw new ReturnError("NOT_FOUND");

  // Hard gate: no refund before the goods are physically back.
  if (!row.warehouseReceivedAt) throw new ReturnError("WAREHOUSE_NOT_RECEIVED");

  // Idempotency: already completed → no-op.
  if (row.refundStatus === "completed" || row.refundId) {
    return { ok: true, status: "completed", refundId: row.refundId ?? undefined, message: "Already refunded" };
  }

  const amount = row.refundAmount ?? row.order?.total ?? 0;
  const prepaid = isPrepaidOrder(row.order);

  // ───────────── COD: manual, verified payout ─────────────
  if (!prepaid) {
    if (row.refundStatus !== "verified") {
      // Nothing to auto-do; the customer must submit details and finance verify.
      if (input.auto) return { ok: false, manual: true, message: "COD refund awaiting verified payout details" };
      throw new ReturnError("COD_NOT_VERIFIED");
    }
    await db().returnRequest.update({
      where: { id: input.id },
      data: {
        status: "REFUND_INITIATED" as any,
        refundStatus: "processing",
        refundAmount: amount,
        timeline: appendTimeline(row.timeline, [
          { code: "refund_processing", label: "Refund processing", actor },
        ]) as any,
      },
    });
    await writeReturnAudit(input.id, "refund_initiated", actor, "COD manual payout");
    notifyReverse(await loadReturnRow(input.id), "refund_initiated");
    return { ok: true, status: "processing", manual: true, message: "COD refund moved to processing" };
  }

  // ───────────── Prepaid: gateway refund (idempotent) ─────────────
  // Reserve the idempotency key first; a racing call hitting the @unique
  // constraint bails out instead of issuing a second refund.
  const idemKey = row.refundIdempotencyKey ?? `refund_${input.id}`;
  try {
    await db().returnRequest.update({
      where: { id: input.id },
      data: {
        status: "REFUND_INITIATED" as any,
        refundStatus: "processing",
        refundMethod: "razorpay",
        refundAmount: amount,
        refundIdempotencyKey: idemKey,
        refundAttempts: { increment: 1 },
        timeline: appendTimeline(row.timeline, [
          { code: "refund_initiated", label: "Refund initiated", actor },
        ]) as any,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // Another request already claimed the key — treat as in-flight.
      return { ok: true, status: "processing", message: "Refund already in progress" };
    }
    throw e;
  }
  await writeReturnAudit(input.id, "refund_initiated", actor, `amount=${amount}`);

  const gateway = await refundPayment(
    row.order.paymentProvider as PaymentProvider,
    row.order.paymentRef,
    amount,
    idemKey
  );

  if (gateway.ok) {
    // Success → complete the refund AND the return (restore stock, order RETURNED).
    await db().$transaction(async (tx: any) => {
      const orderItems = await tx.orderItem.findMany({
        where: { id: { in: row.items.map((i: any) => i.orderItemId).filter(Boolean) } },
        select: { id: true, productId: true },
      });
      const productByItem = new Map<string, string | null>(orderItems.map((o: any) => [o.id, o.productId]));
      await restoreStock(
        tx,
        row.items.map((i: any) => ({
          productId: i.orderItemId ? productByItem.get(i.orderItemId) : null,
          quantity: i.quantity,
        }))
      );
      await tx.order.update({
        where: { id: row.orderId },
        data: { paymentStatus: "REFUNDED" as any, status: "RETURNED" as any, returnedAt: new Date() },
      });
      await tx.returnRequest.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED" as any,
          refundStatus: "completed",
          refundId: gateway.refundId ?? null,
          refundProcessedAt: new Date(),
          refundedAt: new Date(),
          completedAt: new Date(),
          refundError: null,
          razorpayRefundPayload: (gateway.payload as any) ?? undefined,
          timeline: appendTimeline(row.timeline, [
            { code: "refund_initiated", label: "Refund initiated", actor },
            { code: "refund_completed", label: `Refund completed${gateway.refundId ? ` · ${gateway.refundId}` : ""}`, actor },
          ]) as any,
        },
      });
    });
    await writeReturnAudit(input.id, "refund_completed", actor, gateway.refundId, gateway.payload);
    notifyReverse(await loadReturnRow(input.id), "refund_completed");
    return { ok: true, status: "completed", refundId: gateway.refundId };
  }

  // Failure → leave it retryable and record the error.
  await db().returnRequest.update({
    where: { id: input.id },
    data: {
      refundStatus: "failed",
      refundError: gateway.message ?? "Refund failed",
      timeline: appendTimeline(row.timeline, [
        { code: "refund_failed", label: "Refund failed", actor, note: gateway.message },
      ]) as any,
    },
  });
  await writeReturnAudit(input.id, "refund_failed", actor, gateway.message, gateway.payload);
  notifyReverse(await loadReturnRow(input.id), "refund_failed");
  return { ok: false, status: "failed", message: gateway.message };
}

// ───────────────────────── COD refund collection ─────────────────────────

/** Customer submits UPI/bank payout details for a COD return. PII encrypted. */
export async function submitCodRefundDetails(input: {
  id: string;
  actorUserId?: string;
  actorEmail?: string;
  data: CodRefundInput;
}): Promise<ReturnRequest> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const row = await loadReturnRow(input.id);
  if (!row) throw new ReturnError("NOT_FOUND");

  // Only the owner may submit, and only for a COD return that's approved+.
  const owns =
    (input.actorUserId && row.userId === input.actorUserId) ||
    (input.actorEmail && (row.order?.email === input.actorEmail || row.order?.user?.email === input.actorEmail));
  if (!owns) throw new ReturnError("FORBIDDEN");
  if (isPrepaidOrder(row.order)) throw new ReturnError("NOT_COD");
  const cur = RETURN_STATUS_FROM_DB[row.status] ?? "requested";
  if (cur === "requested" || cur === "rejected") throw new ReturnError("NOT_APPROVED");

  const validation = validateCodRefundInput(input.data);
  if (!validation.ok) throw new ReturnError("INVALID_DETAILS:" + validation.error);

  const data: any = {
    refundStatus: "verification_pending",
    financeRemarks: null, // clear any prior rejection note
    // Reset previously stored method fields so switching methods is clean.
    upiIdEncrypted: null,
    bankAccountEncrypted: null,
    ifscCode: null,
    bankName: null,
  };

  if (input.data.method === "upi") {
    data.refundMethod = "upi";
    data.bankHolderName = input.data.holderName.trim();
    data.upiIdEncrypted = encrypt(input.data.upiId.trim());
  } else {
    data.refundMethod = "bank";
    data.bankHolderName = input.data.holderName.trim();
    data.bankAccountEncrypted = encrypt(
      JSON.stringify({ accountNumber: input.data.accountNumber.replace(/\s+/g, "") })
    );
    data.ifscCode = input.data.ifsc.trim().toUpperCase();
    data.bankName = input.data.bankName?.trim() || null;
  }
  data.timeline = appendTimeline(row.timeline, [
    { code: "cod_details_submitted", label: "Refund details submitted", actor: "customer" },
  ]);

  await db().returnRequest.update({ where: { id: input.id }, data });
  await writeReturnAudit(input.id, "cod_details_submitted", input.actorEmail ?? "customer", input.data.method);
  return mapReturnRequest(await loadReturnRow(input.id));
}

/** Admin/finance verifies or rejects submitted COD payout details. */
export async function reviewCodRefundDetails(input: {
  id: string;
  action: "verify" | "reject";
  remarks?: string;
  actor?: string;
}): Promise<ReturnRequest> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const actor = input.actor ?? "admin";
  const row = await loadReturnRow(input.id);
  if (!row) throw new ReturnError("NOT_FOUND");
  if (!row.upiIdEncrypted && !row.bankAccountEncrypted) throw new ReturnError("NO_COD_DETAILS");

  if (input.action === "verify") {
    await db().returnRequest.update({
      where: { id: input.id },
      data: {
        refundStatus: "verified",
        financeReviewedAt: new Date(),
        financeReviewedBy: actor,
        financeRemarks: input.remarks?.trim() || null,
        timeline: appendTimeline(row.timeline, [
          { code: "cod_verified", label: "Refund details verified", actor },
        ]) as any,
      },
    });
    await writeReturnAudit(input.id, "cod_verified", actor, input.remarks);
  } else {
    await db().returnRequest.update({
      where: { id: input.id },
      data: {
        refundStatus: "awaiting_details",
        financeReviewedAt: new Date(),
        financeReviewedBy: actor,
        financeRemarks: input.remarks?.trim() || "Details rejected — please resubmit.",
        // Wipe rejected PII so nothing invalid lingers at rest.
        upiIdEncrypted: null,
        bankAccountEncrypted: null,
        ifscCode: null,
        timeline: appendTimeline(row.timeline, [
          { code: "cod_rejected", label: "Refund details rejected", actor, note: input.remarks },
        ]) as any,
      },
    });
    await writeReturnAudit(input.id, "cod_rejected", actor, input.remarks);
  }
  return mapReturnRequest(await loadReturnRow(input.id));
}

/** Admin marks a COD refund paid out, with a transaction reference. */
export async function markCodRefundProcessed(input: {
  id: string;
  reference: string;
  remarks?: string;
  actor?: string;
}): Promise<ReturnRequest> {
  if (!isDbEnabled()) throw new ReturnError("DB_DISABLED");
  const actor = input.actor ?? "admin";
  const reference = input.reference?.trim();
  if (!reference) throw new ReturnError("REFERENCE_REQUIRED");
  const row = await loadReturnRow(input.id);
  if (!row) throw new ReturnError("NOT_FOUND");
  if (!row.warehouseReceivedAt) throw new ReturnError("WAREHOUSE_NOT_RECEIVED");
  if (row.refundStatus === "completed") return mapReturnRequest(row);

  await db().$transaction(async (tx: any) => {
    const orderItems = await tx.orderItem.findMany({
      where: { id: { in: row.items.map((i: any) => i.orderItemId).filter(Boolean) } },
      select: { id: true, productId: true },
    });
    const productByItem = new Map<string, string | null>(orderItems.map((o: any) => [o.id, o.productId]));
    await restoreStock(
      tx,
      row.items.map((i: any) => ({
        productId: i.orderItemId ? productByItem.get(i.orderItemId) : null,
        quantity: i.quantity,
      }))
    );
    await tx.order.update({
      where: { id: row.orderId },
      data: { status: "RETURNED" as any, returnedAt: new Date() },
    });
    await tx.returnRequest.update({
      where: { id: input.id },
      data: {
        status: "COMPLETED" as any,
        refundStatus: "completed",
        refundReference: reference,
        refundProcessedAt: new Date(),
        refundedAt: new Date(),
        completedAt: new Date(),
        financeRemarks: input.remarks?.trim() || row.financeRemarks,
        timeline: appendTimeline(row.timeline, [
          { code: "refund_completed", label: `Refund completed · ${reference}`, actor },
        ]) as any,
      },
    });
  });
  await writeReturnAudit(input.id, "refund_completed", actor, reference);
  notifyReverse(await loadReturnRow(input.id), "refund_completed");
  return mapReturnRequest(await loadReturnRow(input.id));
}

/** Look up a return by its reverse AWB (webhook routing). */
export async function getReturnByReverseAwb(awb: string): Promise<ReturnRequest | null> {
  if (!isDbEnabled() || !awb) return null;
  const row = await db().returnRequest.findFirst({
    where: { reverseAwb: awb },
    include: RETURN_REQUEST_INCLUDE,
  });
  return row ? mapReturnRequest(row) : null;
}

/**
 * Idempotency ledger for inbound webhooks. Returns true if this (source,eventId)
 * is NEW (caller should process it); false if it's a duplicate delivery.
 */
export async function recordWebhookEvent(
  source: string,
  eventId: string,
  payload?: unknown
): Promise<boolean> {
  if (!isDbEnabled()) return true; // no ledger available — process anyway
  try {
    await db().webhookEvent.create({
      data: { source, eventId, payload: (payload as any) ?? undefined },
    });
    return true;
  } catch (e: any) {
    if (e?.code === "P2002") return false; // already seen
    return true; // ledger hiccup — don't drop a real event
  }
}

/** Full audit trail for a return (admin drill-down). */
export async function getReturnAuditLog(returnRequestId: string) {
  if (!isDbEnabled()) return [];
  const rows = await db().returnAuditLog.findMany({
    where: { returnRequestId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actor: r.actor ?? undefined,
    detail: r.detail ?? undefined,
    at: r.createdAt.toISOString(),
  }));
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
