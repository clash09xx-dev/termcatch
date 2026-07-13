export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  PageHeader,
  GlassCard,
  EmptyState,
  StatusBadge,
  InkLink,
  ChromeAvatar,
} from "@/components/ui/glass";

export default async function HistoryPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      appointments: {
        where: { status: { in: ["COMPLETED", "CANCELLED_CUSTOMER", "CANCELLED_BUSINESS", "NO_SHOW"] } },
        orderBy: { startTime: "desc" },
        include: { business: true, service: true },
      },
    },
  });

  const appointments = dbUser?.appointments ?? [];

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Historia wizyt"
        subtitle={<span className="tabular-nums">{appointments.length} zakończonych wizyt</span>}
      />

      {appointments.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <polyline points="12 8 12 12 14 14" />
                <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
              </svg>
            }
            title="Brak historii"
            body="Zakończone wizyty pojawią się tutaj automatycznie."
            action={<InkLink href="/search" size="md">Zarezerwuj wizytę</InkLink>}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d1 space-y-2.5">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="rounded-[20px] px-5 py-4 flex items-center gap-4"
              style={{
                background: "rgba(255,255,255,0.80)",
                border: "1px solid rgba(203,213,225,0.45)",
                boxShadow: "0 0 0 0.5px rgba(203,213,225,0.22), 0 1px 2px rgba(0,0,0,0.02), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
              }}
            >
              <ChromeAvatar initials={apt.business.name[0] ?? "S"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{apt.business.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {apt.service.name} ·{" "}
                  {apt.startTime.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(apt.price)}</p>
                <StatusBadge status={apt.status} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
