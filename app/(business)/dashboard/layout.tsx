import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { BusinessSidebar } from "@/components/layout/business-sidebar";
import { BusinessTopbar } from "@/components/layout/business-topbar";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <BusinessSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BusinessTopbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
