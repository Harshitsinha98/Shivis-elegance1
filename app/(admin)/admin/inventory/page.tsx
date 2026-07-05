import { AlertTriangle } from "lucide-react";
import { listAllProducts } from "@/lib/db/repo";
import { InventoryTable } from "./inventory-table";

export const metadata = { title: "Inventory · Admin" };
export const dynamic = "force-dynamic";

const LOW_STOCK = 6;

export default async function AdminInventoryPage() {
  const products = await listAllProducts();
  const lowCount = products.filter((p) => p.stock <= LOW_STOCK).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Inventory</h1>
        <p className="text-warm-gray">Track and update stock levels across the catalogue</p>
      </div>

      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle size={18} />
          {lowCount} product{lowCount > 1 ? "s are" : " is"} running low on stock.
        </div>
      )}

      <InventoryTable products={products} />
    </div>
  );
}
