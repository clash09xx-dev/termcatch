import "server-only";

import { prisma } from "@/lib/prisma";
import { warsawDateString } from "@/lib/timezone";
import { createInvoice, defaultTaxRate, type CreateInvoiceInput } from "@/lib/fakturownia/client";
import { resolveCredentials, touchLastSync } from "@/lib/fakturownia/connection";
import { logAiUsage } from "../usage";

export type InvoiceDraft = {
  appointmentId: string;
  customerId: string;
  buyerName: string;
  buyerEmail: string | null;
  currency: string;
  total: number;
  taxRate: number;
  payload: CreateInvoiceInput;
};

function isSyntheticEmail(email: string): boolean {
  return email.endsWith("@termcatch.local") || email.endsWith("@unknown.termcatch.com");
}

/**
 * Build a Fakturownia invoice draft from a completed appointment. Read-only —
 * does NOT contact Fakturownia. Returns null if the appointment isn't billable
 * in this business.
 */
export async function buildInvoiceDraftFromAppointment(
  businessId: string,
  appointmentId: string
): Promise<{ ok: true; draft: InvoiceDraft } | { ok: false; error: string }> {
  const a = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    select: {
      id: true, status: true, price: true, currency: true, startTime: true, customerId: true,
      customer: { select: { firstName: true, lastName: true, email: true } },
      service: { select: { name: true } },
    },
  });
  if (!a) return { ok: false, error: "Nie znaleziono wizyty w tym salonie." };
  if (a.price == null || a.price <= 0) return { ok: false, error: "Wizyta nie ma dodatniej kwoty do zafakturowania." };

  const buyerName = `${a.customer.firstName} ${a.customer.lastName}`.trim() || "Klient";
  const buyerEmail = a.customer.email && !isSyntheticEmail(a.customer.email) ? a.customer.email : null;
  const taxRate = defaultTaxRate();
  const today = warsawDateString(a.startTime);

  const payload: CreateInvoiceInput = {
    buyer_name: buyerName,
    ...(buyerEmail ? { buyer_email: buyerEmail } : {}),
    kind: "vat",
    sell_date: today,
    issue_date: warsawDateString(new Date()),
    positions: [
      { name: a.service.name, tax: taxRate, total_price_gross: Math.round(a.price * 100) / 100, quantity: 1 },
    ],
  };

  return {
    ok: true,
    draft: {
      appointmentId: a.id,
      customerId: a.customerId,
      buyerName,
      buyerEmail,
      currency: a.currency || "PLN",
      total: Math.round(a.price * 100) / 100,
      taxRate,
      payload,
    },
  };
}

export type IssueInvoiceResult = { ok: boolean; message: string; data?: { id: number; number: string | null } };

/**
 * Rebuild the draft server-side (never trusting supplied amounts), issue it via
 * Fakturownia, and persist a reference row. Shared by the AI executor and the
 * direct Faktury-page action. Idempotency isn't enforced here — the UI guards
 * against double-issue by showing the existing invoice number.
 */
export async function issueInvoiceForBusiness(
  businessId: string,
  userId: string | null,
  appointmentId: string
): Promise<IssueInvoiceResult> {
  // Resolve THIS business's own Fakturownia credentials — never a global token,
  // never another salon's. No connection → nothing is issued.
  const creds = await resolveCredentials(businessId);
  if (!creds) {
    return { ok: false, message: "Najpierw połącz swoje konto Fakturownia w Ustawienia → Integracje." };
  }

  const res = await buildInvoiceDraftFromAppointment(businessId, appointmentId);
  if (!res.ok) return { ok: false, message: res.error };
  const draft = res.draft;

  const created = await createInvoice(creds, draft.payload);
  await logAiUsage({ businessId, userId, feature: "invoice_issue", model: "fakturownia", inputTokens: 0, outputTokens: 0, ok: created.ok });
  if (!created.ok) return { ok: false, message: created.error };
  await touchLastSync(businessId);

  const dto = created.data;
  await prisma.fakturowniaInvoice
    .create({
      data: {
        businessId,
        appointmentId: draft.appointmentId,
        customerId: draft.customerId,
        fakturowniaId: dto.id,
        number: dto.number ?? null,
        totalAmount: draft.total,
        currency: draft.currency,
        buyerName: draft.buyerName,
        status: "issued",
        viewUrl: dto.view_url ?? null,
      },
    })
    .catch(() => {});

  return { ok: true, message: `Faktura ${dto.number ?? dto.id} została wystawiona.`, data: { id: dto.id, number: dto.number ?? null } };
}
