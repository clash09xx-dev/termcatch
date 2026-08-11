import "server-only";

import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/messaging";
import { sendEmail } from "@/lib/email";
import { channelAvailability } from "@/lib/marketing-config";
import { buildAudience, channelReach, renderMessage, type AudienceAppointment, type Channel } from "@/lib/marketing";
import { warsawDateString } from "@/lib/timezone";

/**
 * Deterministic marketing automations. Triggers are pure logic (never AI); AI
 * may only have helped author the message body. Every send is idempotent via a
 * unique MarketingDelivery.dedupeKey, so re-running the cron never double-sends.
 * Per-customer opt-in and channel configuration are always respected.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";
const HOUR = 3_600_000;

type AutomationRow = {
  id: string;
  businessId: string;
  type: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  config: unknown;
};

function isSyntheticEmail(email: string | null): boolean {
  return !email || email.endsWith("@termcatch.local") || email.endsWith("@unknown.termcatch.com");
}
function cfgNum(config: unknown, key: string, fallback: number): number {
  const v = (config as Record<string, unknown> | null)?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

type DeliverArgs = {
  businessId: string;
  automationId: string;
  channel: Channel;
  customerId: string;
  firstName: string;
  phone: string | null;
  email: string | null;
  salon: string;
  link: string;
  subject: string | null;
  body: string;
  usluga: string | null;
  pracownik: string | null;
  dedupeKey: string;
};

/** Claim the dedupeKey atomically, then send. Returns the outcome. */
async function deliver(a: DeliverArgs): Promise<"sent" | "skipped" | "failed"> {
  try {
    await prisma.marketingDelivery.create({
      data: { businessId: a.businessId, automationId: a.automationId, customerId: a.customerId, channel: a.channel, status: "sent", dedupeKey: a.dedupeKey },
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return "skipped"; // already delivered in this window
    return "failed";
  }

  const tokens = { firstName: a.firstName, salon: a.salon, link: a.link, usluga: a.usluga, pracownik: a.pracownik };
  const text = renderMessage(a.body, tokens);
  let ok = false;
  if (a.channel === "sms" && a.phone) {
    ok = await sendSms(a.phone, text);
  } else if (a.channel === "email" && a.email) {
    const subject = renderMessage(a.subject || `Wiadomość od ${a.salon}`, tokens);
    const res = await sendEmail({
      to: a.email,
      subject,
      heading: subject,
      lines: text.split("\n").filter((l) => l.trim().length > 0),
      ctaLabel: "Zarezerwuj termin",
      ctaUrl: a.link,
    });
    ok = res.sent;
  }
  if (!ok) {
    await prisma.marketingDelivery.update({ where: { dedupeKey: a.dedupeKey }, data: { status: "failed" } }).catch(() => {});
    return "failed";
  }
  return "sent";
}

const AUDIENCE_SELECT = {
  customerId: true,
  status: true,
  startTime: true,
  service: { select: { name: true } },
  employee: { select: { firstName: true, lastName: true } },
  customer: {
    select: { firstName: true, lastName: true, email: true, phone: true, marketingEmails: true, smsNotifications: true, whatsappNotifications: true },
  },
} as const;

type RunTally = { sent: number; skipped: number; failed: number };
const empty = (): RunTally => ({ sent: 0, skipped: 0, failed: 0 });
function add(t: RunTally, outcome: "sent" | "skipped" | "failed") { t[outcome]++; }

async function runWinback(auto: AutomationRow, biz: { id: string; name: string }, link: string): Promise<RunTally> {
  const t = empty();
  const days = cfgNum(auto.config, "days", 60);
  const channel = auto.channel as Channel;
  const appts = (await prisma.appointment.findMany({
    where: { businessId: biz.id },
    select: AUDIENCE_SELECT,
    orderBy: { startTime: "desc" },
    take: 5000,
  })) as unknown as AudienceAppointment[];
  const bucket = warsawDateString().slice(0, 7); // yyyy-mm — winback fires at most once/month/customer
  const targets = buildAudience(appts).filter(
    (r) => r.upcomingCount === 0 && r.completedCount >= 1 && r.lastCompletedAgeDays !== null && r.lastCompletedAgeDays >= days && channelReach(r, channel)
  );
  for (const r of targets) {
    add(t, await deliver({
      businessId: biz.id, automationId: auto.id, channel, customerId: r.id, firstName: r.firstName,
      phone: r.phone, email: r.email, salon: biz.name, link, subject: auto.subject, body: auto.body,
      usluga: r.lastService, pracownik: r.lastEmployee, dedupeKey: `auto:${auto.id}:${r.id}:${bucket}`,
    }));
  }
  return t;
}

async function runBirthday(auto: AutomationRow, biz: { id: string; name: string }, link: string): Promise<RunTally> {
  const t = empty();
  const channel = auto.channel as Channel;
  const todayMmdd = warsawDateString().slice(5); // mm-dd
  const year = warsawDateString().slice(0, 4);
  const users = await prisma.user.findMany({
    where: { appointments: { some: { businessId: biz.id } }, dateOfBirth: { not: null } },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, marketingEmails: true, smsNotifications: true },
    take: 5000,
  });
  for (const u of users) {
    if (!u.dateOfBirth) continue;
    const mmdd = `${String(u.dateOfBirth.getUTCMonth() + 1).padStart(2, "0")}-${String(u.dateOfBirth.getUTCDate()).padStart(2, "0")}`;
    if (mmdd !== todayMmdd) continue;
    const email = !isSyntheticEmail(u.email) && u.marketingEmails ? u.email : null;
    const phone = u.phone && u.smsNotifications ? u.phone : null;
    if (channel === "email" && !email) continue;
    if (channel === "sms" && !phone) continue;
    add(t, await deliver({
      businessId: biz.id, automationId: auto.id, channel, customerId: u.id, firstName: u.firstName,
      phone, email, salon: biz.name, link, subject: auto.subject, body: auto.body,
      usluga: null, pracownik: null, dedupeKey: `auto:${auto.id}:${u.id}:${year}`,
    }));
  }
  return t;
}

async function runAfterVisit(auto: AutomationRow, biz: { id: string; name: string }, link: string, now: Date): Promise<RunTally> {
  const t = empty();
  const channel = auto.channel as Channel;
  const delayHours = cfgNum(auto.config, "delayHours", 24);
  const upper = new Date(now.getTime() - delayHours * HOUR);
  const lower = new Date(upper.getTime() - 48 * HOUR); // 48h look-back tolerates hourly/daily cron cadence
  const appts = await prisma.appointment.findMany({
    where: { businessId: biz.id, status: "COMPLETED", endTime: { gte: lower, lte: upper } },
    select: {
      id: true, service: { select: { name: true } }, employee: { select: { firstName: true, lastName: true } },
      customer: { select: { id: true, firstName: true, email: true, phone: true, marketingEmails: true, smsNotifications: true } },
    },
    take: 2000,
  });
  for (const a of appts) {
    const c = a.customer;
    const email = !isSyntheticEmail(c.email) && c.marketingEmails ? c.email : null;
    const phone = c.phone && c.smsNotifications ? c.phone : null;
    if (channel === "email" && !email) continue;
    if (channel === "sms" && !phone) continue;
    add(t, await deliver({
      businessId: biz.id, automationId: auto.id, channel, customerId: c.id, firstName: c.firstName,
      phone, email, salon: biz.name, link, subject: auto.subject, body: auto.body,
      usluga: a.service?.name ?? null, pracownik: a.employee ? `${a.employee.firstName} ${a.employee.lastName}`.trim() : null,
      dedupeKey: `auto:${auto.id}:${a.id}`,
    }));
  }
  return t;
}

/**
 * Evaluate every ENABLED automation across all businesses and send what's due.
 * Called by the cron route. Idempotent; safe to run hourly or daily.
 */
export async function runDueAutomations(now: Date = new Date()): Promise<{ businesses: number; automations: number } & RunTally> {
  const autos = (await prisma.marketingAutomation.findMany({
    where: { enabled: true },
    select: { id: true, businessId: true, type: true, name: true, channel: true, subject: true, body: true, config: true },
  })) as AutomationRow[];

  const byBiz = new Map<string, AutomationRow[]>();
  for (const a of autos) {
    const list = byBiz.get(a.businessId);
    if (list) list.push(a);
    else byBiz.set(a.businessId, [a]);
  }

  const avail = channelAvailability();
  const total: RunTally = empty();
  let processedAutomations = 0;

  for (const [businessId, list] of byBiz) {
    const biz = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, name: true, slug: true } });
    if (!biz) continue;
    const link = `${APP_URL}/b/${biz.slug}`;
    const ranIds: string[] = [];
    for (const auto of list) {
      if (!avail[auto.channel as Channel]) continue; // channel not configured — skip silently
      let t: RunTally = empty();
      if (auto.type === "winback") t = await runWinback(auto, biz, link);
      else if (auto.type === "birthday") t = await runBirthday(auto, biz, link);
      else if (auto.type === "after_visit") t = await runAfterVisit(auto, biz, link, now);
      total.sent += t.sent; total.skipped += t.skipped; total.failed += t.failed;
      processedAutomations++;
      ranIds.push(auto.id);
    }
    if (ranIds.length) {
      await prisma.marketingAutomation.updateMany({ where: { id: { in: ranIds } }, data: { lastRunAt: now } }).catch(() => {});
    }
  }

  return { businesses: byBiz.size, automations: processedAutomations, ...total };
}
