export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import type { AppointmentStatus } from "@prisma/client";
import { resolveEmployeeContext } from "@/lib/employee/context";
import { prisma } from "@/lib/prisma";
import { warsawYmdPlusDays } from "@/lib/availability";
import { warsawDateString, warsawDayStartUtc } from "@/lib/timezone";
import { PageHeader, GlassCard, EmptyState } from "@/components/ui/glass";
import { CHIP } from "@/components/ui/glass/tokens";
import { ApptRow, EMPLOYEE_APPT_SELECT } from "@/components/employee/appt-row";
import { getServerI18n } from "@/lib/i18n/server";

const CANCELLED: AppointmentStatus[] = ["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS"];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function EmployeeCalendar({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { dict } = await getServerI18n();
  const ctx = await resolveEmployeeContext();
  if (!ctx) redirect("/");

  const { date } = await searchParams;
  const dateYmd = date && YMD.test(date) ? date : warsawDateString(new Date());
  const start = warsawDayStartUtc(dateYmd);
  const end = new Date(start.getTime() + 86_400_000);

  const appts = await prisma.appointment.findMany({
    where: { businessId: ctx.businessId, employeeId: ctx.employeeId, startTime: { gte: start, lt: end }, status: { notIn: CANCELLED } },
    orderBy: { startTime: "asc" },
    select: EMPLOYEE_APPT_SELECT,
  });

  const prev = warsawYmdPlusDays(dateYmd, -1);
  const next = warsawYmdPlusDays(dateYmd, 1);
  const label = new Date(start).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Kalendarz" subtitle="Twój grafik" />

      <div className="flex items-center justify-between gap-2">
        <Link href={`/employee/calendar?date=${prev}`} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900" style={CHIP}>← Poprzedni</Link>
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <Link href={`/employee/calendar?date=${next}`} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900" style={CHIP}>Następny →</Link>
      </div>

      <GlassCard className="overflow-hidden">
        {appts.length === 0 ? (
          <div className="p-6"><EmptyState icon={<Ico />} title="Brak wizyt" body="W tym dniu nie masz zaplanowanych wizyt." /></div>
        ) : (
          <div>{appts.map((a, i) => <ApptRow statusLabel={dict.statuses[a.status]} key={a.id} a={a} first={i === 0} />)}</div>
        )}
      </GlassCard>
    </div>
  );
}

function Ico() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></svg>;
}
