export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildAudience, SEGMENTS, channelReach } from "@/lib/marketing";
import { channelAvailability } from "@/lib/marketing-config";
import { whatsappEnabled } from "@/lib/messaging";
import { getInsights } from "@/lib/ai/insights";
import { getServerI18n } from "@/lib/i18n/server";
import { MarketingClient, type SegmentView } from "./marketing-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";

export default async function MarketingPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true, name: true, slug: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const appointments = await prisma.appointment.findMany({
    where: { businessId: business.id },
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

  const recipients = buildAudience(appointments);
  const segments: SegmentView[] = SEGMENTS.map((s) => {
    const inSeg = recipients.filter(s.match);
    return {
      key: s.key,
      label: s.label,
      hint: s.hint,
      total: inSeg.length,
      reach: {
        sms: inSeg.filter((r) => channelReach(r, "sms")).length,
        whatsapp: inSeg.filter((r) => channelReach(r, "whatsapp")).length,
        email: inSeg.filter((r) => channelReach(r, "email")).length,
      },
      sample: inSeg.find((r) => r.firstName)?.firstName ?? null,
    };
  });

  const { dict } = await getServerI18n();
  const insights = (await getInsights(business.id, dict).catch(() => []))
    .filter((i) => ["clients", "calendar", "revenue"].includes(i.category))
    .slice(0, 3);

  const [automationsRaw, templatesRaw, campaignsRaw, deliv] = await Promise.all([
    prisma.marketingAutomation.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } }),
    prisma.marketingTemplate.findMany({ where: { businessId: business.id }, orderBy: { updatedAt: "desc" } }),
    prisma.marketingCampaign.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.marketingDelivery.groupBy({ by: ["status"], where: { businessId: business.id }, _count: { _all: true } }),
  ]);

  const automations = automationsRaw.map((a) => ({
    id: a.id, type: a.type, name: a.name, channel: a.channel, subject: a.subject, body: a.body,
    enabled: a.enabled, config: (a.config as unknown as { days?: number; delayHours?: number } | null) ?? null,
    lastRunAt: a.lastRunAt ? a.lastRunAt.toISOString() : null,
  }));
  const templates = templatesRaw.map((t) => ({ id: t.id, name: t.name, channel: t.channel, subject: t.subject, body: t.body }));
  const campaigns = campaignsRaw.map((c) => ({
    id: c.id, channel: c.channel, segment: c.segment, subject: c.subject, body: c.body,
    sent: c.sent, failed: c.failed, reachable: c.reachable, total: c.total, createdAt: c.createdAt.toISOString(),
  }));
  const deliveryStats = { sent: 0, failed: 0, skipped: 0 };
  for (const d of deliv) {
    if (d.status === "sent" || d.status === "failed" || d.status === "skipped") deliveryStats[d.status] = d._count._all;
  }

  return (
    <MarketingClient
      segments={segments}
      channels={channelAvailability()}
      showWhatsapp={whatsappEnabled()}
      salonName={business.name}
      bookingUrl={`${APP_URL}/b/${business.slug}`}
      totalCustomers={recipients.length}
      insights={insights}
      automations={automations}
      templates={templates}
      campaigns={campaigns}
      deliveryStats={deliveryStats}
    />
  );
}
