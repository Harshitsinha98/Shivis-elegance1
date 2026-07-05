import { getNewArrivals } from "@/lib/db/repo";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";

export const metadata = { title: "New Arrivals" };
export const revalidate = 60;

export default async function NewArrivalsPage() {
  const newArrivals = await getNewArrivals();
  return (
    <>
      <PageHeader
        eyebrow="Fresh from the atelier"
        title="New Arrivals"
        subtitle="The latest additions to the Shivis Elegance world."
        crumbs={[{ label: "Home", href: "/" }, { label: "New Arrivals" }]}
      />
      <div className="container-luxe py-14">
        <ProductGrid products={newArrivals} emptyMessage="New pieces are on their way." />
      </div>
    </>
  );
}
