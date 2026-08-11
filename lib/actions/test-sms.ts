"use server";

import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendSms, twilioSmsConfigured } from "@/lib/twilio";
import { getBusinessNotificationSettings } from "@/lib/notification-settings";

/**
 * Owner-only diagnostic: send exactly one test SMS to the salon's configured
 * notification number. Rate-limited (in-memory, per owner) so it can't be spammed.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > MAX_PER_WINDOW;
}

export async function sendTestSms(): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser();
  if (!user) return { ok: false, error: "Brak dostępu." };
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const businessId = dbUser?.ownedBusinesses[0]?.id;
  if (!dbUser || !businessId) return { ok: false, error: "Tylko właściciel może wysłać testowy SMS." };

  if (rateLimited(`test-sms:${dbUser.id}`)) return { ok: false, error: "Zbyt wiele prób. Spróbuj za chwilę." };
  if (!twilioSmsConfigured()) return { ok: false, error: "Bramka SMS nie jest jeszcze skonfigurowana." };

  const { settings } = await getBusinessNotificationSettings(businessId);
  const phone = settings.smsPhone?.trim();
  if (!phone) return { ok: false, error: "Najpierw zapisz numer telefonu do powiadomień SMS." };

  const res = await sendSms(phone, "TermCatch: wiadomości SMS działają poprawnie.");
  if (!res.ok) return { ok: false, error: "Nie udało się wysłać SMS. Sprawdź numer i konfigurację." };
  return { ok: true };
}
