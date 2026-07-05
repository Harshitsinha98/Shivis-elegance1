import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { initials } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  return (
    <div className="container-luxe py-14">
      <div className="mb-10 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-champagne/20 font-display text-xl text-champagne-dark">
          {user ? initials(user.name) : "SE"}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-warm-gray">My Account</p>
          <h1 className="font-display text-3xl text-obsidian">
            {user?.name ?? "Welcome"}
          </h1>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <DashboardNav />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
