import { prisma } from "@/lib/prisma";

/**
 * Preferencje powiadomień salonu — przechowywane w kolumnie JSONB
 * businesses.notification_settings. Dostęp przez raw SQL, żeby działać
 * niezależnie od wersji wygenerowanego klienta Prisma.
 */

export type BusinessNotificationSettings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  smsPhone: string;
  whatsappEnabled: boolean;
  whatsappPhone: string;
};

export const DEFAULT_NOTIFICATION_SETTINGS: BusinessNotificationSettings = {
  emailEnabled: true,
  smsEnabled: false,
  smsPhone: "",
  whatsappEnabled: false,
  whatsappPhone: "",
};

export async function getBusinessNotificationSettings(
  businessId: string
): Promise<{ settings: BusinessNotificationSettings; configured: boolean }> {
  try {
    const rows = await prisma.$queryRaw<{ notification_settings: unknown }[]>`
      SELECT notification_settings FROM businesses WHERE id = ${businessId} LIMIT 1`;
    const raw = rows[0]?.notification_settings;
    if (raw && typeof raw === "object") {
      const s = raw as Partial<BusinessNotificationSettings>;
      return {
        configured: true,
        settings: {
          emailEnabled: s.emailEnabled ?? true,
          smsEnabled: s.smsEnabled ?? false,
          smsPhone: s.smsPhone ?? "",
          whatsappEnabled: s.whatsappEnabled ?? false,
          whatsappPhone: s.whatsappPhone ?? "",
        },
      };
    }
    return { settings: DEFAULT_NOTIFICATION_SETTINGS, configured: false };
  } catch (err) {
    // Kolumna może jeszcze nie istnieć (przed `prisma db push`)
    console.error("[notification-settings] read error:", err);
    return { settings: DEFAULT_NOTIFICATION_SETTINGS, configured: false };
  }
}

export async function saveBusinessNotificationSettings(
  businessId: string,
  settings: BusinessNotificationSettings
): Promise<boolean> {
  try {
    await prisma.$executeRaw`
      UPDATE businesses
      SET notification_settings = ${JSON.stringify(settings)}::jsonb
      WHERE id = ${businessId}`;
    return true;
  } catch (err) {
    console.error("[notification-settings] write error:", err);
    return false;
  }
}
