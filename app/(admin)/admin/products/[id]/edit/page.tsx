import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductById, listCollections } from "@/lib/db/repo";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit product · Admin" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, collections] = await Promise.all([
    getProductById(id),
    listCollections(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="mb-2 inline-flex items-center gap-1 text-sm text-warm-gray hover:text-obsidian">
          <ArrowLeft size={14} /> Back to products
        </Link>
        <h1 className="font-display text-4xl text-obsidian">Edit product</h1>
        <p className="text-warm-gray">{product.name}</p>
      </div>
      <ProductForm product={product} collections={collections} />
    </div>
  );
}
