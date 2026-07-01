"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  bio?: string;
  color?: string;
  isActive?: boolean;
  serviceIds?: string[];
};

export async function createEmployee(data: EmployeeFormData) {
  const businessId = await getBusinessId();

  const employee = await prisma.employee.create({
    data: {
      businessId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      bio: data.bio ?? null,
      color: data.color ?? "#7c3aed",
      isActive: data.isActive ?? true,
    },
  });

  if (data.serviceIds && data.serviceIds.length > 0) {
    await prisma.employeeService.createMany({
      data: data.serviceIds.map((serviceId) => ({
        employeeId: employee.id,
        serviceId,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/business/staff");
}

export async function updateEmployee(id: string, data: Partial<EmployeeFormData>) {
  const businessId = await getBusinessId();

  await prisma.employee.updateMany({
    where: { id, businessId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      bio: data.bio ?? null,
      color: data.color,
      isActive: data.isActive,
    },
  });

  if (data.serviceIds !== undefined) {
    await prisma.employeeService.deleteMany({ where: { employeeId: id } });
    if (data.serviceIds.length > 0) {
      await prisma.employeeService.createMany({
        data: data.serviceIds.map((serviceId) => ({
          employeeId: id,
          serviceId,
        })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath("/business/staff");
}

export async function deleteEmployee(id: string) {
  const businessId = await getBusinessId();

  await prisma.employee.deleteMany({
    where: { id, businessId },
  });

  revalidatePath("/business/staff");
}

export async function toggleEmployeeActive(id: string) {
  const businessId = await getBusinessId();

  const employee = await prisma.employee.findFirst({
    where: { id, businessId },
    select: { isActive: true },
  });

  if (!employee) throw new Error("Nie znaleziono pracownika lub brak uprawnień.");

  const updated = await prisma.employee.update({
    where: { id },
    data: { isActive: !employee.isActive },
  });

  revalidatePath("/business/staff");
  return updated;
}
