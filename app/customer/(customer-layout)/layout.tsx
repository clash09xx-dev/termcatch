import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { CustomerSidebar } from "@/components/layout/customer-sidebar";
import { CustomerTopbar } from "@/components/layout/customer-topbar";
import { CustomerMobileNav } from "@/components/layout/customer-mobile-nav";
import { AdminViewSwitcher } from "@/components/admin-view-switcher";
import { OwnerViewSwitcher } from "@/components/owner-view-switcher";
import { isPlatformAdmin } from "@/lib/is-admin";
import { currentUserOwnsBusiness } from "@/lib/ownership";
import { resolveViewSwitch } from "@/lib/view-switch";

export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Admins keep their internal switcher; a salon OWNER browsing as a customer
  // gets the Client/Salon switch so they can return to their dashboard. A normal
  // customer (no business) gets nothing. Ownership is resolved server-side.
  const isAdmin = await isPlatformAdmin();
  const ownsBusiness = isAdmin ? false : await currentUserOwnsBusiness();
  const viewSwitch = resolveViewSwitch({ isAdmin, ownsBusiness });

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "radial-gradient(ellipse 90% 60% at 10% 0%, rgba(226,232,240,0.40) 0%, transparent 50%), radial-gradient(ellipse 70% 55% at 92% 100%, rgba(203,213,225,0.28) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(241,245,249,0.50) 0%, transparent 65%), #F2F7FC" }}>
      <CustomerSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <CustomerTopbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <CustomerMobileNav />
      {viewSwitch === "admin" ? <AdminViewSwitcher /> : viewSwitch === "owner" ? <OwnerViewSwitcher current="client" /> : null}
    </div>
  );
}
