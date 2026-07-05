import { getBestSellers } from "@/lib/db/repo";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";

export const metadata = { title: "Best Sellers" };
export const revalidate = 60;

export default async function BestSellersPage() {
  const bestSellers = await getBestSellers();
  return (
    <>
      <PageHeader
        eyebrow="Most loved"
        title="Best Sellers"
        subtitle="The pieces our clients return for, again and again."
        crumbs={[{ label: "Home", href: "/" }, { label: "Best Sellers" }]}
      />
      <div className="container-luxe py-14">
        <ProductGrid products={bestSellers} />
      </div>
    </>
  );
}
