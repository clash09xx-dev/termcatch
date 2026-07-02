import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CustomerSidebar } from "@/components/layout/customer-sidebar";
import { CustomerTopbar } from "@/components/layout/customer-topbar";
import { CustomerMobileNav } from "@/components/layout/customer-mobile-nav";

export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  let unreadCount = 0;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    });
    if (dbUser) {
      unreadCount = await prisma.notification.count({
        where: { userId: dbUser.id, channel: "IN_APP", isRead: false },
      });
    }
  } catch {
    // Badge is cosmetic — never block the layout on it
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <CustomerSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <CustomerTopbar unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <CustomerMobileNav unreadCount={unreadCount} />
    </div>
  );
}
