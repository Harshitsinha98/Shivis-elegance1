"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { QrCode } from "@/components/admin/qr-code";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { SITE } from "@/lib/constants";
import type { Order } from "@/types/order";

export function ShippingSlip({ order }: { order: Order }) {
  const a = order.shippingAddress;
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const codAmount = order.paymentStatus === "paid" ? 0 : order.total;

  useEffect(() => {
    // Give the QR a tick to render, then open the print dialog.
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mx-auto max-w-[560px] p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="font-display text-2xl text-obsidian">Shipping slip</h1>
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer size={14} /> Print
        </Button>
      </div>

      <div className="rounded-lg border-2 border-obsidian bg-white text-obsidian">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-obsidian px-5 py-3">
          <div>
            <p className="font-display text-xl tracking-[0.12em]">{SITE.name.toUpperCase()}</p>
            <p className="text-[11px] text-neutral-600">Prepaid &amp; Insured Jewellery</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Order</p>
            <p className="font-mono text-sm font-bold">{order.number}</p>
          </div>
        </div>

        {/* AWB + QR */}
        <div className="flex items-center justify-between border-b border-dashed border-neutral-400 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Courier</p>
            <p className="text-sm font-medium">{order.courier ?? "—"}</p>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-500">AWB</p>
            <p className="font-mono text-lg font-bold tracking-wider">{order.awb ?? "NOT ASSIGNED"}</p>
          </div>
          {order.awb && <QrCode value={order.awb} size={120} />}
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 border-b border-dashed border-neutral-400">
          <div className="border-r border-dashed border-neutral-400 px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Deliver to</p>
            <p className="mt-1 text-sm font-bold">{a.fullName}</p>
            <p className="text-xs leading-relaxed">
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
              {a.city}, {a.state} {a.postalCode}<br />
              {a.country}
            </p>
            {a.phone && <p className="mt-1 text-xs">Ph: {a.phone}</p>}
          </div>
          <div className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">From / Return</p>
            <p className="mt-1 text-sm font-bold">{SITE.name}</p>
            <p className="text-xs leading-relaxed">{SITE.address}</p>
            <p className="mt-1 text-xs">Ph: {SITE.phone}</p>
          </div>
        </div>

        {/* Items */}
        <div className="px-5 py-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-300 text-left uppercase tracking-wide text-neutral-500">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-b border-neutral-200">
                  <td className="py-1.5">{it.name}{it.variantLabel ? ` (${it.variantLabel})` : ""}</td>
                  <td className="py-1.5 text-center">{it.quantity}</td>
                  <td className="py-1.5 text-right">{formatPrice(it.unitPrice * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment footer */}
        <div className="flex items-center justify-between border-t-2 border-obsidian px-5 py-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              {order.paymentProvider === "cod" ? "Cash on Delivery" : "Prepaid"}
            </p>
            <p className="font-bold">
              {codAmount > 0 ? `COLLECT ${formatPrice(codAmount)}` : "PAID — do not collect"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">{totalQty} item{totalQty > 1 ? "s" : ""} · Total</p>
            <p className="font-display text-lg">{formatPrice(order.total)}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] text-neutral-400 print:hidden">
        Handle with care · Insured shipment · {SITE.name}
      </p>
    </div>
  );
}
