import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactionalSms, smsFlagEnabled } from "@/lib/sms";
import { AppointmentStatus } from "@prisma/client";
import { warsawTimeString } from "@/lib/timezone";
import { formatDate } from "@/lib/utils";

// Appointment-reminder SMS — designed for Railway Cron (hourly).
// Protected by CRON_SECRET; sends only for CONFIRMED future appointments in
// the ~24h window, only to opted-in customers. Idempotency is via the
// SmsMessage dedupeKey ("sms:reminder:<id>") ALONE — deliberately NOT the shared
// Appointment.reminderSentAt marker, so it can't cannibalize the e-mail/in-app
// reminder cron (which owns reminderSentAt). Each channel sends independently.

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!smsFlagEnabled()) {
    return NextResponse.json({ skipped: true, reason: "SMS_ENABLED=false" });
  }

  const now = Date.now();
  const windowStart = new Date(now + 23 * 3600_000);
  const windowEnd = new Date(now + 25 * 3600_000);

  const appts = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.CONFIRMED,
      startTime: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      startTime: true,
      customer: { select: { phone: true, smsNotifications: true } },
      business: { select: { name: true } },
      service: { select: { name: true } },
    },
    take: 200,
  });

  let sent = 0;
  let skipped = 0;
  for (const a of appts) {
    if (!a.customer.smsNotifications || !a.customer.phone) {
      skipped++;
      continue;
    }
    const slot = `${formatDate(a.startTime, { day: "numeric", month: "long" })} o ${warsawTimeString(a.startTime)}`;
    const res = await sendTransactionalSms({
      toPhone: a.customer.phone,
      body: `TermCatch: przypomnienie — jutro ${a.service.name} w ${a.business.name}, ${slot}. Jeśli nie możesz przyjść, przełóż wizytę w panelu.`,
      template: "reminder",
      dedupeKey: `sms:reminder:${a.id}`,
      appointmentId: a.id,
    });
    // No reminderSentAt write — the SmsMessage dedupeKey already guarantees one
    // SMS per appointment (a re-run returns reason "duplicate" without sending).
    if (res.sent) sent++;
    else skipped++;
  }

  return NextResponse.json({ matched: appts.length, sent, skipped });
}
