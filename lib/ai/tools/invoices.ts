import "server-only";

import { hasConnection } from "@/lib/fakturownia/connection";
import { buildInvoiceDraftFromAppointment } from "../features/invoices";
import type { AiTool, ActionProposal } from "./registry";
import { str, money } from "./registry";
import { getDictionary, interpolate } from "@/lib/i18n/dictionaries";

// Exact copy the AI must return when the business hasn't connected Fakturownia.
export const FAKTUROWNIA_NOT_CONNECTED = "Najpierw połącz swoje konto Fakturownia w Ustawienia → Integracje.";

export const invoiceTools: AiTool[] = [
  {
    name: "propose_invoice",
    kind: "write",
    roles: ["owner"],
    description:
      "Przygotuj fakturę (Fakturownia) za wskazaną wizytę — do zatwierdzenia przez właściciela. Nic nie wystawia bez potwierdzenia. Wymaga połączonego własnego konta Fakturownia salonu.",
    parameters: {
      properties: { appointmentId: { type: "string" } },
      required: ["appointmentId"],
    },
    async run(args, { actor, locale }): Promise<ActionProposal | { error: string }> {
      // Use the logged-in business's OWN connected account. No connection → the
      // AI must not attempt invoice creation; it returns the connect instruction.
      if (!(await hasConnection(actor.businessId))) {
        return { error: FAKTUROWNIA_NOT_CONNECTED };
      }
      const appointmentId = str(args, "appointmentId");
      if (!appointmentId) return { error: "Brak appointmentId." };

      const res = await buildInvoiceDraftFromAppointment(actor.businessId, appointmentId);
      if (!res.ok) return { error: res.error };
      const d = res.draft;
      const p = getDictionary(locale).proposals;

      return {
        kind: "proposal",
        actionType: "issue_invoice",
        title: p.issueInvoice,
        summary: interpolate(p.invoiceSummary, { name: d.buyerName, amount: money(d.total, d.currency) }),
        details: [
          { label: p.buyer, value: d.buyerName },
          ...(d.buyerEmail ? [{ label: p.email, value: d.buyerEmail }] : []),
          { label: p.position, value: d.payload.positions[0]?.name ?? "—" },
          { label: p.grossAmount, value: money(d.total, d.currency) },
          { label: p.vat, value: `${d.taxRate}%` },
        ],
        params: { appointmentId: d.appointmentId },
        confirmLabel: p.issueInvoice,
        external: true,
        danger: true,
      };
    },
  },
];
