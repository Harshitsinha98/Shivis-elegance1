import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listCollections } from "@/lib/db/repo";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New product · Admin" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const collections = await listCollections();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="mb-2 inline-flex items-center gap-1 text-sm text-warm-gray hover:text-obsidian">
          <ArrowLeft size={14} /> Back to products
        </Link>
        <h1 className="font-display text-4xl text-obsidian">New product</h1>
        <p className="text-warm-gray">Add a piece to the catalogue</p>
      </div>
      <ProductForm collections={collections} />
    </div>
  );
}
