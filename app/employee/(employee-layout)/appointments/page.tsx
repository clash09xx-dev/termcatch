export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import type { AppointmentStatus } from "@prisma/client";
import { resolveEmployeeContext } from "@/lib/employee/context";
import { prisma } from "@/lib/prisma";
import { PageHeader, GlassCard, CardHeader, EmptyState } from "@/components/ui/glass";
import { ApptRow, EMPLOYEE_APPT_SELECT } from "@/components/employee/appt-row";
import { getServerI18n } from "@/lib/i18n/server";

const CANCELLED: AppointmentStatus[] = ["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS"];

export default async function EmployeeAppointments() {
  const { dict } = await getServerI18n();
  const ctx = await resolveEmployeeContext();
  if (!ctx) redirect("/");

  const now = new Date();
  const base = { businessId: ctx.businessId, employeeId: ctx.employeeId };
  const [upcoming, past] = await Promise.all([
    prisma.appointment.findMany({ where: { ...base, startTime: { gte: now }, status: { notIn: CANCELLED } }, orderBy: { startTime: "asc" }, take: 40, select: EMPLOYEE_APPT_SELECT }),
    prisma.appointment.findMany({ where: { ...base, startTime: { lt: now } }, orderBy: { startTime: "desc" }, take: 20, select: EMPLOYEE_APPT_SELECT }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Moje wizyty" subtitle="Wszystkie Twoje rezerwacje" />

      <GlassCard className="overflow-hidden">
        <CardHeader title="Nadchodzące" action={<span className="text-xs text-slate-400 tabular-nums">{upcoming.length}</span>} />
        {upcoming.length === 0 ? (
          <div className="p-6"><EmptyState icon={<Ico />} title="Brak nadchodzących wizyt" body="Nowe rezerwacje pojawią się tutaj." /></div>
        ) : (
          <div>{upcoming.map((a, i) => <ApptRow statusLabel={dict.statuses[a.status]} key={a.id} a={a} first={i === 0} />)}</div>
        )}
      </GlassCard>

      {past.length > 0 && (
        <GlassCard className="overflow-hidden">
          <CardHeader title="Ostatnie" />
          <div>{past.map((a, i) => <ApptRow statusLabel={dict.statuses[a.status]} key={a.id} a={a} first={i === 0} />)}</div>
        </GlassCard>
      )}
    </div>
  );
}

function Ico() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" /></svg>;
}
