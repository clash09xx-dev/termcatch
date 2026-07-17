"use server";

import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { createDangerCode, verifyAndConsumeDangerCode } from "@/lib/danger-codes";

/**
 * Niebezpieczna strefa — operacje wymagają potwierdzenia jednorazowym
 * 6-cyfrowym kodem wysyłanym e-mailem (Resend). Kody: HMAC w bazie (nigdy
 * plaintext), 10 min ważności, limit prób i ponownej wysyłki, jednorazowe.
 */

export type DangerState = {
  error?: string;
  codeSent?: boolean;
  deleted?: boolean;
};

/** Krok 1: wyślij 6-cyfrowy kod na e-mail zalogowanego właściciela salonu. */
export async function requestDangerCode(): Promise<DangerState> {
  const user = await getServerUser();
  if (!user?.email) return { error: "Nie jesteś zalogowany." };

  // Kod wysyłamy tylko właścicielowi salonu.
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { select: { name: true }, take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) return { error: "Nie masz przypisanego salonu." };

  const created = await createDangerCode(user.id);
  if (!created.ok) {
    return { error: "Kod został niedawno wysłany. Odczekaj minutę i spróbuj ponownie." };
  }

  const { sent } = await sendEmail({
    to: user.email,
    subject: "Kod potwierdzający usunięcie — Termcatch",
    heading: "Potwierdź operację usunięcia",
    lines: [
      `Otrzymaliśmy prośbę o usunięcie danych salonu <strong>${business.name}</strong> w Termcatch.`,
      `Twój kod potwierdzający: <strong style="font-size:24px;letter-spacing:6px;">${created.code}</strong>`,
      "Kod wygasa po 10 minutach i działa tylko raz.",
      "Jeśli to nie Ty — zignoruj tę wiadomość i jak najszybciej zmień hasło do konta.",
    ],
  });

  if (!sent) {
    // Nie zostawiaj aktywnego kodu, którego nikt nie zobaczy.
    await prisma.dangerCode.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return { error: "Nie udało się wysłać e-maila z kodem. Spróbuj ponownie za chwilę lub skontaktuj się z pomocą." };
  }

  return { codeSent: true };
}

// ── Shared code verification ──────────────────────────────────────────────────

async function verifyDangerCode(userId: string, code: string): Promise<{ error?: string }> {
  const result = await verifyAndConsumeDangerCode(userId, code);
  if (result.ok) return {};
  switch (result.reason) {
    case "expired":
      return { error: "Kod wygasł. Poproś o nowy kod." };
    case "locked":
      return { error: "Zbyt wiele nieudanych prób. Poproś o nowy kod." };
    default:
      return { error: "Nieprawidłowy kod. Sprawdź e-mail i spróbuj ponownie." };
  }
}

// ── Shared business data deletion ─────────────────────────────────────────────

async function deleteBusinessData(businessId: string): Promise<void> {
  await prisma.$transaction([
    prisma.appointmentReminder.deleteMany({ where: { appointment: { businessId } } }),
    prisma.payment.deleteMany({ where: { appointment: { businessId } } }),
    prisma.review.deleteMany({ where: { businessId } }),
    prisma.favouriteBusiness.deleteMany({ where: { businessId } }),
    prisma.notification.deleteMany({ where: { businessId } }),
    prisma.waitlistEntry.deleteMany({ where: { businessId } }),
    prisma.appointment.deleteMany({ where: { businessId } }),
    prisma.employeeService.deleteMany({ where: { employee: { businessId } } }),
    prisma.employeeWorkingHours.deleteMany({ where: { employee: { businessId } } }),
    prisma.employee.deleteMany({ where: { businessId } }),
    prisma.service.deleteMany({ where: { businessId } }),
    prisma.workingHoursBreak.deleteMany({ where: { workingHours: { businessId } } }),
    prisma.workingHours.deleteMany({ where: { businessId } }),
    prisma.specialDay.deleteMany({ where: { businessId } }),
    prisma.crmContact.deleteMany({ where: { businessId } }),
    prisma.crmTag.deleteMany({ where: { businessId } }),
    prisma.coupon.deleteMany({ where: { businessId } }),
    prisma.giftCard.deleteMany({ where: { businessId } }),
    prisma.membership.deleteMany({ where: { businessId } }),
    prisma.membershipPlan.deleteMany({ where: { businessId } }),
    prisma.invoice.deleteMany({ where: { businessId } }),
    prisma.businessSubscription.deleteMany({ where: { businessId } }),
    prisma.analyticsEvent.deleteMany({ where: { businessId } }),
    prisma.business.delete({ where: { id: businessId } }),
  ]);
}

// ── Akcja 1: Usuń profil salonu (konto użytkownika zostaje) ───────────────────

export async function confirmSalonDeletion(code: string): Promise<DangerState> {
  const user = await getServerUser();
  if (!user?.email) return { error: "Nie jesteś zalogowany." };

  const otpResult = await verifyDangerCode(user.id, code);
  if (otpResult.error) return { error: otpResult.error };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { select: { id: true }, take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) return { error: "Nie masz przypisanego salonu." };

  try {
    await deleteBusinessData(business.id);
  } catch (err) {
    console.error("[danger] salon delete failed, closing instead:", err);
    await prisma.business
      .update({ where: { id: business.id }, data: { status: "CLOSED" } })
      .catch(() => {});
    return {
      deleted: true,
      error: "Profil salonu został wyłączony z platformy. Pełne usunięcie zakończymy w ciągu 30 dni.",
    };
  }

  return { deleted: true };
}

// ── Akcja 2: Usuń konto (salon + konto użytkownika) ───────────────────────────

export async function confirmBusinessDeletion(code: string): Promise<DangerState> {
  const user = await getServerUser();
  if (!user?.email) return { error: "Nie jesteś zalogowany." };

  const otpResult = await verifyDangerCode(user.id, code);
  if (otpResult.error) return { error: otpResult.error };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { select: { id: true }, take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) return { error: "Nie masz przypisanego salonu." };

  try {
    // Usuń dane salonu
    await deleteBusinessData(business.id);

    // Usuń rekord użytkownika z Prisma
    if (dbUser?.id) {
      await prisma.user.delete({ where: { id: dbUser.id } }).catch(() => {});
    }

    // Usuń konto z Supabase Auth
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id).catch((err) => {
      console.error("[danger] supabase delete user failed:", err);
    });
  } catch (err) {
    console.error("[danger] account delete failed, closing instead:", err);
    await prisma.business
      .update({ where: { id: business.id }, data: { status: "CLOSED" } })
      .catch(() => {});
    return {
      deleted: true,
      error: "Salon został wyłączony. Pełne usunięcie danych zakończymy w ciągu 30 dni.",
    };
  }

  return { deleted: true };
}
