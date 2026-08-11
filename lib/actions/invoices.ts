"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { fakturowniaConfigured } from "@/lib/fakturownia/client";
import { buildInvoiceDraftFromAppointment, issueInvoiceForBusiness } from "@/lib/ai/features/invoices";

async function ownerBusiness(): Promise<{ businessId: string; userId: string } | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!dbUser || !business) return null;
  return { businessId: business.id, userId: dbUser.id };
}

export type InvoicePreview =
  | { ok: true; buyerName: string; buyerEmail: string | null; total: number; currency: string; taxRate: number; serviceName: string }
  | { ok: false; error: string };

/** Preview the invoice that would be issued for a completed appointment (no external call). */
export async function previewInvoiceAction(appointmentId: string): Promise<InvoicePreview> {
  const owner = await ownerBusiness();
  if (!owner) return { ok: false, error: "Brak dostępu." };
  if (!fakturowniaConfigured()) return { ok: false, error: "Integracja Fakturownia nie jest skonfigurowana." };
  const res = await buildInvoiceDraftFromAppointment(owner.businessId, String(appointmentId));
  if (!res.ok) return { ok: false, error: res.error };
  const d = res.draft;
  return {
    ok: true,
    buyerName: d.buyerName,
    buyerEmail: d.buyerEmail,
    total: d.total,
    currency: d.currency,
    taxRate: d.taxRate,
    serviceName: d.payload.positions[0]?.name ?? "—",
  };
}

/** Issue the invoice via Fakturownia after explicit owner confirmation. */
export async function issueInvoiceAction(
  appointmentId: string
): Promise<{ ok: boolean; message: string; number?: string | null }> {
  const owner = await ownerBusiness();
  if (!owner) return { ok: false, message: "Brak dostępu." };
  if (!fakturowniaConfigured()) return { ok: false, message: "Integracja Fakturownia nie jest skonfigurowana." };
  const res = await issueInvoiceForBusiness(owner.businessId, owner.userId, String(appointmentId));
  if (res.ok) revalidatePath("/business/invoices");
  return { ok: res.ok, message: res.message, number: res.data?.number ?? null };
}
