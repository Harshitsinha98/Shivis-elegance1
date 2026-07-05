import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getProduct,
  getReviewsForProduct,
  getRelatedProducts,
  listAllProducts,
} from "@/lib/db/repo";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductDetails } from "@/components/product/product-details";
import { ReviewSection } from "@/components/product/reveiw-section";
import { ProductGrid } from "@/components/product/product-grid";

// Read live catalogue data from the DB; re-check at most once a minute so admin
// edits still surface even if an explicit revalidate is ever missed.
export const revalidate = 60;

export async function generateStaticParams() {
  const products = await listAllProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.tagline,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [reviews, related] = await Promise.all([
    getReviewsForProduct(product.id),
    getRelatedProducts(product),
  ]);

  return (
    <div className="container-luxe py-10">
      <nav className="mb-8 flex items-center gap-2 text-xs text-warm-gray">
        <Link href="/" className="hover:text-obsidian">Home</Link>
        <ChevronRight size={12} />
        <Link href="/shop" className="hover:text-obsidian">Shop</Link>
        <ChevronRight size={12} />
        <Link href={`/shop?category=${product.category}`} className="capitalize hover:text-obsidian">
          {product.category}
        </Link>
        <ChevronRight size={12} />
        <span className="text-obsidian">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />
        <ProductDetails product={product} />
      </div>

      <div className="mt-20">
        <ReviewSection
          reviews={reviews}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-10 text-center font-display text-3xl text-obsidian">
            You may also love
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
