export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import type { DayOfWeek, AppointmentStatus } from "@prisma/client";
import { resolveEmployeeContext } from "@/lib/employee/context";
import { prisma } from "@/lib/prisma";
import { getBusinessDaySlots, warsawYmdPlusDays } from "@/lib/availability";
import { warsawDateString, warsawDayStartUtc, warsawTimeString } from "@/lib/timezone";
import { PageHeader, GlassCard, CardHeader, EmptyState, Overline } from "@/components/ui/glass";
import { CHIP, HAIRLINE, INK_GRADIENT } from "@/components/ui/glass/tokens";
import { ApptRow, EMPLOYEE_APPT_SELECT } from "@/components/employee/appt-row";

const CANCELLED: AppointmentStatus[] = ["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS"];
const WD_LONG = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", weekday: "long" });

export default async function EmployeeDashboard() {
  const ctx = await resolveEmployeeContext();
  if (!ctx) redirect("/");

  const now = new Date();
  const todayYmd = warsawDateString(now);
  const tomorrowYmd = warsawYmdPlusDays(todayYmd, 1);
  const todayStart = warsawDayStartUtc(todayYmd);
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const tomorrowStart = warsawDayStartUtc(tomorrowYmd);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86_400_000);
  const base = { businessId: ctx.businessId, employeeId: ctx.employeeId };

  const [todayAppts, tomorrowAppts, nextAppt, services, hours] = await Promise.all([
    prisma.appointment.findMany({ where: { ...base, startTime: { gte: todayStart, lt: todayEnd }, status: { notIn: CANCELLED } }, orderBy: { startTime: "asc" }, select: EMPLOYEE_APPT_SELECT }),
    prisma.appointment.findMany({ where: { ...base, startTime: { gte: tomorrowStart, lt: tomorrowEnd }, status: { notIn: CANCELLED } }, orderBy: { startTime: "asc" }, select: EMPLOYEE_APPT_SELECT }),
    prisma.appointment.findFirst({ where: { ...base, startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] } }, orderBy: { startTime: "asc" }, select: EMPLOYEE_APPT_SELECT }),
    prisma.service.findMany({ where: { businessId: ctx.businessId, isActive: true }, select: { duration: true } }),
    prisma.employeeWorkingHours.findMany({ where: { employeeId: ctx.employeeId }, select: { dayOfWeek: true, isWorking: true, startTime: true, endTime: true } }),
  ]);

  const dur = services.length ? Math.min(...services.map((s) => s.duration)) : 30;
  const { open, slots } = await getBusinessDaySlots({ businessId: ctx.businessId, serviceDurationMin: dur, dateYmd: todayYmd, employeeId: ctx.employeeId });

  const todayDow = WD_LONG.format(now).toUpperCase() as DayOfWeek;
  const wh = hours.find((h) => h.dayOfWeek === todayDow);
  const firstName = ctx.employeeName.split(" ")[0] || ctx.employeeName;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title={`Cześć, ${firstName}`}
        subtitle={new Date().toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long" })}
      />

      {/* Next appointment — the single most useful thing on a phone */}
      {nextAppt ? (
        <GlassCard className="overflow-hidden p-0">
          <div className="px-5 py-2.5" style={{ background: INK_GRADIENT }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Następna wizyta · {warsawTimeString(nextAppt.startTime)}</span>
          </div>
          <ApptRow a={nextAppt} first />
        </GlassCard>
      ) : (
        <GlassCard className="p-5">
          <p className="text-sm font-semibold text-slate-800">Brak kolejnych wizyt.</p>
          <p className="text-xs text-slate-500">Ciesz się wolną chwilą — nowe rezerwacje pojawią się tutaj.</p>
        </GlassCard>
      )}

      {/* Working hours + free slots today */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={CHIP}>
          <Overline>Twoje godziny dziś</Overline>
          <p className="mt-1 text-sm font-semibold text-slate-900">{wh?.isWorking ? `${wh.startTime}–${wh.endTime}` : "Wolne"}</p>
        </div>
        <div className="rounded-2xl p-4" style={CHIP}>
          <Overline>Wolne terminy dziś</Overline>
          <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{open ? `${slots.length}` : "—"}</p>
        </div>
      </div>
      {open && slots.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {slots.slice(0, 12).map((s) => (
            <span key={s} className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 tabular-nums" style={CHIP}>{s}</span>
          ))}
          {slots.length > 12 && <span className="px-2 py-1 text-xs text-slate-400">+{slots.length - 12}</span>}
        </div>
      )}

      {/* Today */}
      <GlassCard className="overflow-hidden">
        <CardHeader title="Dzisiejszy grafik" action={<span className="text-xs text-slate-400 tabular-nums">{todayAppts.length}</span>} />
        {todayAppts.length === 0 ? (
          <div className="p-6"><EmptyState icon={<CalIcon />} title="Brak wizyt na dziś" body="Twój dzisiejszy grafik jest pusty." /></div>
        ) : (
          <div>{todayAppts.map((a, i) => <ApptRow key={a.id} a={a} first={i === 0} />)}</div>
        )}
      </GlassCard>

      {/* Tomorrow */}
      <GlassCard className="overflow-hidden">
        <CardHeader title="Jutro" action={<span className="text-xs text-slate-400 tabular-nums">{tomorrowAppts.length}</span>} />
        {tomorrowAppts.length === 0 ? (
          <div className="px-5 py-4"><p className="text-sm text-slate-500">Na jutro nie masz jeszcze wizyt.</p></div>
        ) : (
          <div>{tomorrowAppts.map((a, i) => <ApptRow key={a.id} a={a} first={i === 0} />)}</div>
        )}
      </GlassCard>
    </div>
  );
}

function CalIcon() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></svg>;
}
