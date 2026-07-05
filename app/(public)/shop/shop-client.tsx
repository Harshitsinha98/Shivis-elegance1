"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PRODUCTS } from "@/lib/mock-data";
import { SORT_OPTIONS } from "@/lib/constants";
import { useProductFilters } from "@/hooks/use-product-filters";
import { ProductFilters } from "@/components/product/product-filters";
import { ProductGrid } from "@/components/product/product-grid";
import { Select } from "@/components/ui/input";

export function ShopClient() {
  const params = useSearchParams();
  const category = params.get("category") ?? undefined;
  const q = params.get("q") ?? undefined;

  const { filters, filtered, toggleIn, setField, reset, activeCount } = useProductFilters(
    PRODUCTS,
    { categories: category ? [category] : [], q: q ?? "" }
  );

  // useProductFilters only reads its `initial` filters on first mount, so
  // navigating between category/search links while already on /shop (no
  // remount) left the previous filter applied. Re-sync when the URL changes.
  useEffect(() => {
    setField("categories", category ? [category] : []);
  }, [category, setField]);

  useEffect(() => {
    setField("q", q ?? "");
  }, [q, setField]);

  return (
    <div className="container-luxe grid gap-10 py-14 lg:grid-cols-[240px_1fr]">
      <ProductFilters
        filters={filters}
        activeCount={activeCount}
        toggleIn={toggleIn}
        setField={setField}
        reset={reset}
      />

      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-warm-gray">
            {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
          </p>
          <div className="w-52">
            <Select
              value={filters.sort}
              onChange={(e) => setField("sort", e.target.value)}
              aria-label="Sort"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <ProductGrid products={filtered} />
      </div>
    </div>
  );
}
