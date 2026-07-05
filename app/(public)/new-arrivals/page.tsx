import { NEW_ARRIVALS } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";

export const metadata = { title: "New Arrivals" };

export default function NewArrivalsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Fresh from the atelier"
        title="New Arrivals"
        subtitle="The latest additions to the Shivis Elegance world."
        crumbs={[{ label: "Home", href: "/" }, { label: "New Arrivals" }]}
      />
      <div className="container-luxe py-14">
        <ProductGrid products={NEW_ARRIVALS} emptyMessage="New pieces are on their way." />
      </div>
    </>
  );
}
