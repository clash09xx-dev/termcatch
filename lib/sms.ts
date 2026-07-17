// ─── Transactional SMS (Twilio) — feature-gated, idempotent, private ─────────
// Launch rules:
// - Hard OFF unless SMS_ENABLED=true AND Twilio credentials are configured —
//   the gate lives server-side, so no client state can trigger a send.
// - Transactional only (booking lifecycle + reminders). No promotional SMS.
// - Full phone numbers and message bodies are never persisted or logged:
//   the audit row stores a masked number and a template key.
// - dedupeKey makes every business event send at most once (DB unique).

import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export type SmsTemplate = "booked" | "confirmed" | "rescheduled" | "cancelled" | "declined" | "reminder" | "salon" | "marketing";

export function smsFlagEnabled(): boolean {
  return process.env.SMS_ENABLED === "true";
}

function real(v: string | undefined, prefix?: string): boolean {
  if (!v || v.includes("...")) return false;
  return prefix ? v.startsWith(prefix) && v.length > 10 : v.length > 5;
}

function twilioCreds(): { sid: string; token: string; msgService?: string; from?: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!real(sid, "AC") || !real(token)) return null;
  const msgService = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!real(msgService, "MG") && !real(from)) return null;
  return { sid: sid!, token: token!, msgService: real(msgService, "MG") ? msgService : undefined, from: real(from) ? from : undefined };
}

/** SMS is genuinely available: flag on AND provider configured. */
export function smsReady(): boolean {
  return smsFlagEnabled() && twilioCreds() !== null;
}

/** +48123456789 → +48•••••6789 — safe for logs and the audit table. */
export function maskPhone(e164: string): string {
  if (e164.length <= 7) return "•".repeat(e164.length);
  return `${e164.slice(0, 3)}${"•".repeat(e164.length - 7)}${e164.slice(-4)}`;
}

type RawResult = { ok: boolean; sid?: string; retryable?: boolean; error?: string };

async function twilioSendOnce(to: string, body: string): Promise<RawResult> {
  const creds = twilioCreds();
  if (!creds) return { ok: false, error: "unconfigured" };
  const params = new URLSearchParams({ To: to, Body: body });
  if (creds.msgService) params.set("MessagingServiceSid", creds.msgService);
  else params.set("From", creds.from!);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl?.startsWith("https://")) params.set("StatusCallback", `${appUrl}/api/sms/status`);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.sid}:${creds.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (res.ok) {
      const data = (await res.json()) as { sid?: string };
      return { ok: true, sid: data.sid };
    }
    return { ok: false, retryable: res.status === 429 || res.status >= 500, error: `http_${res.status}` };
  } catch {
    return { ok: false, retryable: true, error: "network" };
  }
}

/** Low-level send with a single retry on temporary failures. No persistence. */
export async function sendRawSms(toPhone: string, body: string): Promise<boolean> {
  if (!smsReady()) {
    console.log("[sms:skipped] wysyłka wyłączona lub nieskonfigurowana");
    return false;
  }
  const to = normalizePhone(toPhone);
  if (!to) return false;
  let res = await twilioSendOnce(to, body);
  if (!res.ok && res.retryable) {
    await new Promise((r) => setTimeout(r, 500));
    res = await twilioSendOnce(to, body);
  }
  console.log(`[sms] to=${maskPhone(to)} ok=${res.ok}${res.error ? ` err=${res.error}` : ""}`);
  return res.ok;
}

export type TransactionalSmsInput = {
  toPhone: string;
  body: string;
  template: SmsTemplate;
  /** One send per key, ever — e.g. "sms:confirmed:<appointmentId>". */
  dedupeKey: string;
  appointmentId?: string;
};

/**
 * Idempotent transactional send with an audit row. Duplicate events
 * (double-clicks, retries, replays) are absorbed by the unique dedupeKey.
 */
export async function sendTransactionalSms(input: TransactionalSmsInput): Promise<{ sent: boolean; reason?: string }> {
  if (!smsFlagEnabled()) return { sent: false, reason: "disabled" };
  const to = normalizePhone(input.toPhone);
  if (!to) return { sent: false, reason: "invalid_phone" };

  let recordId: string;
  try {
    const rec = await prisma.smsMessage.create({
      data: {
        dedupeKey: input.dedupeKey,
        toMasked: maskPhone(to),
        template: input.template,
        appointmentId: input.appointmentId ?? null,
        status: "QUEUED",
      },
      select: { id: true },
    });
    recordId = rec.id;
  } catch (e) {
    // Unique violation → this event was already handled.
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return { sent: false, reason: "duplicate" };
    }
    throw e;
  }

  if (!smsReady()) {
    await prisma.smsMessage.update({ where: { id: recordId }, data: { status: "SKIPPED", error: "unconfigured" } });
    return { sent: false, reason: "unconfigured" };
  }

  let res = await twilioSendOnce(to, input.body);
  if (!res.ok && res.retryable) {
    await new Promise((r) => setTimeout(r, 500));
    res = await twilioSendOnce(to, input.body);
  }

  await prisma.smsMessage.update({
    where: { id: recordId },
    data: res.ok ? { status: "SENT", providerSid: res.sid ?? null } : { status: "FAILED", error: res.error ?? "unknown" },
  });
  console.log(`[sms] template=${input.template} to=${maskPhone(to)} ok=${res.ok}`);
  return { sent: res.ok, reason: res.ok ? undefined : res.error };
}

/**
 * Twilio webhook signature (X-Twilio-Signature): base64 HMAC-SHA1 of the full
 * URL + form params sorted by key with values appended. Pure — unit-tested.
 */
export function verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
