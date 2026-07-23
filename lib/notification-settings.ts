import { prisma } from "@/lib/prisma";

/**
 * Preferencje powiadomień salonu — przechowywane w kolumnie JSONB
 * businesses.notification_settings. Dostęp przez raw SQL, żeby działać
 * niezależnie od wersji wygenerowanego klienta Prisma.
 *
 * Two layers:
 *  - channel masters: emailEnabled / smsEnabled (+ smsPhone) / whatsapp (off).
 *  - per-event matrix: `events[event] = { inApp, email, sms }` — the salon can
 *    control each event independently. Dispatch consults `salonWants(...)`.
 */

// Salon-directed events that actually dispatch to the owner today.
export const SALON_EVENTS = [
  { key: "newBooking", label: "Nowa rezerwacja" },
  { key: "cancellation", label: "Anulowanie rezerwacji" },
  { key: "reschedule", label: "Przełożenie wizyty" },
  { key: "newReview", label: "Nowa opinia" },
] as const;

export type SalonEventKey = (typeof SALON_EVENTS)[number]["key"];
export type NotifChannel = "inApp" | "email" | "sms";
export type EventChannels = { inApp: boolean; email: boolean; sms: boolean };

export type BusinessNotificationSettings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  smsPhone: string;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  events: Record<SalonEventKey, EventChannels>;
};

// Sensible defaults: in-app + email on for every event; SMS opt-in (off) since
// it costs money and requires the gateway.
function defaultEventChannels(): EventChannels {
  return { inApp: true, email: true, sms: false };
}
function defaultEvents(): Record<SalonEventKey, EventChannels> {
  return SALON_EVENTS.reduce(
    (acc, e) => ({ ...acc, [e.key]: defaultEventChannels() }),
    {} as Record<SalonEventKey, EventChannels>
  );
}

export const DEFAULT_NOTIFICATION_SETTINGS: BusinessNotificationSettings = {
  emailEnabled: true,
  smsEnabled: false,
  smsPhone: "",
  whatsappEnabled: false,
  whatsappPhone: "",
  events: defaultEvents(),
};

/** Should the salon receive `event` via `channel`? Master switch AND per-event. */
export function salonWants(
  settings: BusinessNotificationSettings,
  event: SalonEventKey,
  channel: NotifChannel
): boolean {
  const ev = settings.events?.[event] ?? defaultEventChannels();
  if (channel === "inApp") return ev.inApp;
  if (channel === "email") return settings.emailEnabled && ev.email;
  // sms
  return settings.smsEnabled && !!settings.smsPhone && ev.sms;
}

function coerceEvents(raw: unknown): Record<SalonEventKey, EventChannels> {
  const out = defaultEvents();
  if (raw && typeof raw === "object") {
    for (const { key } of SALON_EVENTS) {
      const e = (raw as Record<string, Partial<EventChannels>>)[key];
      if (e && typeof e === "object") {
        out[key] = {
          inApp: e.inApp ?? true,
          email: e.email ?? true,
          sms: e.sms ?? false,
        };
      }
    }
  }
  return out;
}

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
          events: coerceEvents(s.events),
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
