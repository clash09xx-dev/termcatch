"use server";

import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendSms, sendWhatsApp } from "@/lib/messaging";
import { sendEmail } from "@/lib/email";
import {
  buildAudience,
  segmentByKey,
  channelReach,
  renderMessage,
  CHANNEL_LABEL,
  type Channel,
  type SegmentKey,
} from "@/lib/marketing";
import { channelAvailability } from "@/lib/marketing-config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";

async function getOwnedBusiness() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true, name: true, slug: true } } },
  });
  const biz = dbUser?.ownedBusinesses[0];
  if (!biz) throw new Error("Nie masz przypisanego salonu.");
  return biz;
}

export type SendInput = {
  segment: SegmentKey;
  channel: Channel;
  subject: string; // e-mail only
  message: string;
};

export type SendResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      channel: Channel;
      segmentLabel: string;
      total: number; // customers in the segment
      reachable: number; // reachable + opted-in on this channel
      sent: number; // real successful deliveries
      failed: number; // attempts the provider rejected
    };

/**
 * Honest campaign send. Returns a truthful per-recipient tally — and refuses,
 * never fakes success, when the channel isn't actually configured. The
 * audience is recomputed server-side from real data (the client cannot inject
 * recipients or phone numbers).
 */
export async function sendCampaign(input: SendInput): Promise<SendResult> {
  const biz = await getOwnedBusiness();

  const avail = channelAvailability();
  if (!avail[input.channel]) {
    return {
      ok: false,
      reason: `Wysyłka ${CHANNEL_LABEL[input.channel]} niedostępna — brak konfiguracji dostawcy.`,
    };
  }

  const body = input.message.trim();
  if (!body) return { ok: false, reason: "Napisz treść wiadomości." };
  if (input.channel === "email" && !input.subject.trim()) {
    return { ok: false, reason: "Podaj temat wiadomości e-mail." };
  }

  const appointments = await prisma.appointment.findMany({
    where: { businessId: biz.id },
    select: {
      customerId: true,
      status: true,
      startTime: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          marketingEmails: true,
          smsNotifications: true,
          whatsappNotifications: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  const seg = segmentByKey(input.segment);
  const inSegment = buildAudience(appointments).filter(seg.match);
  const reachable = inSegment.filter((r) => channelReach(r, input.channel));

  if (reachable.length === 0) {
    return { ok: false, reason: "Brak osiągalnych odbiorców w tej grupie na tym kanale." };
  }

  const link = `${APP_URL}/b/${biz.slug}`;

  const results = await Promise.allSettled(
    reachable.map(async (r) => {
      const text = renderMessage(body, { firstName: r.firstName, salon: biz.name, link });
      if (input.channel === "sms") return sendSms(r.phone!, text);
      if (input.channel === "whatsapp") return sendWhatsApp(r.phone!, text);
      const subject = renderMessage(input.subject, { firstName: r.firstName, salon: biz.name, link });
      const res = await sendEmail({
        to: r.email!,
        subject,
        heading: subject,
        lines: text.split("\n").filter((l) => l.trim().length > 0),
        ctaLabel: "Zarezerwuj termin",
        ctaUrl: link,
      });
      return res.sent;
    })
  );

  let sent = 0;
  let failed = 0;
  for (const res of results) {
    if (res.status === "fulfilled" && res.value) sent++;
    else failed++;
  }

  return {
    ok: true,
    channel: input.channel,
    segmentLabel: seg.label,
    total: inSegment.length,
    reachable: reachable.length,
    sent,
    failed,
  };
}
