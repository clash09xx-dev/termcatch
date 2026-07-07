"use server";

import { prisma } from "@/lib/prisma";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Niebezpieczna strefa — operacje wymagają potwierdzenia kodem
 * wysyłanym na e-mail właściciela (Supabase OTP / Magic Link).
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
    options: {
      shouldCreateUser: false,
      // Wymuś 6-cyfrowy OTP zamiast magic link
      data: {},
    },
  });

  if (error) {
    console.error("[danger] signInWithOtp error:", error.status, error.message);

    if (error.status === 429 || error.message.toLowerCase().includes("rate limit")) {
      return { error: "Kod został niedawno wysłany. Odczekaj chwilę i spróbuj ponownie." };
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Adres e-mail nie jest potwierdzony. Sprawdź skrzynkę i potwierdź konto." };
    }
    if (error.message.toLowerCase().includes("user not found") || error.status === 422) {
      return { error: "Nie znaleziono użytkownika. Spróbuj wylogować się i zalogować ponownie." };
    }

    return {
      error: `Nie udało się wysłać kodu (${error.message}). Sprawdź czy w Supabase Auth włączone jest OTP e-mail.`,
    };
  }

  return { codeSent: true };
}

// ── Shared OTP verification ───────────────────────────────────────────────────

async function verifyOtpCode(
  email: string,
  code: string
): Promise<{ error?: string }> {
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) {
    return { error: "Kod musi mieć 6 cyfr." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: trimmed,
    type: "email",
  });

  if (error) {
    console.error("[danger] verifyOtp error:", error.status, error.message);
    return { error: "Nieprawidłowy lub wygasły kod. Sprawdź e-mail i spróbuj ponownie." };
  }

  return {};
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

  const otpResult = await verifyOtpCode(user.email, code);
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

  const otpResult = await verifyOtpCode(user.email, code);
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
