"use client";

import { useMemo, useState } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  searchable = true,
  searchKeys,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const filtered = useMemo(() => {
    let list = rows;
    if (q && searchKeys) {
      const term = q.toLowerCase();
      list = list.filter((r) =>
        searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(term))
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        list = [...list].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          return av > bv ? sort.dir : av < bv ? -sort.dir : 0;
        });
      }
    }
    return list;
  }, [rows, q, sort, columns, searchKeys]);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }
    );

  return (
    <div>
      {searchable && (
        <div className="relative mb-4 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-border bg-pearl py-2.5 pl-9 pr-3 text-sm focus:border-champagne focus:outline-none"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-pearl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-warm-gray">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                  {c.sortValue ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-obsidian"
                    >
                      {c.header}
                      {sort?.key === c.key &&
                        (sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-warm-gray">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-beige/40">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-warm-gray">{filtered.length} of {rows.length} records</p>
    </div>
  );
}
