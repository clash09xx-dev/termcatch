"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getServerI18n } from "@/lib/i18n/server";

/**
 * Per-customer notes in the business panel.
 *
 * Reuses the existing CrmContact table rather than adding a second customer
 * store: the model already carries firstName/lastName/contact/notes and is
 * uniquely keyed on (businessId, userId), which is exactly the grain a note
 * needs. Rows are created lazily on first save, so a salon that never writes a
 * note never grows a CRM table.
 *
 * Deliberately NOT medical. This is the same free-text field a paper card would
 * have — preferences, allergies the client volunteered, "prefers mornings" —
 * and it is scoped to one business, never shared between salons.
 */

export type NoteResult = { ok: true } | { ok: false; error: string };

const MAX_NOTE = 4000;

export async function saveCustomerNote(customerUserId: string, notes: string): Promise<NoteResult> {
  const { dict } = await getServerI18n();

  const user = await getServerUser();
  if (!user) return { ok: false, error: dict.errors.forbidden };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const businessId = dbUser?.ownedBusinesses[0]?.id;
  if (!businessId) return { ok: false, error: dict.errors.forbidden };

  // The note may only be attached to someone who has actually booked here.
  // Without this check an owner could write notes against arbitrary user ids.
  const isCustomerHere = await prisma.appointment.findFirst({
    where: { businessId, customerId: String(customerUserId) },
    select: { id: true },
  });
  if (!isCustomerHere) return { ok: false, error: dict.errors.forbidden };

  const customer = await prisma.user.findUnique({
    where: { id: String(customerUserId) },
    select: { firstName: true, lastName: true, email: true, phone: true },
  });
  if (!customer) return { ok: false, error: dict.errors.generic };

  const text = notes.trim().slice(0, MAX_NOTE);

  await prisma.crmContact.upsert({
    where: { businessId_userId: { businessId, userId: String(customerUserId) } },
    create: {
      businessId,
      userId: String(customerUserId),
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      notes: text || null,
    },
    update: { notes: text || null },
  });

  revalidatePath("/business/crm");
  return { ok: true };
}
