import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { BusinessSidebar } from "@/components/layout/business-sidebar";
import { BusinessTopbar } from "@/components/layout/business-topbar";
import { BusinessMobileNav } from "@/components/layout/business-mobile-nav";
import { AdminViewSwitcher } from "@/components/admin-view-switcher";
import { CommandPalette } from "@/components/command-palette";
import { isPlatformAdmin } from "@/lib/is-admin";
import { multiLocationEnabled } from "@/lib/multi-location";
import { billingConfigured } from "@/lib/subscription";
import { resolveEmployeeSelf } from "@/lib/employee/context";

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
        select: { id: true, name: true, slug: true, subscriptionPlan: true },
      },
    },
  });
  const business = dbUser?.ownedBusinesses[0] ?? null;

  // An employee must never see the owner dashboard — send them to their own.
  if (!business) {
    const emp = await resolveEmployeeSelf();
    if (emp) redirect("/employee/dashboard");
  }

  const initials =
    `${dbUser?.firstName?.[0] ?? ""}${dbUser?.lastName?.[0] ?? ""}`.toUpperCase() || undefined;
  const multiLocation = multiLocationEnabled();
  const isAdmin = await isPlatformAdmin();

  // ── Hard subscription gate ────────────────────────────────────────────────
  // A business must have an ACTIVE subscription or an ACTIVE free trial to reach
  // the dashboard — otherwise it's redirected to plan selection / billing, so no
  // one can manually open /business/dashboard and bypass the flow.
  //   • Admins bypass (internal access preserved).
  //   • The billing page (/business/payments) is exempt so a past-due/cancelled
  //     owner can always reach the Customer Portal to fix payment.
  //   • Only active when billing is actually configured — with no Stripe env a
  //     subscription cannot be obtained, so gating would lock everyone out.
  //   • This gate is INDEPENDENT of ENTITLEMENTS_ENFORCED, which remains the
  //     sole switch for plan LIMITS.
  if (business && billingConfigured() && !isAdmin) {
    const pathname = (await headers()).get("x-tc-pathname") ?? "";
    const onBilling = pathname.startsWith("/business/payments");
    // Only gate when we actually know the path (header present) — fail-open
    // otherwise so a missing header can never cause a redirect loop.
    if (pathname && !onBilling) {
      const live = await prisma.businessSubscription.findFirst({
        where: { businessId: business.id, status: { in: ["ACTIVE", "TRIALING"] } },
        select: { id: true },
      });
      if (!live) {
        const anySub = await prisma.businessSubscription.findFirst({
          where: { businessId: business.id },
          select: { id: true },
        });
        // Past-due/cancelled → billing to fix it; never subscribed → plan selection.
        redirect(anySub ? "/business/payments" : "/business/onboarding/plan");
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "radial-gradient(ellipse 90% 60% at 10% 0%, rgba(226,232,240,0.40) 0%, transparent 50%), radial-gradient(ellipse 70% 55% at 92% 100%, rgba(203,213,225,0.28) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(241,245,249,0.50) 0%, transparent 65%), #F2F7FC" }}>
      {/* Sidebar */}
      <BusinessSidebar
        businessName={business?.name}
        plan={business?.subscriptionPlan}
        multiLocation={multiLocation}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BusinessTopbar initials={initials} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      <BusinessMobileNav multiLocation={multiLocation} />
      <CommandPalette businessSlug={business?.slug} />
      {isAdmin && <AdminViewSwitcher />}
    </div>
  );
}
