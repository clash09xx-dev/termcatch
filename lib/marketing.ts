// ─── Marketing audience + message logic (pure, server-side) ──────────────────
// Shared by the Marketing page (display) and the sendCampaign server action
// (real send), so the audience a salon *sees* is exactly the audience that
// gets messaged. No fabricated counts: everything derives from real
// appointments + real customer opt-in flags. Delivery availability reflects
// the real Twilio/Resend configuration.

import { normalizePhone } from "@/lib/phone";

const DAY = 86_400_000;
const DORMANT_DAYS = 60;
const REGULAR_MIN_VISITS = 3;

export type Channel = "sms" | "whatsapp" | "email";
export type SegmentKey = "all" | "upcoming" | "regulars" | "dormant";

/** A customer reachable target, derived from their appointments + opt-ins. */
export type Recipient = {
  id: string;
  firstName: string;
  lastName: string;
  /** Real address only — synthetic walk-in emails are nulled out here. */
  email: string | null;
  phone: string | null; // normalized E.164, or null when not textable
  completedCount: number;
  upcomingCount: number;
  lastCompletedAgeDays: number | null; // days since last COMPLETED visit
  lastVisitISO: string | null;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
};

/** Minimal appointment shape this module needs (matches the Prisma include). */
export type AudienceAppointment = {
  customerId: string;
  status: string;
  startTime: Date;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    marketingEmails: boolean;
    smsNotifications: boolean;
    whatsappNotifications: boolean;
  };
};

function isSyntheticEmail(email: string): boolean {
  // Walk-in / manually-added customers get placeholder addresses that can't
  // receive mail — never count or message these.
  return email.endsWith("@termcatch.local") || email.endsWith("@unknown.termcatch.com");
}

/** Collapse a business's appointments into one Recipient per customer. */
export function buildAudience(appointments: AudienceAppointment[], now: number = Date.now()): Recipient[] {
  const byCustomer = new Map<string, AudienceAppointment[]>();
  for (const apt of appointments) {
    const list = byCustomer.get(apt.customerId);
    if (list) list.push(apt);
    else byCustomer.set(apt.customerId, [apt]);
  }

  const recipients: Recipient[] = [];
  for (const [id, appts] of byCustomer) {
    const c = appts[0].customer;
    let completedCount = 0;
    let upcomingCount = 0;
    let lastCompleted = 0;
    let lastVisit = 0;
    for (const a of appts) {
      const t = a.startTime.getTime();
      if (t > lastVisit) lastVisit = t;
      if (a.status === "COMPLETED") {
        completedCount++;
        if (t > lastCompleted) lastCompleted = t;
      } else if ((a.status === "PENDING" || a.status === "CONFIRMED") && t > now) {
        upcomingCount++;
      }
    }
    const realEmail = c.email && !isSyntheticEmail(c.email) ? c.email : null;
    const normPhone = c.phone ? normalizePhone(c.phone) : null;
    recipients.push({
      id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: realEmail,
      phone: normPhone,
      completedCount,
      upcomingCount,
      lastCompletedAgeDays: lastCompleted ? Math.floor((now - lastCompleted) / DAY) : null,
      lastVisitISO: lastVisit ? new Date(lastVisit).toISOString() : null,
      smsOptIn: c.smsNotifications,
      whatsappOptIn: c.whatsappNotifications,
      emailOptIn: c.marketingEmails,
    });
  }
  return recipients;
}

/** The four honest, data-backed audiences. */
export const SEGMENTS: {
  key: SegmentKey;
  label: string;
  hint: string;
  match: (r: Recipient) => boolean;
}[] = [
  {
    key: "all",
    label: "Wszyscy klienci",
    hint: "Każdy, kto ma u Ciebie choć jedną wizytę.",
    match: () => true,
  },
  {
    key: "upcoming",
    label: "Nadchodzące wizyty",
    hint: "Klienci z zaplanowaną wizytą — przypomnienie lub dopięcie szczegółów.",
    match: (r) => r.upcomingCount >= 1,
  },
  {
    key: "regulars",
    label: "Stali klienci",
    hint: `Co najmniej ${REGULAR_MIN_VISITS} zakończone wizyty — Twoja najlojalniejsza baza.`,
    match: (r) => r.completedCount >= REGULAR_MIN_VISITS,
  },
  {
    key: "dormant",
    label: "Uśpieni",
    hint: `Bez wizyty od ponad ${DORMANT_DAYS} dni i bez rezerwacji — dobry moment, by przypomnieć o sobie.`,
    match: (r) =>
      r.upcomingCount === 0 &&
      r.completedCount >= 1 &&
      r.lastCompletedAgeDays !== null &&
      r.lastCompletedAgeDays > DORMANT_DAYS,
  },
];

export function segmentByKey(key: SegmentKey) {
  return SEGMENTS.find((s) => s.key === key) ?? SEGMENTS[0];
}

/** Is this recipient reachable on a given channel (has address + opted in)? */
export function channelReach(r: Recipient, channel: Channel): boolean {
  if (channel === "email") return r.email !== null && r.emailOptIn;
  if (channel === "sms") return r.phone !== null && r.smsOptIn;
  return r.phone !== null && r.whatsappOptIn; // whatsapp
}

export type ChannelAvailability = Record<Channel, boolean>;

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

/** The env var a salon must set to enable each channel (for honest guidance). */
export const CHANNEL_ENV_HINT: Record<Channel, string> = {
  sms: "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER",
  whatsapp: "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM",
  email: "RESEND_API_KEY",
};

/** Fill message tokens with real values. Unknown tokens are left intact. */
export function renderMessage(
  template: string,
  ctx: { firstName: string; salon: string; link: string }
): string {
  return template
    .replace(/\{imię\}/g, ctx.firstName)
    .replace(/\{imie\}/g, ctx.firstName)
    .replace(/\{salon\}/g, ctx.salon)
    .replace(/\{link\}/g, ctx.link);
}
