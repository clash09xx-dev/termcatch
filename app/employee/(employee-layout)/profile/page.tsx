export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import type { DayOfWeek } from "@prisma/client";
import { resolveEmployeeContext } from "@/lib/employee/context";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/actions/auth";
import { PageHeader, GlassCard, CardHeader, Overline } from "@/components/ui/glass";
import { CHIP, HAIRLINE, INK_GRADIENT } from "@/components/ui/glass/tokens";

const DAY_ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_PL: Record<DayOfWeek, string> = {
  MONDAY: "Poniedziałek", TUESDAY: "Wtorek", WEDNESDAY: "Środa", THURSDAY: "Czwartek", FRIDAY: "Piątek", SATURDAY: "Sobota", SUNDAY: "Niedziela",
};

export default async function EmployeeProfile() {
  const ctx = await resolveEmployeeContext();
  if (!ctx) redirect("/");

  const [emp, hours] = await Promise.all([
    prisma.employee.findUnique({ where: { id: ctx.employeeId }, select: { firstName: true, lastName: true, email: true, phone: true, title: true } }),
    prisma.employeeWorkingHours.findMany({ where: { employeeId: ctx.employeeId }, select: { dayOfWeek: true, isWorking: true, startTime: true, endTime: true } }),
  ]);
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Mój profil" subtitle={ctx.businessName} />

      <GlassCard className="p-5">
        <p className="text-lg font-bold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}`.trim() : ctx.employeeName}</p>
        {emp?.title && <p className="text-sm text-slate-500">{emp.title}</p>}
        <div className="mt-3 space-y-1 text-sm text-slate-600">
          {emp?.email && <p>{emp.email}</p>}
          {emp?.phone && <p>{emp.phone}</p>}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Dane profilu zmienia właściciel salonu w panelu zespołu.</p>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <CardHeader title="Moje godziny pracy" />
        <div>
          {DAY_ORDER.map((d, i) => {
            const h = byDay.get(d);
            return (
              <div key={d} className="flex items-center justify-between px-5 py-2.5" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                <span className="text-sm text-slate-600">{DAY_PL[d]}</span>
                <span className="text-sm font-medium text-slate-900 tabular-nums">{h?.isWorking ? `${h.startTime}–${h.endTime}` : "Wolne"}</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {!ctx.viewAs && (
        <form action={logoutAction}>
          <button type="submit" className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900" style={CHIP}>
            Wyloguj się
          </button>
        </form>
      )}
    </div>
  );
}
