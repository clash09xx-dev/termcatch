export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";

export default async function FavouritesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Ulubione</h2>
        <p className="text-sm text-gray-500 mt-1">Zapisane salony i specjaliści</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Brak ulubionych</p>
          <p className="text-xs text-gray-400 max-w-xs mb-6">
            Kliknij serce przy profilu salonu, żeby dodać go do ulubionych i szybko wracać na rezerwację.
          </p>
          <Link
            href="/search"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Znajdź specjalistę
          </Link>
        </div>
      </div>
    </div>
  );
}
