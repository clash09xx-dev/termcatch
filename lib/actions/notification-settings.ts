"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/messaging";
import {
  saveBusinessNotificationSettings,
  type BusinessNotificationSettings,
} from "@/lib/notification-settings";

export type NotificationSettingsState = {
  error?: string;
  success?: string;
};

export async function updateNotificationSettingsAction(
  prevState: NotificationSettingsState,
  formData: FormData
): Promise<NotificationSettingsState> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { select: { id: true }, take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) return { error: "Nie masz przypisanego salonu." };

  const smsEnabled = formData.get("smsEnabled") === "on";
  const whatsappEnabled = formData.get("whatsappEnabled") === "on";
  const smsPhone = ((formData.get("smsPhone") as string) ?? "").trim();
  const whatsappPhone = ((formData.get("whatsappPhone") as string) ?? "").trim();

  if (smsEnabled && !normalizePhone(smsPhone)) {
    return { error: "Podaj prawidłowy numer telefonu dla SMS (np. +48 600 000 000)." };
  }
  if (whatsappEnabled && !normalizePhone(whatsappPhone)) {
    return { error: "Podaj prawidłowy numer telefonu dla WhatsApp." };
  }

  const settings: BusinessNotificationSettings = {
    emailEnabled: formData.get("emailEnabled") === "on",
    smsEnabled,
    smsPhone,
    whatsappEnabled,
    whatsappPhone,
  };

  const ok = await saveBusinessNotificationSettings(business.id, settings);
  if (!ok) {
    return { error: "Nie udało się zapisać ustawień. Spróbuj ponownie." };
  }

  revalidatePath("/business/settings");
  return { success: "Ustawienia powiadomień zapisane." };
}
