import { listAllProducts, listCoupons } from "@/lib/db/repo";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Offers" };
export const revalidate = 60;

export default async function OffersPage() {
  const [products, COUPONS] = await Promise.all([listAllProducts(), listCoupons()]);
  const onSale = products.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);

  return (
    <>
      <PageHeader
        eyebrow="Limited time"
        title="Offers & Savings"
        subtitle="Exceptional pieces at exceptional value — while stocks last."
        crumbs={[{ label: "Home", href: "/" }, { label: "Offers" }]}
      />

      <div className="container-luxe py-14">
        <div className="mb-14 grid gap-4 md:grid-cols-3">
          {COUPONS.map((c) => (
            <div
              key={c.code}
              className="flex flex-col justify-between rounded-2xl border border-dashed border-champagne bg-cream p-6"
            >
              <div>
                <Badge tone="gold">Code</Badge>
                <p className="mt-3 font-display text-2xl text-obsidian">{c.code}</p>
                <p className="mt-1 text-sm text-warm-gray">{c.description}</p>
              </div>
              {c.minSubtotal && (
                <p className="mt-4 text-xs text-warm-gray">
                  Minimum order ₹{(c.minSubtotal / 100).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          ))}
        </div>

        <h2 className="mb-8 font-display text-3xl text-obsidian">On sale now</h2>
        <ProductGrid products={onSale} emptyMessage="No offers right now — check back soon." />
      </div>
    </>
  );
}
