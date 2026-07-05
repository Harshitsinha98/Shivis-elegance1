"use client";

import { formatPrice, initials } from "@/lib/utils";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
  tier: "New" | "Silver" | "Gold" | "Platinum";
}

const TIER_TONE = { New: "muted", Silver: "outline", Gold: "gold", Platinum: "dark" } as const;

const columns: Column<CustomerRow>[] = [
  {
    key: "name",
    header: "Customer",
    sortValue: (c) => c.name,
    render: (c) => (
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-champagne/20 text-xs font-medium text-champagne-dark">
          {initials(c.name)}
        </span>
        <div>
          <p className="font-medium text-obsidian">{c.name}</p>
          <p className="text-xs text-warm-gray">{c.email}</p>
        </div>
      </div>
    ),
  },
  { key: "orders", header: "Orders", sortValue: (c) => c.orders },
  { key: "spent", header: "Lifetime spend", sortValue: (c) => c.spent, render: (c) => formatPrice(c.spent) },
  { key: "tier", header: "Tier", render: (c) => <Badge tone={TIER_TONE[c.tier]}>{c.tier}</Badge> },
];

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={customers}
      searchKeys={["name", "email"]}
      emptyMessage="No customers yet."
    />
  );
}
