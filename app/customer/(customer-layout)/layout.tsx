import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { CustomerSidebar } from "@/components/layout/customer-sidebar";
import { CustomerTopbar } from "@/components/layout/customer-topbar";
import { CustomerMobileNav } from "@/components/layout/customer-mobile-nav";
import { AdminViewSwitcher } from "@/components/admin-view-switcher";
import { isPlatformAdmin } from "@/lib/is-admin";

export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <CustomerSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <CustomerTopbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <CustomerMobileNav />
      {(await isPlatformAdmin()) && <AdminViewSwitcher />}
    </div>
  );
}
