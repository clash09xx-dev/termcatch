import "server-only";

import { fakturowniaConfigured } from "@/lib/fakturownia/client";
import { buildInvoiceDraftFromAppointment } from "../features/invoices";
import type { AiTool, ActionProposal } from "./registry";
import { str, money } from "./registry";

export const invoiceTools: AiTool[] = [
  {
    name: "propose_invoice",
    kind: "write",
    roles: ["owner"],
    description:
      "Przygotuj fakturę (Fakturownia) za wskazaną wizytę — do zatwierdzenia przez właściciela. Nic nie wystawia bez potwierdzenia. Wymaga skonfigurowanej integracji Fakturownia.",
    parameters: {
      properties: { appointmentId: { type: "string" } },
      required: ["appointmentId"],
    },
    async run(args, { actor }): Promise<ActionProposal | { error: string }> {
      if (!fakturowniaConfigured()) {
        return { error: "Integracja Fakturownia nie jest skonfigurowana (FAKTUROWNIA_API_TOKEN, FAKTUROWNIA_ACCOUNT_DOMAIN)." };
      }
      const appointmentId = str(args, "appointmentId");
      if (!appointmentId) return { error: "Brak appointmentId." };

      const res = await buildInvoiceDraftFromAppointment(actor.businessId, appointmentId);
      if (!res.ok) return { error: res.error };
      const d = res.draft;

      return {
        kind: "proposal",
        actionType: "issue_invoice",
        title: "Wystaw fakturę",
        summary: `Faktura dla ${d.buyerName} na ${money(d.total, d.currency)}`,
        details: [
          { label: "Nabywca", value: d.buyerName },
          ...(d.buyerEmail ? [{ label: "E-mail", value: d.buyerEmail }] : []),
          { label: "Pozycja", value: d.payload.positions[0]?.name ?? "—" },
          { label: "Kwota brutto", value: money(d.total, d.currency) },
          { label: "VAT", value: `${d.taxRate}%` },
        ],
        params: { appointmentId: d.appointmentId },
        confirmLabel: "Wystaw fakturę",
        external: true,
        danger: true,
      };
    },
  },
];
