"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils";
import { DataTable, type Column } from "@/components/admin/data-table";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/order-status-badge";
import { updateOrderStatusAction } from "@/lib/admin/actions";
import type { Order, OrderStatus } from "@/types/order";

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

function StatusControl({ order }: { order: Order }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (status: OrderStatus) => {
    if (status === order.status) return;
    let tracking: string | undefined;
    if (status === "shipped") {
      tracking = window.prompt("Tracking number (optional):", order.trackingNumber ?? "") ?? undefined;
    }
    startTransition(async () => {
      const res = await updateOrderStatusAction(order.number, status, tracking);
      if (!res.ok) alert(res.error);
      else {
        if (res.data?.shiprocketCancel && !res.data.shiprocketCancel.ok) {
          alert(`Order cancelled locally. ${res.data.shiprocketCancel.message ?? ""}`);
        }
        router.refresh();
      }
    });
  };

  return (
    <select
      value={order.status}
      disabled={pending}
      onChange={(e) => change(e.target.value as OrderStatus)}
      className="rounded-lg border border-border bg-pearl px-2 py-1.5 text-xs capitalize focus:border-champagne focus:outline-none disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

const columns: Column<Order>[] = [
  {
    key: "number",
    header: "Order",
    sortValue: (o) => o.number,
    render: (o) => (
      <Link href={`/admin/orders/${o.number}`} className="font-medium text-obsidian hover:text-champagne-dark hover:underline">
        {o.number}
      </Link>
    ),
  },
  { key: "customer", header: "Customer", render: (o) => o.shippingAddress.fullName },
  { key: "date", header: "Date", sortValue: (o) => o.createdAt, render: (o) => formatDate(o.createdAt) },
  { key: "awb", header: "AWB", render: (o) => o.awb ? <span className="font-mono text-xs text-elegant-gray">{o.awb}</span> : <span className="text-warm-gray">—</span> },
  { key: "payment", header: "Payment", render: (o) => <PaymentStatusBadge status={o.paymentStatus} /> },
  { key: "status", header: "Status", render: (o) => <OrderStatusBadge status={o.status} /> },
  { key: "total", header: "Total", sortValue: (o) => o.total, render: (o) => formatPrice(o.total) },
  { key: "manage", header: "Update", className: "text-right", render: (o) => <div className="flex justify-end"><StatusControl order={o} /></div> },
];

export function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <DataTable
      columns={columns}
      rows={orders}
      searchKeys={["number"]}
      emptyMessage="No orders yet."
    />
  );
}
