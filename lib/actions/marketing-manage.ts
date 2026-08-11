"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * CRUD for reusable marketing templates + deterministic automation rules.
 * All scoped to the logged-in owner's business (never trusts a client id).
 */

async function ownedBusinessId(): Promise<string | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  return dbUser?.ownedBusinesses[0]?.id ?? null;
}

export type ManageResult = { ok: boolean; error?: string };

const CHANNELS = ["sms", "email", "whatsapp"];
const AUTO_CHANNELS = ["sms", "email"];
const AUTO_TYPES = ["birthday", "after_visit", "winback"];

// ── Templates ────────────────────────────────────────────────────────────────
export async function saveTemplate(input: {
  id?: string;
  name: string;
  channel?: string | null;
  subject?: string | null;
  body: string;
}): Promise<ManageResult> {
  const businessId = await ownedBusinessId();
  if (!businessId) return { ok: false, error: "Brak dostępu." };
  const name = input.name?.trim();
  const body = input.body?.trim();
  if (!name) return { ok: false, error: "Podaj nazwę szablonu." };
  if (!body) return { ok: false, error: "Treść nie może być pusta." };
  const channel = input.channel && CHANNELS.includes(input.channel) ? input.channel : null;
  const subject = input.subject?.trim() || null;

  if (input.id) {
    const updated = await prisma.marketingTemplate.updateMany({
      where: { id: input.id, businessId },
      data: { name, channel, subject, body },
    });
    if (updated.count === 0) return { ok: false, error: "Nie znaleziono szablonu." };
  } else {
    await prisma.marketingTemplate.create({ data: { businessId, name, channel, subject, body } });
  }
  revalidatePath("/business/marketing");
  return { ok: true };
}

export async function deleteTemplate(id: string): Promise<ManageResult> {
  const businessId = await ownedBusinessId();
  if (!businessId) return { ok: false, error: "Brak dostępu." };
  await prisma.marketingTemplate.deleteMany({ where: { id: String(id), businessId } });
  revalidatePath("/business/marketing");
  return { ok: true };
}

// ── Automations ──────────────────────────────────────────────────────────────
export async function saveAutomation(input: {
  id?: string;
  type: string;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
  days?: number;
  delayHours?: number;
}): Promise<ManageResult> {
  const businessId = await ownedBusinessId();
  if (!businessId) return { ok: false, error: "Brak dostępu." };
  if (!AUTO_TYPES.includes(input.type)) return { ok: false, error: "Nieprawidłowy typ automatyzacji." };
  if (!AUTO_CHANNELS.includes(input.channel)) return { ok: false, error: "Kanał: SMS lub e-mail." };
  const name = input.name?.trim() || defaultAutomationName(input.type);
  const body = input.body?.trim();
  if (!body) return { ok: false, error: "Treść nie może być pusta." };
  const subject = input.subject?.trim() || null;

  const config: Record<string, number> = {};
  if (input.type === "winback") config.days = clampInt(input.days, 60, 14, 365);
  if (input.type === "after_visit") config.delayHours = clampInt(input.delayHours, 24, 1, 168);

  if (input.id) {
    const updated = await prisma.marketingAutomation.updateMany({
      where: { id: input.id, businessId },
      data: { type: input.type, name, channel: input.channel, subject, body, config },
    });
    if (updated.count === 0) return { ok: false, error: "Nie znaleziono automatyzacji." };
  } else {
    await prisma.marketingAutomation.create({
      data: { businessId, type: input.type, name, channel: input.channel, subject, body, config, enabled: false },
    });
  }
  revalidatePath("/business/marketing");
  return { ok: true };
}

export async function toggleAutomation(id: string, enabled: boolean): Promise<ManageResult> {
  const businessId = await ownedBusinessId();
  if (!businessId) return { ok: false, error: "Brak dostępu." };
  const updated = await prisma.marketingAutomation.updateMany({
    where: { id: String(id), businessId },
    data: { enabled: Boolean(enabled) },
  });
  if (updated.count === 0) return { ok: false, error: "Nie znaleziono automatyzacji." };
  revalidatePath("/business/marketing");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<ManageResult> {
  const businessId = await ownedBusinessId();
  if (!businessId) return { ok: false, error: "Brak dostępu." };
  await prisma.marketingAutomation.deleteMany({ where: { id: String(id), businessId } });
  revalidatePath("/business/marketing");
  return { ok: true };
}

function defaultAutomationName(type: string): string {
  return type === "birthday" ? "Życzenia urodzinowe" : type === "after_visit" ? "Podziękowanie po wizycie" : "Odzyskanie klienta";
}
function clampInt(v: number | undefined, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? Math.trunc(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
