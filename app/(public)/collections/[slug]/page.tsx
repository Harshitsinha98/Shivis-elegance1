import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCollection,
  getProductsByCollection,
  listCollections,
} from "@/lib/db/repo";
import { ProductGrid } from "@/components/product/product-grid";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export const revalidate = 60;

export async function generateStaticParams() {
  const collections = await listCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const col = await getCollection(slug);
  return col ? { title: col.name, description: col.description } : { title: "Not found" };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  const products = await getProductsByCollection(slug);

  return (
    <>
      <section className="relative flex min-h-[50vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={collection.heroImage} alt={collection.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-obsidian/50" />
        </div>
        <div className="container-luxe relative text-center text-ivory">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-light">Collection</p>
            <h1 className="mt-3 font-display text-5xl md:text-7xl">{collection.name}</h1>
            <p className="mx-auto mt-4 max-w-xl text-ivory/85">{collection.description}</p>
          </ScrollReveal>
        </div>
      </section>

      <div className="container-luxe py-16">
        <ProductGrid products={products} emptyMessage="This collection is being restocked." />
      </div>
    </>
  );
}
