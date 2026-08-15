export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { getMyFavourites } from "@/lib/actions/favourites";
import FavouriteButton from "@/components/booking/favourite-button";
import { categoryLabelFor } from "@/lib/categories";
import { getServerI18n } from "@/lib/i18n/server";
import { PlaceholderCover } from "@/components/ui/placeholder-cover";
import { PageHeader, GlassCard, EmptyState, InkLink } from "@/components/ui/glass";

export default async function FavouritesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { locale, dict } = await getServerI18n();
  const c = dict.customer;
  const favourites = await getMyFavourites();

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title={c.favourites} subtitle={c.favSubtitle} />

      {favourites.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            }
            title={c.favEmptyTitle}
            body={c.favEmptyBody}
            action={<InkLink href="/search" size="md">{c.findSpecialist}</InkLink>}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d1 grid sm:grid-cols-2 gap-3">
          {favourites.map(({ business }) => (
            <div
              key={business.id}
              className="card-hover-lift rounded-[20px] overflow-hidden flex flex-col"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                boxShadow: "var(--e1)",
              }}
            >
              <Link href={`/b/${business.slug}`} className="block">
                <div className="h-28 relative overflow-hidden">
                  {business.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={business.coverImageUrl}
                      alt={business.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PlaceholderCover category={business.category} glyphClassName="w-9 h-9" />
                  )}
                </div>
              </Link>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/b/${business.slug}`}
                      className="text-sm font-semibold text-slate-900 hover:underline underline-offset-4 truncate block"
                    >
                      {business.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {categoryLabelFor(business.category, locale)} · {business.city}
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
                    <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      {business.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">({business.totalReviews})</span>
                  </div>
                )}

                <div className="mt-auto pt-3">
                  <InkLink href={`/b/${business.slug}/book`} size="sm" className="w-full">
                    {c.bookVisit}
                  </InkLink>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
