import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Shivis Elegance Admin" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in?redirect=/admin");
  if (session.role !== "admin") redirect("/dashboard?denied=admin");

  return (
    <div className="min-h-screen bg-ivory lg:flex">
      <AdminSidebar />
      <main className="flex-1 lg:h-screen lg:overflow-y-auto">
        <div className="p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
