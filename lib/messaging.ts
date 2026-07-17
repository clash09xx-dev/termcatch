/**
 * SMS i WhatsApp przez Twilio (REST API, bez SDK).
 * Graceful no-op, gdy klucze Twilio nie są skonfigurowane —
 * wysyłka po prostu jest pomijana z logiem, aplikacja działa dalej.
 */

import { sendRawSms, smsReady } from "@/lib/sms";

function twilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  return sid.startsWith("AC") && sid.length > 10 && token.length > 10 && !token.includes("...");
}

/**
 * Czy kanał SMS/WhatsApp jest realnie skonfigurowany do wysyłki.
 * Odzwierciedla dokładnie warunki bramkujące w sendSms/sendWhatsApp,
 * żeby UI mógł uczciwie pokazać dostępność wysyłki (bez udawania sukcesu).
 */
export function smsConfigured(): boolean {
  // SMS_ENABLED is the launch kill-switch: even with valid Twilio credentials
  // nothing sends (and no UI claims SMS works) until it's explicitly true.
  return smsReady();
}

/**
 * WhatsApp is NOT part of the current launch. The implementation stays, but
 * everything is gated behind WHATSAPP_ENABLED (default off). This check is
 * server-side — manipulated client state cannot trigger a send.
 */
export function whatsappEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true";
}

export function whatsappConfigured(): boolean {
  if (!whatsappEnabled()) return false;
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "";
  return twilioConfigured() && from.length > 0 && !from.includes("...");
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

import { normalizePhone } from "@/lib/phone";
export { normalizePhone };

export async function sendSms(toPhone: string, body: string): Promise<boolean> {
  // Delegates to the SMS provider core (flag gate, Messaging Service support,
  // retry on temporary failures, masked logging).
  return sendRawSms(toPhone, body);
}

export async function sendWhatsApp(toPhone: string, body: string): Promise<boolean> {
  if (!whatsappEnabled()) {
    console.log("[messaging:skipped] WhatsApp wyłączony (WHATSAPP_ENABLED)");
    return false;
  }
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from || from.includes("...")) {
    console.log("[messaging:skipped] brak TWILIO_WHATSAPP_FROM");
    return false;
  }
  const to = normalizePhone(toPhone);
  if (!to) return false;
  return twilioSend(`whatsapp:${to}`, from, body);
}
