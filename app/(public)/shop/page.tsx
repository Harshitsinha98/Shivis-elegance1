import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ShopClient } from "./shop-client";

export const metadata = { title: "Shop All Jewellery" };

export default function ShopPage() {
  return (
    <>
      <PageHeader
        eyebrow="The Full Collection"
        title="Shop All"
        subtitle="Every piece hallmarked, certified and crafted to last generations."
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <Suspense fallback={<div className="container-luxe py-20 text-center text-warm-gray">Loading…</div>}>
        <ShopClient />
      </Suspense>
    </>
  );
}
