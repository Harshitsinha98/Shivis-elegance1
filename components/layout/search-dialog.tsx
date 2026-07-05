"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";
import { PRODUCTS } from "@/lib/mock-data";
import { useUiStore } from "@/store/ui-store";

export function SearchDialog() {
  const { searchOpen, closeSearch } = useUiStore();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const term = q.toLowerCase();
    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.tagline.toLowerCase().includes(term) ||
        p.tags.some((t) => t.includes(term))
    ).slice(0, 6);
  }, [q]);

  return (
    <Dialog open={searchOpen} onClose={closeSearch} className="max-w-xl">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Search size={20} className="text-warm-gray" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search rings, necklaces, diamonds…"
          className="flex-1 bg-transparent text-lg text-obsidian placeholder:text-warm-gray/60 focus:outline-none"
        />
      </div>

      <div className="mt-4 max-h-80 overflow-y-auto">
        {q && results.length === 0 && (
          <p className="py-8 text-center text-sm text-warm-gray">
            No matches for “{q}”.
          </p>
        )}
        <ul className="space-y-1">
          {results.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.slug}`}
                onClick={closeSearch}
                className="flex items-center gap-4 rounded-lg p-2 transition hover:bg-beige"
              >
                <img src={p.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <span className="flex-1">
                  <span className="block font-display text-lg text-obsidian">{p.name}</span>
                  <span className="block text-xs text-warm-gray">{p.tagline}</span>
                </span>
                <span className="text-sm text-obsidian">{formatPrice(p.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {!q && (
          <div className="flex flex-wrap gap-2 pt-2">
            {["Diamond rings", "Gold bangles", "Emerald", "Bridal", "Studs"].map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-warm-gray hover:border-champagne hover:text-obsidian"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
