export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildAudience, SEGMENTS, channelReach } from "@/lib/marketing";
import { channelAvailability } from "@/lib/marketing-config";
import { whatsappEnabled } from "@/lib/messaging";
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

  return (
    <MarketingClient
      segments={segments}
      channels={channelAvailability()}
      showWhatsapp={whatsappEnabled()}
      salonName={business.name}
      bookingUrl={`${APP_URL}/b/${business.slug}`}
      totalCustomers={recipients.length}
    />
  );
}
