import "server-only";

import { cookies } from "next/headers";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the employee context for a request — either the logged-in user's own
 * linked Employee, or (for an owner) a validated "View-As" preview. All employee
 * pages/actions/AI derive their scope from this, server-side.
 */

export const VIEW_AS_COOKIE = "tc-view-as";

export type EmployeeContext = {
  employeeId: string;
  businessId: string;
  businessName: string;
  employeeName: string;
  /** true when an owner is previewing this employee (read-only). */
  viewAs: boolean;
  /** The REAL logged-in user (owner in view-as, otherwise the employee). */
  actorUserId: string;
  actorSupabaseId: string;
};

async function currentDbUser() {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, ownedBusinesses: { take: 1, select: { id: true } } },
  });
  if (!dbUser) return null;
  return { supabaseId: user.id, id: dbUser.id, role: dbUser.role, ownerBusinessId: dbUser.ownedBusinesses[0]?.id ?? null };
}

/** An owner previewing an employee. Validated: the owner must own that employee's business. */
export async function resolveViewAs(): Promise<EmployeeContext | null> {
  const jar = await cookies();
  const employeeId = jar.get(VIEW_AS_COOKIE)?.value;
  if (!employeeId) return null;
  const me = await currentDbUser();
  if (!me || !me.ownerBusinessId) return null; // only an owner can view-as
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, businessId: me.ownerBusinessId },
    select: { id: true, firstName: true, lastName: true, business: { select: { id: true, name: true } } },
  });
  if (!emp) return null; // tampered cookie / not this owner's employee
  return {
    employeeId: emp.id, businessId: emp.business.id, businessName: emp.business.name,
    employeeName: `${emp.firstName} ${emp.lastName}`.trim(), viewAs: true,
    actorUserId: me.id, actorSupabaseId: me.supabaseId,
  };
}

/** The logged-in user's own linked Employee (if any). */
export async function resolveEmployeeSelf(): Promise<EmployeeContext | null> {
  const me = await currentDbUser();
  if (!me) return null;
  const emp = await prisma.employee.findFirst({
    where: { userId: me.id, isActive: true },
    select: { id: true, firstName: true, lastName: true, business: { select: { id: true, name: true } } },
  });
  if (!emp) return null;
  return {
    employeeId: emp.id, businessId: emp.business.id, businessName: emp.business.name,
    employeeName: `${emp.firstName} ${emp.lastName}`.trim(), viewAs: false,
    actorUserId: me.id, actorSupabaseId: me.supabaseId,
  };
}

/** View-As (owner preview) takes precedence, else the user's own employee context. */
export async function resolveEmployeeContext(): Promise<EmployeeContext | null> {
  return (await resolveViewAs()) ?? (await resolveEmployeeSelf());
}
