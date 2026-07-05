import Link from "next/link";
import { Plus } from "lucide-react";
import { listAllProducts } from "@/lib/db/repo";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "./products-table";

export const metadata = { title: "Products · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await listAllProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-obsidian">Products</h1>
          <p className="text-warm-gray">{products.length} products in catalogue</p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus size={16} /> Add product
          </Button>
        </Link>
      </div>

      <ProductsTable products={products} />
    </div>
  );
}
