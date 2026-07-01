import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Historia wizyt</h2>
        <p className="text-sm text-gray-500 mt-1">{appointments.length} zakończonych wizyt</p>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="12 8 12 12 14 14" />
                <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Brak historii</p>
            <p className="text-xs text-gray-400 max-w-xs mb-6">
              Zakończone wizyty pojawią się tutaj automatycznie.
            </p>
            <Link
              href="/search"
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Zarezerwuj wizytę
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const statusMap: Record<string, { label: string; cls: string }> = {
              COMPLETED: { label: "Zakończona", cls: "bg-green-50 text-green-700" },
              CANCELLED_CUSTOMER: { label: "Odwołana", cls: "bg-red-50 text-red-600" },
              CANCELLED_BUSINESS: { label: "Odwołana przez salon", cls: "bg-red-50 text-red-600" },
              NO_SHOW: { label: "No-show", cls: "bg-red-50 text-red-600" },
            };
            const s = statusMap[apt.status] ?? { label: apt.status, cls: "" };

            return (
              <div key={apt.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
                  {apt.business.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{apt.business.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {apt.service.name} ·{" "}
                    {apt.startTime.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(apt.price)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
