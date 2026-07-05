"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setStockAction } from "@/lib/admin/actions";
import type { Product } from "@/types/product";

const LOW_STOCK = 6;

function RestockCell({ product }: { product: Product }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(product.stock));
  const [pending, startTransition] = useTransition();

  const save = () => {
    const next = Number(value);
    if (Number.isNaN(next) || next < 0) return;
    startTransition(async () => {
      const res = await setStockAction(product.id, next);
      if (!res.ok) alert(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => { setValue(String(product.stock)); setEditing(true); }}>
        Restock
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="w-20 rounded-lg border border-border bg-pearl px-2 py-1.5 text-sm focus:border-champagne focus:outline-none"
      />
      <button onClick={save} disabled={pending} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-green-600 hover:bg-green-50 disabled:opacity-40" aria-label="Save">
        <Check size={15} />
      </button>
      <button onClick={() => setEditing(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-warm-gray hover:bg-beige" aria-label="Cancel">
        <X size={15} />
      </button>
    </div>
  );
}

export function InventoryTable({ products }: { products: Product[] }) {
  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3">
          <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <span className="font-medium text-obsidian">{p.name}</span>
        </div>
      ),
    },
    { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-xs text-warm-gray">{p.sku ?? "—"}</span> },
    { key: "weight", header: "Weight", render: (p) => `${p.weightGrams} g` },
    {
      key: "stock",
      header: "In stock",
      sortValue: (p) => p.stock,
      render: (p) => (
        <span className="flex items-center gap-2">
          <span className={p.stock <= LOW_STOCK ? "text-red-500" : "text-obsidian"}>{p.stock}</span>
          {p.stock <= LOW_STOCK && <Badge tone="danger">Low</Badge>}
        </span>
      ),
    },
    {
      key: "restock",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex items-center justify-end gap-4">
          <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-champagne-dark hover:underline">
            Edit
          </Link>
          <RestockCell product={p} />
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} rows={products} searchKeys={["name"]} />;
}
