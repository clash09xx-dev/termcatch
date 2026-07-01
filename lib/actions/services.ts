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

export type ServiceFormData = {
  name: string;
  description?: string;
  duration: number;
  price: number;
  discountedPrice?: number;
  requiresDeposit?: boolean;
  depositAmount?: number;
  isActive?: boolean;
  displayOrder?: number;
};

export async function createService(data: ServiceFormData) {
  const businessId = await getBusinessId();

  await prisma.service.create({
    data: {
      businessId,
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price,
      discountedPrice: data.discountedPrice ?? null,
      requiresDeposit: data.requiresDeposit ?? false,
      depositAmount: data.depositAmount ?? null,
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
    },
  });

  revalidatePath("/business/services");
}

export async function updateService(id: string, data: Partial<ServiceFormData>) {
  const businessId = await getBusinessId();

  await prisma.service.updateMany({
    where: { id, businessId },
    data: {
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price,
      discountedPrice: data.discountedPrice ?? null,
      requiresDeposit: data.requiresDeposit,
      depositAmount: data.depositAmount ?? null,
      isActive: data.isActive,
      displayOrder: data.displayOrder,
    },
  });

  revalidatePath("/business/services");
}

export async function deleteService(id: string) {
  const businessId = await getBusinessId();

  await prisma.service.deleteMany({
    where: { id, businessId },
  });

  revalidatePath("/business/services");
}

export async function toggleServiceActive(id: string) {
  const businessId = await getBusinessId();

  const service = await prisma.service.findFirst({
    where: { id, businessId },
    select: { isActive: true },
  });

  if (!service) throw new Error("Nie znaleziono usługi lub brak uprawnień.");

  const updated = await prisma.service.update({
    where: { id },
    data: { isActive: !service.isActive },
  });

  revalidatePath("/business/services");
  return updated;
}

export async function reorderServices(serviceIds: string[]) {
  const businessId = await getBusinessId();

  // Verify all services belong to this business before updating
  const owned = await prisma.service.findMany({
    where: { id: { in: serviceIds }, businessId },
    select: { id: true },
  });

  if (owned.length !== serviceIds.length) {
    throw new Error("Niektóre usługi nie należą do tego biznesu.");
  }

  await Promise.all(
    serviceIds.map((serviceId, index) =>
      prisma.service.update({
        where: { id: serviceId },
        data: { displayOrder: index },
      })
    )
  );

  revalidatePath("/business/services");
}
