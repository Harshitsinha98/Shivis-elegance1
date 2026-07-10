import { listReturnRequests } from "@/lib/db/repo";
import { ReturnsManager } from "./returns-manager";

export const metadata = { title: "Returns · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const returns = await listReturnRequests();
  const pending = returns.filter((r) => r.status === "requested").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Returns</h1>
        <p className="text-warm-gray">
          Manage return requests{pending > 0 ? ` · ${pending} awaiting review` : ""}
        </p>
      </div>
      <ReturnsManager returns={returns} />
    </div>
  );
}
