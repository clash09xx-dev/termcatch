import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingReminderEmail } from "@/lib/email";
import { formatDate } from "@/lib/utils";
import { warsawTimeString } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Przypomnienia o wizytach — dzień przed (okno 22-26h przed startem).
 * Wywołuj co godzinę cronem:
 *   GET /api/cron/reminders?key=CRON_SECRET
 * Railway: osobny serwis cron albo zewnętrzny pinger (np. cron-job.org).
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const secret = process.env.CRON_SECRET;
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now + 22 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 26 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { gte: windowStart, lte: windowEnd },
      reminderSentAt: null,
    },
    include: {
      customer: { select: { id: true, email: true, firstName: true } },
      business: { select: { id: true, name: true, address: true, city: true } },
      service: { select: { name: true } },
    },
    take: 200,
  });

  let sent = 0;
  for (const apt of appointments) {
    const slotLabel = `${formatDate(apt.startTime, { weekday: "long", day: "numeric", month: "long" })} o ${warsawTimeString(apt.startTime)}`;
    try {
      await Promise.allSettled([
        sendBookingReminderEmail({
          to: apt.customer.email,
          businessName: apt.business.name,
          serviceName: apt.service.name,
          slotLabel,
          address: `${apt.business.address}, ${apt.business.city}`,
        }),
        prisma.notification.create({
          data: {
            userId: apt.customer.id,
            businessId: apt.business.id,
            type: "APPOINTMENT_REMINDER",
            channel: "IN_APP",
            title: "Przypomnienie o wizycie",
            body: `Jutro: ${apt.service.name} w ${apt.business.name}, ${slotLabel}.`,
            data: { appointmentId: apt.id },
            sentAt: new Date(),
          },
        }),
      ]);
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error("[cron/reminders] error for", apt.id, err);
    }
  }

  return NextResponse.json({ checked: appointments.length, sent });
}
