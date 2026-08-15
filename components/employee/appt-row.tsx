import { Prisma } from "@prisma/client";
import { warsawTimeString } from "@/lib/timezone";
import { StatusBadge } from "@/components/ui/glass";
import { HAIRLINE } from "@/components/ui/glass/tokens";

export const EMPLOYEE_APPT_SELECT = {
  id: true, startTime: true, endTime: true, duration: true, status: true, customerNotes: true,
  customer: { select: { firstName: true, lastName: true, phone: true } },
  service: { select: { name: true } },
} satisfies Prisma.AppointmentSelect;

export type EmployeeAppt = Prisma.AppointmentGetPayload<{ select: typeof EMPLOYEE_APPT_SELECT }>;

/** One appointment with just the client context an employee needs to do the job. */
export function ApptRow({ a, first, statusLabel }: { a: EmployeeAppt; first?: boolean; statusLabel: string }) {
  const client = `${a.customer.firstName} ${a.customer.lastName}`.trim();
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-3.5 sm:px-5" style={first ? undefined : { borderTop: HAIRLINE }}>
      <div className="w-14 flex-shrink-0">
        <p className="text-sm font-bold text-slate-900 tabular-nums">{warsawTimeString(a.startTime)}</p>
        <p className="text-[11px] text-slate-400 tabular-nums">{a.duration} min</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{client}</p>
          <StatusBadge status={a.status} label={statusLabel} />
        </div>
        <p className="text-xs text-slate-500">{a.service.name}</p>
        {a.customerNotes && (
          <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900" style={{ border: "1px solid rgba(180,83,9,0.18)" }}>
            Notatka: {a.customerNotes}
          </p>
        )}
      </div>
      {a.customer.phone && (
        <a href={`tel:${a.customer.phone}`} className="flex-shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-900">
          {a.customer.phone}
        </a>
      )}
    </div>
  );
}
