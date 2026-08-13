import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildAudience, segmentByKey, channelReach, CHANNEL_LABEL, CHANNEL_ENV_HINT,
  type AudienceAppointment, type Channel, type SegmentKey,
} from "@/lib/marketing";
import { channelAvailability } from "@/lib/marketing-config";
import { generateCampaignCopy } from "../features/marketing";
import type { AiTool, ActionProposal } from "./registry";
import { str } from "./registry";
import { getDictionary, interpolate } from "@/lib/i18n/dictionaries";

const VALID_SEGMENTS: SegmentKey[] = ["all", "upcoming", "regulars", "dormant"];
const VALID_CHANNELS: Channel[] = ["sms", "whatsapp", "email"];

function smsParts(text: string): number {
  const unicode = /[^\x00-\x7F]/.test(text);
  const per = unicode ? 70 : 160;
  return Math.max(1, Math.ceil(text.length / per));
}

export const marketingTools: AiTool[] = [
  {
    name: "propose_campaign",
    kind: "write",
    roles: ["owner"],
    description:
      "Przygotuj kampanię (SMS/e-mail) do wybranego segmentu klientów, do zatwierdzenia przez właściciela. Jeśli nie podasz treści, AI ją wygeneruje. Zwraca liczbę odbiorców i szacunek kosztu SMS. Nic nie wysyła bez potwierdzenia.",
    parameters: {
      properties: {
        segment: { type: "string", enum: VALID_SEGMENTS, description: "all | upcoming | regulars | dormant" },
        channel: { type: "string", enum: VALID_CHANNELS, description: "sms | email | whatsapp" },
        goal: { type: "string", description: "Cel kampanii (np. reaktywacja, wypełnienie jutrzejszych luk)" },
        message: { type: "string", description: "Treść (opcjonalnie; jeśli brak, AI wygeneruje). Tokeny: {imię} {salon} {link}" },
        subject: { type: "string", description: "Temat e-maila (opcjonalnie)" },
      },
      required: ["segment", "channel"],
    },
    async run(args, { actor, locale }): Promise<ActionProposal | { error: string }> {
      const segment = str(args, "segment") as SegmentKey;
      const channel = str(args, "channel") as Channel;
      if (!VALID_SEGMENTS.includes(segment)) return { error: "Nieprawidłowy segment." };
      if (!VALID_CHANNELS.includes(channel)) return { error: "Nieprawidłowy kanał." };

      const availability = channelAvailability();
      if (!availability[channel]) {
        return { error: `Kanał ${CHANNEL_LABEL[channel]} nie jest skonfigurowany. Wymagane: ${CHANNEL_ENV_HINT[channel]}.` };
      }

      const appts = (await prisma.appointment.findMany({
        where: { businessId: actor.businessId },
        select: {
          customerId: true, status: true, startTime: true,
          customer: { select: { firstName: true, lastName: true, email: true, phone: true, marketingEmails: true, smsNotifications: true, whatsappNotifications: true } },
        },
        orderBy: { startTime: "desc" },
        take: 5000,
      })) as unknown as AudienceAppointment[];

      const seg = segmentByKey(segment);
      const audience = buildAudience(appts).filter(seg.match);
      const reach = audience.filter((r) => channelReach(r, channel)).length;
      if (reach === 0) {
        return { error: `Segment „${seg.label}” nie ma odbiorców osiągalnych kanałem ${CHANNEL_LABEL[channel]} (adres + zgoda).` };
      }

      let message = str(args, "message");
      let subject = str(args, "subject") ?? null;
      if (!message) {
        const copy = await generateCampaignCopy({
          businessId: actor.businessId,
          userId: actor.dbUserId,
          businessName: actor.businessName,
          segmentLabel: seg.label,
          channel,
          goal: str(args, "goal"),
        });
        message = copy.message;
        if (channel === "email" && !subject) subject = copy.subject;
      }

      const costHint =
        channel === "email"
          ? `${reach} e-maili`
          : `~${reach * smsParts(message)} wiadomości SMS (${reach} odbiorców)`;

      const p = getDictionary(locale).proposals;
      return {
        kind: "proposal",
        actionType: "send_campaign",
        title: interpolate(p.sendCampaign, { channel: CHANNEL_LABEL[channel] }),
        summary: interpolate(p.campaignSummary, { seg: seg.label, n: reach }),
        details: [
          { label: p.segment, value: seg.label },
          { label: p.channel, value: CHANNEL_LABEL[channel] },
          ...(subject ? [{ label: p.subject, value: subject }] : []),
          { label: p.estReach, value: costHint },
        ],
        params: { segment, channel, subject: subject ?? "", message },
        draft: message,
        recipientCount: reach,
        costHint,
        confirmLabel: interpolate(p.confirmSend, { n: reach }),
        external: true,
        danger: true,
      };
    },
  },
];
