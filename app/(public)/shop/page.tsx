import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { listAllProducts } from "@/lib/db/repo";
import { ShopClient } from "./shop-client";

export const metadata = { title: "Shop All Jewellery" };
export const revalidate = 60;

export default async function ShopPage() {
  const products = await listAllProducts();
  return (
    <>
      <PageHeader
        eyebrow="The Full Collection"
        title="Shop All"
        subtitle="Every piece hallmarked, certified and crafted to last generations."
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <Suspense fallback={<div className="container-luxe py-20 text-center text-warm-gray">Loading…</div>}>
        <ShopClient products={products} />
      </Suspense>
    </>
  );
}
