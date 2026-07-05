"use client";

import { useMemo, useState, useCallback } from "react";
import type { Product } from "@/types/product";

export interface Filters {
  categories: string[];
  metals: string[];
  gemstones: string[];
  maxPrice: number | null;
  sort: string;
  q: string;
}

const EMPTY: Filters = {
  categories: [],
  metals: [],
  gemstones: [],
  maxPrice: null,
  sort: "featured",
  q: "",
};

/** Client-side filtering + sorting over an in-memory product list. */
export function useProductFilters(products: Product[], initial?: Partial<Filters>) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, ...initial });

  const toggleIn = useCallback(
    (key: "categories" | "metals" | "gemstones", value: string) => {
      setFilters((f) => {
        const set = new Set(f[key]);
        set.has(value) ? set.delete(value) : set.add(value);
        return { ...f, [key]: [...set] };
      });
    },
    []
  );

  const setField = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) =>
      setFilters((f) => ({ ...f, [key]: value })),
    []
  );

  const reset = useCallback(() => setFilters({ ...EMPTY, ...initial }), [initial]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (filters.categories.length && !filters.categories.includes(p.category))
        return false;
      if (filters.metals.length && !filters.metals.includes(p.metal)) return false;
      if (filters.gemstones.length && !filters.gemstones.includes(p.gemstone))
        return false;
      if (filters.maxPrice != null && p.price > filters.maxPrice) return false;
      if (filters.q) {
        const term = filters.q.toLowerCase();
        if (
          !p.name.toLowerCase().includes(term) &&
          !p.tagline.toLowerCase().includes(term) &&
          !p.tags.some((t) => t.includes(term))
        )
          return false;
      }
      return true;
    });

    switch (filters.sort) {
      case "newest":
        list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      default:
        list = [...list].sort(
          (a, b) => Number(!!b.isBestSeller) - Number(!!a.isBestSeller)
        );
    }
    return list;
  }, [products, filters]);

  const activeCount =
    filters.categories.length +
    filters.metals.length +
    filters.gemstones.length +
    (filters.maxPrice != null ? 1 : 0);

  return { filters, filtered, toggleIn, setField, reset, activeCount };
}
