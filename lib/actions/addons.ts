"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function getOwnedBusinessId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const biz = dbUser?.ownedBusinesses[0];
  if (!biz) throw new Error("Nie masz przypisanego salonu.");
  return biz.id;
}

export type AddonInput = {
  name: string;
  description?: string | null;
  priceIncrease: number;
  durationIncrease: number;
  isActive: boolean;
  hasQuantity: boolean;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  serviceIds: string[];
};

function normalize(input: AddonInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Podaj nazwę dodatku.");
  const priceIncrease = Number(input.priceIncrease);
  const durationIncrease = Math.round(Number(input.durationIncrease));
  if (!Number.isFinite(priceIncrease) || priceIncrease < 0) throw new Error("Dopłata nie może być ujemna.");
  if (!Number.isFinite(durationIncrease) || durationIncrease < 0) throw new Error("Czas dodatku nie może być ujemny.");

  let { hasQuantity, minQuantity, maxQuantity, defaultQuantity } = input;
  if (hasQuantity) {
    minQuantity = Math.max(1, Math.round(minQuantity || 1));
    maxQuantity = Math.max(minQuantity, Math.round(maxQuantity || minQuantity));
    defaultQuantity = Math.min(maxQuantity, Math.max(minQuantity, Math.round(defaultQuantity || minQuantity)));
  } else {
    minQuantity = 1;
    maxQuantity = 1;
    defaultQuantity = 1;
  }

  return {
    name,
    description: input.description?.trim() || null,
    priceIncrease: Math.round(priceIncrease * 100) / 100,
    durationIncrease,
    isActive: input.isActive,
    hasQuantity,
    minQuantity,
    maxQuantity,
    defaultQuantity,
  };
}

/** Only service ids that truly belong to this business (blocks cross-business assignment). */
async function validServiceIds(businessId: string, serviceIds: string[]): Promise<string[]> {
  const unique = [...new Set(serviceIds)];
  if (unique.length === 0) return [];
  const rows = await prisma.service.findMany({
    where: { businessId, id: { in: unique } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function createAddon(input: AddonInput) {
  const businessId = await getOwnedBusinessId();
  const data = normalize(input);
  const serviceIds = await validServiceIds(businessId, input.serviceIds);
  const max = await prisma.serviceAddon.aggregate({ where: { businessId }, _max: { sortOrder: true } });
  await prisma.serviceAddon.create({
    data: {
      businessId,
      ...data,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      services: { connect: serviceIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/business/services");
}

export async function updateAddon(id: string, input: AddonInput) {
  const businessId = await getOwnedBusinessId();
  const existing = await prisma.serviceAddon.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!existing) throw new Error("Nie znaleziono dodatku.");
  const data = normalize(input);
  const serviceIds = await validServiceIds(businessId, input.serviceIds);
  await prisma.serviceAddon.update({
    where: { id },
    data: { ...data, services: { set: serviceIds.map((sid) => ({ id: sid })) } },
  });
  revalidatePath("/business/services");
}

export async function toggleAddon(id: string) {
  const businessId = await getOwnedBusinessId();
  const a = await prisma.serviceAddon.findFirst({ where: { id, businessId }, select: { isActive: true } });
  if (!a) throw new Error("Nie znaleziono dodatku.");
  await prisma.serviceAddon.update({ where: { id }, data: { isActive: !a.isActive } });
  revalidatePath("/business/services");
}

export async function deleteAddon(id: string) {
  const businessId = await getOwnedBusinessId();
  const a = await prisma.serviceAddon.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!a) throw new Error("Nie znaleziono dodatku.");
  await prisma.serviceAddon.delete({ where: { id } });
  revalidatePath("/business/services");
}

export async function reorderAddons(orderedIds: string[]) {
  const businessId = await getOwnedBusinessId();
  const owned = await prisma.serviceAddon.findMany({ where: { businessId }, select: { id: true } });
  const ownedSet = new Set(owned.map((o) => o.id));
  const clean = orderedIds.filter((id) => ownedSet.has(id));
  await prisma.$transaction(clean.map((id, i) => prisma.serviceAddon.update({ where: { id }, data: { sortOrder: i } })));
  revalidatePath("/business/services");
}
