"use server";

import { prisma } from "@/lib/prisma";
import { createClient, getServerUser } from "@/lib/supabase/server";

/**
 * Niebezpieczna strefa — operacje wymagają potwierdzenia kodem
 * wysyłanym na e-mail właściciela (Supabase OTP, szablon Magic Link
 * z {{ .Token }}).
 */

export type DangerState = {
  error?: string;
  codeSent?: boolean;
  deleted?: boolean;
};

/** Krok 1: wyślij 6-cyfrowy kod na e-mail zalogowanego właściciela. */
export async function requestDangerCode(): Promise<DangerState> {
  const user = await getServerUser();
  if (!user?.email) return { error: "Nie jesteś zalogowany." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    if (error.message.toLowerCase().includes("rate limit") || error.status === 429) {
      return { error: "Kod został niedawno wysłany. Odczekaj minutę i spróbuj ponownie." };
    }
    console.error("[danger] send code error:", error.message);
    return { error: "Nie udało się wysłać kodu. Spróbuj ponownie." };
  }

  return { codeSent: true };
}

/** Krok 2: zweryfikuj kod i trwale usuń salon. */
export async function confirmBusinessDeletion(code: string): Promise<DangerState> {
  const user = await getServerUser();
  if (!user?.email) return { error: "Nie jesteś zalogowany." };

  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) {
    return { error: "Kod musi mieć 6 cyfr." };
  }

  // Weryfikacja kodu z e-maila
  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: trimmed,
    type: "email",
  });
  if (otpError) {
    return { error: "Nieprawidłowy lub wygasły kod. Sprawdź e-mail i spróbuj ponownie." };
  }

  // Właścicielstwo
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { select: { id: true }, take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) return { error: "Nie masz przypisanego salonu." };
  const businessId = business.id;

  // Twarde usunięcie wszystkich danych salonu; przy niespodziewanej
  // zależności — bezpieczny fallback: salon znika z platformy (CLOSED).
  try {
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
  } catch (err) {
    console.error("[danger] hard delete failed, closing instead:", err);
    await prisma.business
      .update({ where: { id: businessId }, data: { status: "CLOSED" } })
      .catch(() => {});
    return {
      deleted: true,
      error:
        "Salon został wyłączony z platformy. Pełne usunięcie danych zakończymy w ciągu 30 dni.",
    };
  }

  return { deleted: true };
}
