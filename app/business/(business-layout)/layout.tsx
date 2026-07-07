import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { BusinessSidebar } from "@/components/layout/business-sidebar";
import { BusinessTopbar } from "@/components/layout/business-topbar";
import { BusinessMobileNav } from "@/components/layout/business-mobile-nav";
import { AdminViewSwitcher } from "@/components/admin-view-switcher";
import { isPlatformAdmin } from "@/lib/is-admin";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "radial-gradient(ellipse 90% 70% at 20% 0%, rgba(212,160,23,0.055) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 85% 100%, rgba(17,24,39,0.04) 0%, transparent 55%), #f2ede7" }}>
      {/* Sidebar */}
      <BusinessSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BusinessTopbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      <BusinessMobileNav />
      {(await isPlatformAdmin()) && <AdminViewSwitcher />}
    </div>
  );
}
