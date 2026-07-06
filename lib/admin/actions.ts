"use server";

/**
 * Admin mutations, exposed as Next.js Server Actions.
 *
 * Every action re-checks the caller is an admin (never trust the client) and
 * revalidates the affected admin routes so the tables reflect changes on the
 * next render. All of these hit the real database via `lib/db/repo`.
 */
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/auth";
import * as repo from "@/lib/db/repo";
import type { CategorySlug, Metal, Gemstone } from "@/types/product";
import type { OrderStatus } from "@/types/order";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function assertAdmin(): Promise<{ ok: false; error: string } | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorised" };
  }
  return null;
}

function toPaise(major: number): number {
  return Math.round(Number(major) * 100);
}

/**
 * Revalidate the public storefront after a catalogue change. The storefront now
 * reads live from the DB, so every page that shows products must be purged for
 * an admin edit to appear without waiting for the ISR window.
 */
function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/new-arrivals");
  revalidatePath("/best-sellers");
  revalidatePath("/offers");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/products/[slug]", "page");
}

// ──────────────────────────── products ────────────────────────────

export async function saveProductAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ slug: string }>> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const id = (formData.get("id") as string) || "";
  const name = (formData.get("name") as string)?.trim();
  const priceMajor = Number(formData.get("price"));

  if (!name) return { ok: false, error: "Product name is required" };
  if (!priceMajor || priceMajor <= 0)
    return { ok: false, error: "A valid price is required" };

  const images = (formData.get("images") as string)
    ?.split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = (formData.get("tags") as string)
    ?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Variants arrive as a JSON array string from the form's variants editor.
  let variants: repo.VariantInput[] | undefined;
  const variantsRaw = formData.get("variants") as string | null;
  if (variantsRaw) {
    try {
      const parsed = JSON.parse(variantsRaw) as any[];
      variants = parsed
        .filter((v) => v && String(v.label).trim() && String(v.value).trim())
        .map((v) => ({
          label: String(v.label).trim(),
          value: String(v.value).trim(),
          priceDelta: toPaise(Number(v.priceDelta) || 0),
          stock: Math.max(0, Math.round(Number(v.stock) || 0)),
        }));
    } catch {
      /* ignore malformed variant JSON */
    }
  }

  const compareMajor = Number(formData.get("compareAtPrice"));

  const input = {
    name,
    sku: ((formData.get("sku") as string) || "").trim() || undefined,
    tagline: (formData.get("tagline") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    price: toPaise(priceMajor),
    compareAtPrice: compareMajor > 0 ? toPaise(compareMajor) : undefined,
    category: (formData.get("category") as CategorySlug) ?? "rings",
    metal: (formData.get("metal") as Metal) ?? "yellow-gold",
    gemstone: (formData.get("gemstone") as Gemstone) ?? "diamond",
    purity: (formData.get("purity") as string) || "18K",
    weightGrams: Number(formData.get("weightGrams")) || 0,
    stock: Math.max(0, Math.round(Number(formData.get("stock")) || 0)),
    images: images?.length ? images : undefined,
    tags: tags?.length ? tags : undefined,
    isNew: formData.get("isNew") === "on",
    isBestSeller: formData.get("isBestSeller") === "on",
    variants,
    collectionSlugs: formData.getAll("collections") as string[],
  };

  try {
    const product = id
      ? await repo.updateProduct(id, input)
      : await repo.createProduct(input);
    if (!product) return { ok: false, error: "Database not available" };
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    revalidateStorefront();
    return { ok: true, data: { slug: product.slug } };
  } catch (e: any) {
    return {
      ok: false,
      error:
        e?.code === "P2002"
          ? "A product with that name/slug already exists"
          : "Could not save product",
    };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    await repo.deleteProduct(id);
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidateStorefront();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete product" };
  }
}

export async function setStockAction(
  id: string,
  stock: number
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    await repo.setProductStock(id, stock);
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    revalidateStorefront();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update stock" };
  }
}

// ───────────────────────────── orders ─────────────────────────────

export async function updateOrderStatusAction(
  number: string,
  status: OrderStatus,
  trackingNumber?: string
): Promise<ActionResult<{ shiprocketCancel?: { ok: boolean; message?: string } }>> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    const { shiprocketCancel } = await repo.updateOrderStatus(
      number,
      status,
      trackingNumber || undefined
    );
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${number}`);
    revalidatePath("/admin");
    return { ok: true, data: { shiprocketCancel } };
  } catch {
    return { ok: false, error: "Could not update order" };
  }
}

/** Generate (or re-generate) the AWB + shipping label for an order. */
export async function generateAwbAction(
  number: string,
  force = false
): Promise<ActionResult<{ awb?: string; courier?: string }>> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    const order = await repo.assignAwbToOrder(number, { force });
    if (!order) return { ok: false, error: "Order not found or DB unavailable" };
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${number}`);
    return { ok: true, data: { awb: order.awb, courier: order.courier } };
  } catch {
    return { ok: false, error: "Could not generate AWB" };
  }
}

// ───────────────────────── scan / quick stock ──────────────────────

export async function scanAddStockAction(
  sku: string,
  quantity: number,
  mode: "add" | "set" = "add"
): Promise<ActionResult<{ name: string; stock: number }>> {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!sku?.trim()) return { ok: false, error: "SKU is required" };
  const qty = Math.round(Number(quantity));
  if (Number.isNaN(qty) || qty < 0) return { ok: false, error: "Invalid quantity" };
  try {
    const product = await repo.adjustStockBySku(sku, qty, mode);
    if (!product) return { ok: false, error: `No product found for SKU “${sku}”` };
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    revalidateStorefront();
    return { ok: true, data: { name: product.name, stock: product.stock } };
  } catch {
    return { ok: false, error: "Could not update stock" };
  }
}

// ───────────────────────────── coupons ─────────────────────────────

export async function createCouponAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const type = (formData.get("type") as "percentage" | "fixed") ?? "percentage";
  const valueMajor = Number(formData.get("value"));
  if (!code) return { ok: false, error: "Coupon code is required" };
  if (!valueMajor || valueMajor <= 0)
    return { ok: false, error: "A valid value is required" };

  const minMajor = Number(formData.get("minSubtotal"));
  try {
    await repo.createCoupon({
      code,
      description: (formData.get("description") as string) || "",
      type,
      // percentage stored as-is; fixed amounts stored in paise
      value: type === "fixed" ? toPaise(valueMajor) : Math.round(valueMajor),
      minSubtotal: minMajor > 0 ? toPaise(minMajor) : undefined,
      active: true,
    });
    revalidatePath("/admin/coupons");
    revalidatePath("/offers");
    return { ok: true };
  } catch (e: any) {
    return {
      ok: false,
      error:
        e?.code === "P2002"
          ? "That coupon code already exists"
          : "Could not create coupon",
    };
  }
}

export async function toggleCouponAction(
  code: string,
  active: boolean
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    await repo.setCouponActive(code, active);
    revalidatePath("/admin/coupons");
    revalidatePath("/offers");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update coupon" };
  }
}

export async function deleteCouponAction(code: string): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    await repo.deleteCoupon(code);
    revalidatePath("/admin/coupons");
    revalidatePath("/offers");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete coupon" };
  }
}

// ───────────────────────────── reviews ─────────────────────────────

export async function approveReviewAction(id: string): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    await repo.setReviewApproved(id, true);
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not approve review" };
  }
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return denied;
  try {
    await repo.deleteReview(id);
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete review" };
  }
}
