"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, METALS, GEMSTONES } from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Filters } from "@/hooks/use-product-filters";

interface Props {
  filters: Filters;
  activeCount: number;
  toggleIn: (key: "categories" | "metals" | "gemstones", value: string) => void;
  setField: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  reset: () => void;
}

const MAX = 100000000; // ₹10,00,000

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-6">
      <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-obsidian">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1 text-sm text-warm-gray transition hover:text-obsidian">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded border transition",
          checked ? "border-champagne bg-champagne" : "border-border"
        )}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-sm bg-obsidian" />}
      </span>
      {label}
    </label>
  );
}

function Panel({ filters, activeCount, toggleIn, setField, reset }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-medium text-obsidian">Filters</span>
        {activeCount > 0 && (
          <button onClick={reset} className="text-xs text-champagne-dark hover:underline">
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <Section title="Category">
        {CATEGORIES.map((c) => (
          <Checkbox
            key={c.slug}
            label={c.name}
            checked={filters.categories.includes(c.slug)}
            onChange={() => toggleIn("categories", c.slug)}
          />
        ))}
      </Section>

      <Section title="Metal">
        {METALS.map((m) => (
          <Checkbox
            key={m.value}
            label={m.label}
            checked={filters.metals.includes(m.value)}
            onChange={() => toggleIn("metals", m.value)}
          />
        ))}
      </Section>

      <Section title="Gemstone">
        {GEMSTONES.map((g) => (
          <Checkbox
            key={g.value}
            label={g.label}
            checked={filters.gemstones.includes(g.value)}
            onChange={() => toggleIn("gemstones", g.value)}
          />
        ))}
      </Section>

      <Section title="Max Price">
        <input
          type="range"
          min={500000}
          max={MAX}
          step={500000}
          value={filters.maxPrice ?? MAX}
          onChange={(e) => setField("maxPrice", Number(e.target.value))}
          className="w-full accent-[var(--color-champagne)]"
        />
        <div className="mt-2 flex justify-between text-xs text-warm-gray">
          <span>₹5k</span>
          <span className="text-obsidian">
            Up to {formatPrice(filters.maxPrice ?? MAX)}
          </span>
        </div>
      </Section>
    </div>
  );
}

export function ProductFilters(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <Panel {...props} />
      </aside>

      {/* Mobile trigger */}
      <div className="lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal size={15} /> Filters
          {props.activeCount > 0 && ` (${props.activeCount})`}
        </Button>
        {open && (
          <div className="fixed inset-0 z-[90]">
            <div className="absolute inset-0 bg-obsidian/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85%] overflow-y-auto bg-ivory p-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-xl">Filters</span>
                <button onClick={() => setOpen(false)} aria-label="Close">
                  <X size={22} />
                </button>
              </div>
              <Panel {...props} />
              <Button fullWidth className="mt-6" onClick={() => setOpen(false)}>
                Show results
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
