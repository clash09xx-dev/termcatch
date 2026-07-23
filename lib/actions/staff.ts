"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { autoPublishIfComplete } from "@/lib/publish";
import { assertCanAddEmployee } from "@/lib/entitlement-guard";
import { PlanLimitError, type PlanLimitInfo } from "@/lib/entitlements";
import type { Prisma } from "@prisma/client";

/** Discriminated result so the client can show the upgrade dialog on a limit hit. */
export type StaffMutationResult = { ok: true } | { ok: false; limit: PlanLimitInfo };

async function getBusinessId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");
  return business.id;
}

export type EmployeeFormData = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  color?: string;
  isActive?: boolean;
  serviceIds?: string[];
};

// Only service ids that truly belong to this business (blocks assigning another
// business's service to an employee).
async function ownedServiceIds(
  tx: Prisma.TransactionClient,
  businessId: string,
  serviceIds: string[]
): Promise<string[]> {
  const unique = [...new Set(serviceIds)];
  if (unique.length === 0) return [];
  const rows = await tx.service.findMany({ where: { businessId, id: { in: unique } }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function createEmployee(data: EmployeeFormData): Promise<StaffMutationResult> {
  const businessId = await getBusinessId();
  const active = data.isActive ?? true;
  try {
    await prisma.$transaction(async (tx) => {
      // Enforce the plan's active-specialist limit under a row lock (concurrency-safe).
      if (active) await assertCanAddEmployee(tx, businessId);
      const employee = await tx.employee.create({
        data: {
          businessId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          title: data.title?.trim() || null,
          bio: data.bio?.trim() || null,
          avatarUrl: data.avatarUrl || null,
          color: data.color ?? "#111827",
          isActive: active,
        },
      });
      const ids = await ownedServiceIds(tx, businessId, data.serviceIds ?? []);
      if (ids.length > 0) {
        await tx.employeeService.createMany({
          data: ids.map((serviceId) => ({ employeeId: employee.id, serviceId })),
          skipDuplicates: true,
        });
      }
    });
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, limit: e.info };
    throw e;
  }
  await autoPublishIfComplete(businessId);
  revalidatePath("/business/staff");
  revalidatePath("/search");
  return { ok: true };
}

export async function updateEmployee(id: string, data: Partial<EmployeeFormData>): Promise<StaffMutationResult> {
  const businessId = await getBusinessId();
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.employee.findFirst({ where: { id, businessId }, select: { isActive: true } });
      if (!current) throw new Error("Nie znaleziono pracownika lub brak uprawnień.");
      // Guard ONLY a genuine reactivation (inactive → active); editing an already
      // active employee is never blocked (downgrade-safe: existing data stays editable).
      if (data.isActive === true && !current.isActive) {
        await assertCanAddEmployee(tx, businessId, id);
      }
      await tx.employee.updateMany({
        where: { id, businessId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          title: data.title?.trim() || null,
          bio: data.bio?.trim() || null,
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
          color: data.color,
          isActive: data.isActive,
        },
      });
      if (data.serviceIds !== undefined) {
        await tx.employeeService.deleteMany({ where: { employeeId: id } });
        const ids = await ownedServiceIds(tx, businessId, data.serviceIds);
        if (ids.length > 0) {
          await tx.employeeService.createMany({
            data: ids.map((serviceId) => ({ employeeId: id, serviceId })),
            skipDuplicates: true,
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, limit: e.info };
    throw e;
  }
  await autoPublishIfComplete(businessId);
  revalidatePath("/business/staff");
  revalidatePath("/search");
  return { ok: true };
}

export async function deleteEmployee(id: string) {
  const businessId = await getBusinessId();

  await prisma.employee.deleteMany({
    where: { id, businessId },
  });

  revalidatePath("/business/staff");
}

export async function toggleEmployeeActive(id: string): Promise<StaffMutationResult> {
  const businessId = await getBusinessId();
  try {
    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({ where: { id, businessId }, select: { isActive: true } });
      if (!employee) throw new Error("Nie znaleziono pracownika lub brak uprawnień.");
      // Reactivating (inactive → active) must respect the plan limit.
      if (!employee.isActive) await assertCanAddEmployee(tx, businessId, id);
      await tx.employee.update({ where: { id }, data: { isActive: !employee.isActive } });
    });
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, limit: e.info };
    throw e;
  }
  await autoPublishIfComplete(businessId);
  revalidatePath("/business/staff");
  revalidatePath("/search");
  return { ok: true };
}
