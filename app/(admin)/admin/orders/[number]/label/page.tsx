import { notFound } from "next/navigation";
import { getOrderByNumber, assignAwbToOrder } from "@/lib/db/repo";
import { ShippingSlip } from "./shipping-slip";

export const metadata = { title: "Shipping slip" };
export const dynamic = "force-dynamic";

export default async function OrderLabelPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const decoded = decodeURIComponent(number);
  let order = await getOrderByNumber(decoded);
  if (!order) notFound();

  // A slip without an AWB is useless — mint one on the fly.
  if (!order.awb) {
    order = (await assignAwbToOrder(decoded).catch(() => null)) ?? order;
  }

  return <ShippingSlip order={order} />;
}
