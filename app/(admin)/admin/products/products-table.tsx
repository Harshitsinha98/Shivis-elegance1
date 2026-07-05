"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { deleteProductAction } from "@/lib/admin/actions";
import type { Product } from "@/types/product";

export function ProductsTable({ products }: { products: Product[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = (p: Product) => {
    if (!confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
    setBusyId(p.id);
    startTransition(async () => {
      const res = await deleteProductAction(p.id);
      setBusyId(null);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3">
          <img src={p.images[0]} alt="" className="h-11 w-11 rounded-lg object-cover" />
          <div>
            <p className="font-medium text-obsidian">{p.name}</p>
            <p className="text-xs capitalize text-warm-gray">{p.category}</p>
          </div>
        </div>
      ),
    },
    { key: "metal", header: "Metal", render: (p) => <span className="capitalize">{p.metal.replace("-", " ")}</span> },
    { key: "price", header: "Price", sortValue: (p) => p.price, render: (p) => formatPrice(p.price) },
    {
      key: "stock",
      header: "Stock",
      sortValue: (p) => p.stock,
      render: (p) =>
        p.stock <= 6 ? (
          <Badge tone="danger">{p.stock} left</Badge>
        ) : (
          <span className="text-elegant-gray">{p.stock}</span>
        ),
    },
    { key: "rating", header: "Rating", sortValue: (p) => p.rating, render: (p) => `${p.rating.toFixed(1)} ★` },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex items-center justify-end gap-3">
          <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-champagne-dark hover:underline">
            Edit
          </Link>
          <button
            onClick={() => remove(p)}
            disabled={pending && busyId === p.id}
            className="text-red-500 hover:text-red-600 disabled:opacity-40"
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={products}
      searchKeys={["name", "category"]}
      emptyMessage="No products yet — add your first one."
    />
  );
}
