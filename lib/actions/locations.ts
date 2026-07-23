"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { multiLocationEnabled } from "@/lib/multi-location";
import { assertCanAddLocation } from "@/lib/entitlement-guard";
import { PlanLimitError, type PlanLimitInfo } from "@/lib/entitlements";

/**
 * Result contract. `disabled` is returned whenever the multi-location feature
 * flag is off — callers never reach `prisma.location` in that state, so the
 * feature is completely inert until MULTI_LOCATION_ENABLED=true.
 */
export type LocationMutationResult =
  | { ok: true }
  | { ok: false; limit: PlanLimitInfo }
  | { ok: false; disabled: true }
  | { ok: false; error: string };

async function getBusinessId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");
  return business.id;
}

export type LocationFormData = {
  name: string;
  addressLine?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  isActive?: boolean;
};

export async function createLocation(data: LocationFormData): Promise<LocationMutationResult> {
  if (!multiLocationEnabled()) return { ok: false, disabled: true };
  const businessId = await getBusinessId();
  if (!data.name?.trim()) return { ok: false, error: "Nazwa lokalizacji jest wymagana." };
  try {
    await prisma.$transaction(async (tx) => {
      // Plan location limit — enforced under the same row-lock discipline as staff.
      await assertCanAddLocation(tx, businessId, (t) =>
        t.location.count({ where: { businessId, isActive: true } })
      );
      const count = await tx.location.count({ where: { businessId } });
      await tx.location.create({
        data: {
          businessId,
          name: data.name.trim(),
          addressLine: data.addressLine?.trim() || null,
          city: data.city?.trim() || null,
          postalCode: data.postalCode?.trim() || null,
          phone: data.phone?.trim() || null,
          isActive: data.isActive ?? true,
          // First location a business creates becomes its primary branch.
          isPrimary: count === 0,
          displayOrder: count,
        },
      });
    });
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, limit: e.info };
    throw e;
  }
  revalidatePath("/business/locations");
  return { ok: true };
}

export async function updateLocation(id: string, data: LocationFormData): Promise<LocationMutationResult> {
  if (!multiLocationEnabled()) return { ok: false, disabled: true };
  const businessId = await getBusinessId();
  // Ownership scoped via updateMany's compound where — a foreign id updates 0 rows.
  await prisma.location.updateMany({
    where: { id, businessId },
    data: {
      name: data.name?.trim(),
      addressLine: data.addressLine?.trim() || null,
      city: data.city?.trim() || null,
      postalCode: data.postalCode?.trim() || null,
      phone: data.phone?.trim() || null,
      isActive: data.isActive,
    },
  });
  revalidatePath("/business/locations");
  return { ok: true };
}

export async function setPrimaryLocation(id: string): Promise<LocationMutationResult> {
  if (!multiLocationEnabled()) return { ok: false, disabled: true };
  const businessId = await getBusinessId();
  await prisma.$transaction(async (tx) => {
    const target = await tx.location.findFirst({ where: { id, businessId }, select: { id: true } });
    if (!target) throw new Error("Nie znaleziono lokalizacji.");
    await tx.location.updateMany({ where: { businessId }, data: { isPrimary: false } });
    await tx.location.update({ where: { id }, data: { isPrimary: true, isActive: true } });
  });
  revalidatePath("/business/locations");
  return { ok: true };
}

export async function toggleLocationActive(id: string): Promise<LocationMutationResult> {
  if (!multiLocationEnabled()) return { ok: false, disabled: true };
  const businessId = await getBusinessId();
  try {
    await prisma.$transaction(async (tx) => {
      const loc = await tx.location.findFirst({ where: { id, businessId }, select: { isActive: true, isPrimary: true } });
      if (!loc) throw new Error("Nie znaleziono lokalizacji.");
      if (loc.isActive && loc.isPrimary) {
        throw new Error("Nie można dezaktywować głównej lokalizacji. Ustaw najpierw inną jako główną.");
      }
      // Reactivating counts against the plan location limit.
      if (!loc.isActive) {
        await assertCanAddLocation(tx, businessId, (t) => t.location.count({ where: { businessId, isActive: true } }));
      }
      await tx.location.update({ where: { id }, data: { isActive: !loc.isActive } });
    });
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, limit: e.info };
    if (e instanceof Error) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath("/business/locations");
  return { ok: true };
}
