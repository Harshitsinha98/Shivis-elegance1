import { listUsers } from "@/lib/db/repo";
import { CustomersTable, type CustomerRow } from "./customers-table";

export const metadata = { title: "Customers · Admin" };
export const dynamic = "force-dynamic";

// Spend tiers, in paise.
function tierFor(orders: number, spent: number): CustomerRow["tier"] {
  if (orders === 0) return "New";
  if (spent >= 50_000_000) return "Platinum"; // ≥ ₹5,00,000
  if (spent >= 10_000_000) return "Gold"; //     ≥ ₹1,00,000
  return "Silver";
}

export default async function AdminCustomersPage() {
  const users = await listUsers();
  const customers: CustomerRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    orders: u.orderCount,
    spent: u.totalSpent,
    tier: tierFor(u.orderCount, u.totalSpent),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Customers</h1>
        <p className="text-warm-gray">{customers.length} registered customers</p>
      </div>
      <CustomersTable customers={customers} />
    </div>
  );
}
