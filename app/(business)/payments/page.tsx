import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";

export default async function PaymentsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Płatności</h2>
          <p className="text-sm text-gray-500 mt-1">Historia transakcji i wypłaty</p>
        </div>
        <Link
          href="/business/settings"
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          Konfiguruj Stripe
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Przychód (miesiąc)", value: "— zł" },
          { label: "Oczekuje wypłaty", value: "— zł" },
          { label: "Transakcje", value: "—" },
          { label: "Zwroty", value: "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-2xl font-bold text-gray-300">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Brak transakcji</p>
          <p className="text-xs text-gray-400 max-w-xs mb-6">
            Podłącz Stripe, żeby przyjmować płatności online i depozyty przy rezerwacji.
          </p>
          <Link
            href="/business/settings"
            className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            Podłącz Stripe
          </Link>
        </div>
      </div>
    </div>
  );
}
