import "server-only";

import type { AiActor } from "./permissions";
import { confirmAppointment, declineAppointment, businessRescheduleAppointment } from "@/lib/actions/appointments";
import { replyToReview } from "@/lib/actions/reviews";
import { sendCampaign, type SendInput } from "@/lib/actions/marketing";
import { CHANNEL_LABEL, type Channel, type SegmentKey } from "@/lib/marketing";
import { issueInvoiceForBusiness } from "./features/invoices";

export type ExecuteResult = { ok: boolean; message: string; data?: Record<string, unknown> };

function isRedirectError(e: unknown): boolean {
  return typeof (e as { digest?: string })?.digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  return typeof v === "string" ? v : "";
}

/**
 * Execute an AI-proposed action AFTER explicit owner confirmation. Each branch
 * delegates to the existing validated server action (which independently
 * re-derives the business from the session and enforces ownership + limits) or,
 * for invoices, rebuilds the draft server-side and calls Fakturownia. The AI
 * never reaches here on its own — only a confirmed UI action does.
 */
export async function executeAiAction(
  actionType: string,
  params: Record<string, unknown>,
  actor: AiActor
): Promise<ExecuteResult> {
  try {
    switch (actionType) {
      case "confirm_appointment": {
        await confirmAppointment(str(params, "appointmentId"));
        return { ok: true, message: "Wizyta została potwierdzona." };
      }
      case "decline_appointment": {
        await declineAppointment(str(params, "appointmentId"), str(params, "reason"));
        return { ok: true, message: "Wizyta została odwołana, klient otrzyma powiadomienie." };
      }
      case "business_reschedule": {
        await businessRescheduleAppointment({
          appointmentId: str(params, "appointmentId"),
          date: str(params, "date"),
          time: str(params, "time"),
        });
        return { ok: true, message: "Termin wizyty został zmieniony." };
      }
      case "publish_review_reply": {
        const reply = str(params, "replyText").trim();
        if (!reply) return { ok: false, message: "Pusta treść odpowiedzi." };
        await replyToReview(str(params, "reviewId"), reply);
        return { ok: true, message: "Odpowiedź na opinię została opublikowana." };
      }
      case "send_campaign": {
        const input: SendInput = {
          segment: str(params, "segment") as SegmentKey,
          channel: str(params, "channel") as Channel,
          subject: str(params, "subject"),
          message: str(params, "message"),
        };
        const res = await sendCampaign(input);
        if (!res.ok) return { ok: false, message: res.reason };
        return {
          ok: true,
          message: `Wysłano ${res.sent} z ${res.reachable} wiadomości (${CHANNEL_LABEL[res.channel]}).`,
          data: { sent: res.sent, failed: res.failed, reachable: res.reachable, total: res.total },
        };
      }
      case "issue_invoice": {
        const r = await issueInvoiceForBusiness(actor.businessId, actor.dbUserId, str(params, "appointmentId"));
        return { ok: r.ok, message: r.message, data: r.data };
      }
      default:
        return { ok: false, message: "Nieznane działanie." };
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const message = e instanceof Error ? e.message : "Nie udało się wykonać działania.";
    return { ok: false, message };
  }
}
