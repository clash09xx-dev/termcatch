export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { resolveEmployeeContext } from "@/lib/employee/context";
import { EmployeeShell } from "@/components/layout/employee-shell";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Server-side gate: only a linked employee (or an owner in View-As) may be here.
  const ctx = await resolveEmployeeContext();
  if (!ctx) redirect("/");

  const initials =
    ctx.employeeName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <EmployeeShell employeeName={ctx.employeeName} businessName={ctx.businessName} viewAs={ctx.viewAs} initials={initials}>
      {children}
    </EmployeeShell>
  );
}
