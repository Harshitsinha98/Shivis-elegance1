import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageSearch, MapPin, Truck } from "lucide-react";
import { getOrderByAwb } from "@/lib/db/repo";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderTimeline } from "@/components/admin/prder-timeline";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ awb: string }>;
}) {
  const { awb } = await params;
  return { title: `Track ${awb}` };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ awb: string }>;
}) {
  const { awb } = await params;
  const order = await getOrderByAwb(decodeURIComponent(awb));

  if (!order) {
    return (
      <>
        <PageHeader
          eyebrow="Shipment tracking"
          title="Tracking"
          crumbs={[{ label: "Home", href: "/" }, { label: "Track" }]}
        />
        <section className="container-luxe py-16">
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-pearl p-10 text-center">
            <PackageSearch size={32} className="mx-auto text-champagne-dark" />
            <h2 className="mt-4 font-display text-2xl text-obsidian">
              No shipment found
            </h2>
            <p className="mt-2 text-warm-gray">
              We couldn&apos;t find a shipment for{" "}
              <span className="font-mono text-obsidian">{awb}</span>. Please check
              the number, or contact our concierge.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-block text-sm text-champagne-dark hover:underline"
            >
              Contact Concierge →
            </Link>
          </div>
        </section>
      </>
    );
  }

  const address = order.shippingAddress;

  return (
    <>
      <PageHeader
        eyebrow="Shipment tracking"
        title={`Order ${order.number}`}
        subtitle={`Placed ${formatDate(order.createdAt)}`}
        crumbs={[{ label: "Home", href: "/" }, { label: "Track" }]}
      />

      <section className="container-luxe grid gap-10 py-16 md:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          {/* Courier summary */}
          <div className="rounded-2xl border border-border bg-pearl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Truck className="text-champagne-dark" size={22} />
                <div>
                  <p className="font-medium text-obsidian">
                    {order.courier ?? "In transit"}
                  </p>
                  <p className="font-mono text-sm text-warm-gray">
                    AWB {order.awb ?? order.trackingNumber}
                  </p>
                </div>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-border bg-pearl p-6">
            <h2 className="mb-4 font-display text-xl text-obsidian">In this shipment</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="font-display text-lg text-obsidian hover:text-champagne-dark"
                    >
                      {item.name}
                    </Link>
                    {item.variantLabel && (
                      <p className="text-xs text-warm-gray">{item.variantLabel}</p>
                    )}
                    <p className="text-sm text-warm-gray">Qty {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery address */}
          <div className="rounded-2xl border border-border bg-pearl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl text-obsidian">
              <MapPin size={18} className="text-champagne-dark" /> Delivering to
            </h2>
            <address className="not-italic text-sm leading-relaxed text-elegant-gray">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 ? (
                <>
                  <br />
                  {address.line2}
                </>
              ) : null}
              <br />
              {address.city}, {address.state} {address.postalCode}
              <br />
              {address.country}
            </address>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.14em] text-warm-gray">
            Progress
          </p>
          <OrderTimeline events={order.timeline} />
        </div>
      </section>
    </>
  );
}
