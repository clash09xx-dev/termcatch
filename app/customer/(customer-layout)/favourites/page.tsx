export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { getMyFavourites } from "@/lib/actions/favourites";
import FavouriteButton from "@/components/booking/favourite-button";
import { ServiceCategory } from "@prisma/client";

const CATEGORY_LABELS: Partial<Record<ServiceCategory, string>> = {
  HAIR_SALON: "Fryzjer",
  BARBER: "Barber",
  NAIL_SALON: "Paznokcie",
  MASSAGE: "Masaż",
  SPA: "SPA",
  BEAUTY_CLINIC: "Klinika urody",
  EYEBROWS_LASHES: "Brwi & Rzęsy",
  MAKEUP: "Makijaż",
  TATTOO: "Tatuaż",
  PIERCING: "Piercing",
  TANNING: "Solarium",
  PHYSIOTHERAPY: "Fizjoterapia",
  PERSONAL_TRAINER: "Trener personalny",
  YOGA: "Joga",
  PILATES: "Pilates",
  NUTRITIONIST: "Dietetyk",
  PSYCHOLOGIST: "Psycholog",
  GENERAL_PHYSICIAN: "Lekarz ogólny",
  DENTIST: "Stomatolog",
};

export default async function FavouritesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const favourites = await getMyFavourites();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Ulubione</h2>
        <p className="text-sm text-gray-500 mt-1">Zapisane salony i specjaliści</p>
      </div>

      {favourites.length === 0 ? (
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
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {favourites.map(({ business }) => (
            <div
              key={business.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
            >
              <Link href={`/b/${business.slug}`} className="block">
                <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                  {business.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={business.coverImageUrl}
                      alt={business.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </Link>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/b/${business.slug}`}
                      className="text-sm font-semibold text-gray-900 hover:underline underline-offset-4 truncate block"
                    >
                      {business.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {CATEGORY_LABELS[business.category] ?? business.category} · {business.city}
                    </p>
                  </div>
                  <FavouriteButton
                    businessId={business.id}
                    initialIsFavourite={true}
                    redirectPath="/customer/favourites"
                    size="sm"
                  />
                </div>

                {business.averageRating > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-900">
                      {business.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">({business.totalReviews})</span>
                  </div>
                )}

                <div className="mt-auto pt-3">
                  <Link
                    href={`/b/${business.slug}/book`}
                    className="block w-full text-center px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Zarezerwuj wizytę
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
