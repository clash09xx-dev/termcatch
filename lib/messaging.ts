/**
 * SMS i WhatsApp przez Twilio (REST API, bez SDK).
 * Graceful no-op, gdy klucze Twilio nie są skonfigurowane —
 * wysyłka po prostu jest pomijana z logiem, aplikacja działa dalej.
 */

function twilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  return sid.startsWith("AC") && sid.length > 10 && token.length > 10 && !token.includes("...");
}

async function twilioSend(to: string, from: string, body: string): Promise<boolean> {
  if (!twilioConfigured()) {
    console.log(`[messaging:skipped] ${to} — brak konfiguracji Twilio`);
    return false;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      }
    );
    if (!res.ok) {
      console.error("[messaging:error]", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[messaging:error]", err);
    return false;
  }
}

/** Normalizuje polski numer do formatu E.164 (+48...). */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[\s\-()]/g, "");
  if (/^\+\d{9,15}$/.test(digits)) return digits;
  if (/^\d{9}$/.test(digits)) return `+48${digits}`;
  if (/^48\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export async function sendSms(toPhone: string, body: string): Promise<boolean> {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from || from.includes("...")) {
    console.log("[messaging:skipped] brak TWILIO_FROM_NUMBER");
    return false;
  }
  const to = normalizePhone(toPhone);
  if (!to) return false;
  return twilioSend(to, from, body);
}

export async function sendWhatsApp(toPhone: string, body: string): Promise<boolean> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from || from.includes("...")) {
    console.log("[messaging:skipped] brak TWILIO_WHATSAPP_FROM");
    return false;
  }
  const to = normalizePhone(toPhone);
  if (!to) return false;
  return twilioSend(`whatsapp:${to}`, from, body);
}
