"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/is-admin";
import { getServerUser } from "@/lib/supabase/server";
import { BusinessStatus } from "@prisma/client";

async function requireAdmin() {
  if (!(await isPlatformAdmin())) redirect("/");
}

/** Admin: publish (verify) a salon — the only transition into public ACTIVE. */
export async function adminPublishBusiness(businessId: string) {
  await requireAdmin();
  const user = await getServerUser();
  await prisma.business.update({
    where: { id: businessId },
    data: {
      status: BusinessStatus.ACTIVE,
      isActive: true,
      verifiedAt: new Date(),
      verifiedBy: user?.email ?? user?.id ?? null,
    },
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/search");
}

/** Admin: suspend a salon (temporarily hidden from all public discovery). */
export async function adminSuspendBusiness(businessId: string) {
  await requireAdmin();
  await prisma.business.update({
    where: { id: businessId },
    data: { status: BusinessStatus.SUSPENDED },
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/search");
}

/** Admin: return a salon to draft / pending verification (un-publish). */
export async function adminReturnToDraft(businessId: string) {
  await requireAdmin();
  await prisma.business.update({
    where: { id: businessId },
    data: { status: BusinessStatus.PENDING_VERIFICATION, verifiedAt: null },
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/search");
}

/** Admin: zablokuj salon (znika z wyszukiwarki, profil przestaje działać). */
export async function adminBanBusiness(businessId: string) {
  await requireAdmin();
  await prisma.business.update({
    where: { id: businessId },
    data: { status: BusinessStatus.BANNED },
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/search");
}

/** Admin: przywróć salon. */
export async function adminRestoreBusiness(businessId: string) {
  await requireAdmin();
  await prisma.business.update({
    where: { id: businessId },
    data: { status: BusinessStatus.ACTIVE },
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/search");
}

/**
 * Admin: trwale usuń salon wraz z powiązanymi danymi.
 * Dozwolone tylko, gdy salon nie ma żadnych rezerwacji —
 * historia wizyt klientów nigdy nie jest kasowana.
 */
export async function adminDeleteBusiness(businessId: string) {
  await requireAdmin();

  const appointmentsCount = await prisma.appointment.count({
    where: { businessId },
  });
  if (appointmentsCount > 0) {
    throw new Error(
      "Salon ma rezerwacje w historii — możesz go tylko zablokować, nie usunąć."
    );
  }

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { businessId } }),
    prisma.favouriteBusiness.deleteMany({ where: { businessId } }),
    prisma.notification.deleteMany({ where: { businessId } }),
    prisma.workingHours.deleteMany({ where: { businessId } }),
    prisma.employee.deleteMany({ where: { businessId } }),
    prisma.service.deleteMany({ where: { businessId } }),
    prisma.businessSubscription.deleteMany({ where: { businessId } }),
    prisma.business.delete({ where: { id: businessId } }),
  ]);

  revalidatePath("/admin/dashboard");
  revalidatePath("/search");
}
