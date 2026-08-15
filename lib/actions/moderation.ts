"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getServerI18n } from "@/lib/i18n/server";
import { isReportReason } from "@/lib/moderation";

/**
 * Blocking and reporting a business.
 *
 * The only interaction the product has between two parties is customer ↔
 * business, so that is the only thing these actions cover. There is no
 * messaging and no customer-to-customer surface, which is why there is no
 * "block a user" action: it would be a button with nothing behind it.
 */

export type ModerationResult = { ok: true } | { ok: false; error: string };

async function currentDbUserId(): Promise<string | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  return dbUser?.id ?? null;
}

/**
 * Block a salon.
 *
 * Idempotent: blocking twice is a no-op rather than an error, because the
 * button can be double-tapped and the outcome the user wanted is the same.
 * An owner cannot block their own salon — it would hide their own business
 * from their own search results for no reason.
 */
export async function blockBusiness(businessId: string): Promise<ModerationResult> {
  const { dict } = await getServerI18n();
  const userId = await currentDbUserId();
  if (!userId) return { ok: false, error: dict.errors.forbidden };

  const business = await prisma.business.findUnique({
    where: { id: String(businessId) },
    select: { id: true, ownerId: true, slug: true },
  });
  if (!business) return { ok: false, error: dict.errors.generic };
  if (business.ownerId === userId) return { ok: false, error: dict.errors.forbidden };

  await prisma.blockedBusiness.upsert({
    where: { userId_businessId: { userId, businessId: business.id } },
    create: { userId, businessId: business.id },
    update: {},
  });

  // A blocked salon should also stop being a favourite — keeping it there
  // would put it straight back in front of the person who just hid it.
  await prisma.favouriteBusiness
    .deleteMany({ where: { userId, businessId: business.id } })
    .catch(() => {});

  revalidatePath("/search");
  revalidatePath(`/b/${business.slug}`);
  return { ok: true };
}

export async function unblockBusiness(businessId: string): Promise<ModerationResult> {
  const { dict } = await getServerI18n();
  const userId = await currentDbUserId();
  if (!userId) return { ok: false, error: dict.errors.forbidden };

  await prisma.blockedBusiness.deleteMany({ where: { userId, businessId: String(businessId) } });
  revalidatePath("/search");
  return { ok: true };
}

/**
 * File a report for moderation.
 *
 * Creates a row an admin can act on rather than sending an email into a void.
 * One open report per person per target: re-reporting the same salon updates
 * the existing row instead of flooding the queue with duplicates.
 */
export async function reportBusiness(input: {
  businessId: string;
  reason: string;
  details?: string;
}): Promise<ModerationResult> {
  const { dict } = await getServerI18n();
  const userId = await currentDbUserId();
  if (!userId) return { ok: false, error: dict.errors.forbidden };

  if (!isReportReason(input.reason)) return { ok: false, error: dict.errors.generic };

  const business = await prisma.business.findUnique({
    where: { id: String(input.businessId) },
    select: { id: true },
  });
  if (!business) return { ok: false, error: dict.errors.generic };

  const details = (input.details ?? "").trim().slice(0, 2000) || null;

  const existing = await prisma.report.findFirst({
    where: { reporterId: userId, targetType: "business", targetId: business.id, status: "open" },
    select: { id: true },
  });

  if (existing) {
    await prisma.report.update({
      where: { id: existing.id },
      data: { reason: input.reason, details },
    });
  } else {
    await prisma.report.create({
      data: {
        reporterId: userId,
        targetType: "business",
        targetId: business.id,
        reason: input.reason,
        details,
      },
    });
  }

  return { ok: true };
}
