import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";

export default async function InvoicesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Faktury</h2>
        <p className="text-sm text-gray-500 mt-1">Dokumenty sprzedaży dla klientów</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Brak faktur</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Faktury będą generowane automatycznie po każdej płatnej wizycie online.
            Najpierw podłącz Stripe w ustawieniach.
          </p>
        </div>
      </div>
    </div>
  );
}
