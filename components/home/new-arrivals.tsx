import { getNewArrivals } from "@/lib/db/repo";
import { ProductRail } from "@/components/home/product-rail";

export async function NewArrivals() {
  const newArrivals = await getNewArrivals();
  return (
    <ProductRail
      eyebrow="Just landed"
      title="New arrivals"
      href="/new-arrivals"
      products={newArrivals}
      limit={8}
    />
  );
}
