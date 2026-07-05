"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Check, AlertCircle, Plus, Trash2, Printer } from "lucide-react";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/admin/qr-code";
import { CATEGORIES, METALS, GEMSTONES } from "@/lib/constants";
import { saveProductAction, type ActionResult } from "@/lib/admin/actions";
import type { Product, Collection } from "@/types/product";

interface VariantRow {
  label: string;
  value: string;
  priceDelta: number | string; // major ₹
  stock: number | string;
}

export function ProductForm({
  product,
  collections = [],
}: {
  product?: Product;
  collections?: Collection[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<{ slug: string }> | null, FormData>(
    saveProductAction,
    null
  );

  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants?.map((v) => ({
      label: v.label,
      value: v.value,
      priceDelta: v.priceDelta / 100,
      stock: v.stock,
    })) ?? []
  );

  useEffect(() => {
    if (state?.ok) {
      router.push("/admin/products");
      router.refresh();
    }
  }, [state, router]);

  const addVariant = () =>
    setVariants((v) => [...v, { label: "Size", value: "", priceDelta: 0, stock: 0 }]);
  const removeVariant = (i: number) =>
    setVariants((v) => v.filter((_, idx) => idx !== i));
  const setVariant = (i: number, key: keyof VariantRow, val: string) =>
    setVariants((v) => v.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));

  const printLabel = async () => {
    const sku = product?.sku;
    if (!sku) return;
    const dataUrl = await QRCode.toDataURL(sku, { width: 320, margin: 1 });
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`
      <html><head><title>${sku}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:32px}
      img{width:260px;height:260px}h2{margin:8px 0 2px;font-size:18px}p{margin:0;color:#555;font-size:13px}
      .sku{font-family:monospace;font-size:16px;margin-top:8px;letter-spacing:1px}</style></head>
      <body>
        <img src="${dataUrl}" alt="${sku}" />
        <h2>${product?.name ?? ""}</h2>
        <p>${product?.category ?? ""}</p>
        <p class="sku">${sku}</p>
        <script>window.onload=()=>{window.print()}</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-border bg-pearl p-6">
          <h3 className="mb-4 font-display text-xl text-obsidian">Details</h3>
          <div className="space-y-4">
            <Input label="Product name" name="name" defaultValue={product?.name ?? ""} required />
            <Input label="Tagline" name="tagline" defaultValue={product?.tagline ?? ""} />
            <Textarea label="Description" name="description" defaultValue={product?.description ?? ""} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-pearl p-6">
          <h3 className="mb-4 font-display text-xl text-obsidian">Specification</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" name="category" defaultValue={product?.category ?? "rings"}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </Select>
            <Select label="Metal" name="metal" defaultValue={product?.metal ?? "yellow-gold"}>
              {METALS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
            <Select label="Gemstone" name="gemstone" defaultValue={product?.gemstone ?? "diamond"}>
              {GEMSTONES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
            <Input label="Purity" name="purity" defaultValue={product?.purity ?? "18K"} />
            <Input label="Weight (g)" name="weightGrams" type="number" step="0.01" defaultValue={product?.weightGrams ?? 0} />
            <Input label="Tags (comma separated)" name="tags" defaultValue={product?.tags?.join(", ") ?? ""} />
          </div>
          <div className="mt-4 flex gap-6">
            <label className="flex items-center gap-2 text-sm text-elegant-gray">
              <input type="checkbox" name="isNew" defaultChecked={product?.isNew} className="accent-champagne" />
              New arrival
            </label>
            <label className="flex items-center gap-2 text-sm text-elegant-gray">
              <input type="checkbox" name="isBestSeller" defaultChecked={product?.isBestSeller} className="accent-champagne" />
              Best seller
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-pearl p-6">
          <h3 className="mb-4 font-display text-xl text-obsidian">Collections</h3>
          <p className="mb-3 text-xs text-warm-gray">
            Used for collection pages and browse filters — pick any that apply.
          </p>
          {collections.length === 0 ? (
            <p className="text-sm text-warm-gray">No collections yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {collections.map((c) => (
                <label key={c.slug} className="flex items-center gap-2 text-sm text-elegant-gray">
                  <input
                    type="checkbox"
                    name="collections"
                    value={c.slug}
                    defaultChecked={product?.collectionSlugs?.includes(c.slug)}
                    className="accent-champagne"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Variants / sizes */}
        <div className="rounded-xl border border-border bg-pearl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-obsidian">Sizes &amp; variants</h3>
              <p className="text-xs text-warm-gray">e.g. ring sizes, chain lengths — with their own stock</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus size={14} /> Add
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-warm-gray">No variants — this product is sold as a single option.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_auto] gap-2 text-[10px] uppercase tracking-[0.1em] text-warm-gray">
                <span>Type</span><span>Value</span><span>Price +₹</span><span>Stock</span><span />
              </div>
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_0.8fr_auto] items-center gap-2">
                  <input value={v.label} onChange={(e) => setVariant(i, "label", e.target.value)} placeholder="Size" className="rounded-lg border border-border bg-ivory px-3 py-2 text-sm focus:border-champagne focus:outline-none" />
                  <input value={v.value} onChange={(e) => setVariant(i, "value", e.target.value)} placeholder="7 / 16in" className="rounded-lg border border-border bg-ivory px-3 py-2 text-sm focus:border-champagne focus:outline-none" />
                  <input type="number" value={v.priceDelta} onChange={(e) => setVariant(i, "priceDelta", e.target.value)} className="rounded-lg border border-border bg-ivory px-3 py-2 text-sm focus:border-champagne focus:outline-none" />
                  <input type="number" value={v.stock} onChange={(e) => setVariant(i, "stock", e.target.value)} className="rounded-lg border border-border bg-ivory px-3 py-2 text-sm focus:border-champagne focus:outline-none" />
                  <button type="button" onClick={() => removeVariant(i)} className="grid h-9 w-9 place-items-center rounded-lg text-red-500 hover:bg-red-50" aria-label="Remove variant">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-pearl p-6">
          <h3 className="mb-4 font-display text-xl text-obsidian">Pricing &amp; stock</h3>
          <div className="space-y-4">
            <Input label="Price (₹)" name="price" type="number" step="0.01" defaultValue={product ? product.price / 100 : ""} required />
            <Input label="Compare-at price (₹)" name="compareAtPrice" type="number" step="0.01" defaultValue={product?.compareAtPrice ? product.compareAtPrice / 100 : ""} />
            <Input label="Stock" name="stock" type="number" defaultValue={product?.stock ?? 0} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-pearl p-6">
          <h3 className="mb-4 font-display text-xl text-obsidian">SKU &amp; QR label</h3>
          <Input
            label="SKU"
            name="sku"
            defaultValue={product?.sku ?? ""}
            placeholder="Auto-generated if blank"
          />
          {product?.sku && (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-ivory p-4">
              <QrCode value={product.sku} size={140} />
              <p className="font-mono text-sm text-obsidian">{product.sku}</p>
              <Button type="button" variant="outline" size="sm" onClick={printLabel}>
                <Printer size={14} /> Print label
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-pearl p-6">
          <h3 className="mb-4 font-display text-xl text-obsidian">Media</h3>
          <Textarea label="Image URLs (one per line)" name="images" defaultValue={product?.images?.join("\n") ?? ""} placeholder="https://…" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(product?.images ?? []).slice(0, 3).map((src, i) => (
              <img key={i} src={src} alt="" className="aspect-square rounded-lg object-cover" />
            ))}
          </div>
        </div>

        {state && !state.ok && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} /> {state.error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Saving…" : state?.ok ? (<><Check size={16} /> Saved</>) : product ? "Update product" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
