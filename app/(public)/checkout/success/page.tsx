import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Package, Mail } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Order Confirmed" };

function SuccessInner({ order }: { order: string }) {
  return (
    <div className="container-luxe grid min-h-[70vh] place-items-center py-20">
      <div className="max-w-lg text-center">
        <CheckCircle2 size={56} className="mx-auto text-champagne" />
        <h1 className="mt-6 font-display text-4xl text-obsidian md:text-5xl">
          Thank you for your order
        </h1>
        <p className="mt-3 text-warm-gray">
          Your order <span className="font-medium text-obsidian">{order}</span> is confirmed.
          A receipt is on its way to your inbox.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-pearl p-6 text-left">
            <Mail className="text-champagne-dark" size={22} />
            <h3 className="mt-3 font-display text-lg text-obsidian">Confirmation sent</h3>
            <p className="mt-1 text-sm text-warm-gray">
              Check your email for order details and your certificate of authenticity.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-pearl p-6 text-left">
            <Package className="text-champagne-dark" size={22} />
            <h3 className="mt-3 font-display text-lg text-obsidian">Crafted & shipped</h3>
            <p className="mt-1 text-sm text-warm-gray">
              We'll notify you the moment your insured parcel is on its way.
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-3">
          <ButtonLink href="/dashboard/orders">View my orders</ButtonLink>
          <ButtonLink href="/shop" variant="outline">
            Continue shopping
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <Suspense>
      <SuccessInner order={order ?? "LJ-DEMO"} />
    </Suspense>
  );
}
