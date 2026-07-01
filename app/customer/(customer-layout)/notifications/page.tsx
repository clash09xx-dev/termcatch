export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Powiadomienia</h2>
        <p className="text-sm text-gray-500 mt-1">Potwierdzenia rezerwacji i przypomnienia</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Brak powiadomień</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Potwierdzenia rezerwacji, przypomnienia przed wizytami i zmiany terminów pojawią się tutaj.
          </p>
        </div>
      </div>
    </div>
  );
}
