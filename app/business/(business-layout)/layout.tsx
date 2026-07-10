import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { BusinessSidebar } from "@/components/layout/business-sidebar";
import { BusinessTopbar } from "@/components/layout/business-topbar";
import { BusinessMobileNav } from "@/components/layout/business-mobile-nav";
import { AdminViewSwitcher } from "@/components/admin-view-switcher";
import { CommandPalette } from "@/components/command-palette";
import { isPlatformAdmin } from "@/lib/is-admin";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Real data for the shell — no more hardcoded "Mój Salon" / "AB"
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      firstName: true,
      lastName: true,
      ownedBusinesses: {
        take: 1,
        select: { name: true, slug: true, subscriptionPlan: true },
      },
    },
  });
  const business = dbUser?.ownedBusinesses[0] ?? null;
  const initials =
    `${dbUser?.firstName?.[0] ?? ""}${dbUser?.lastName?.[0] ?? ""}`.toUpperCase() || undefined;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "radial-gradient(ellipse 90% 60% at 10% 0%, rgba(226,232,240,0.40) 0%, transparent 50%), radial-gradient(ellipse 70% 55% at 92% 100%, rgba(203,213,225,0.28) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(241,245,249,0.50) 0%, transparent 65%), #F2F7FC" }}>
      {/* Sidebar */}
      <BusinessSidebar
        businessName={business?.name}
        plan={business?.subscriptionPlan}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BusinessTopbar initials={initials} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      <BusinessMobileNav />
      <CommandPalette businessSlug={business?.slug} />
      {(await isPlatformAdmin()) && <AdminViewSwitcher />}
    </div>
  );
}
