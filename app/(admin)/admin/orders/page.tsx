import { listOrders } from "@/lib/db/repo";
import { OrdersTable } from "./orders-table";

export const metadata = { title: "Orders · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Orders</h1>
        <p className="text-warm-gray">Manage and fulfil customer orders</p>
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}
