import { BEST_SELLERS } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";

export const metadata = { title: "Best Sellers" };

export default function BestSellersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Most loved"
        title="Best Sellers"
        subtitle="The pieces our clients return for, again and again."
        crumbs={[{ label: "Home", href: "/" }, { label: "Best Sellers" }]}
      />
      <div className="container-luxe py-14">
        <ProductGrid products={BEST_SELLERS} />
      </div>
    </>
  );
}
