export const dynamic = "force-dynamic";

export const metadata = {
  title: "Szukaj salonu — fryzjer, barber, masaż | Rezerwacja online",
  description:
    "Znajdź i zarezerwuj wizytę online: fryzjer, barber, paznokcie, masaż i więcej. Filtruj po mieście i kategorii, sprawdź opinie i wolne terminy.",
  alternates: { canonical: "/search" },
};

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/layout/landing-nav";
import { formatCurrency, cn } from "@/lib/utils";
import { ServiceCategory, BusinessStatus } from "@prisma/client";
import { parseCategoryParam, categoryLabel } from "@/lib/categories";
import { PlaceholderCover } from "@/components/ui/placeholder-cover";
import { FilterPanel, MobileFilters } from "./search-filters";

const PAGE_SIZE = 20;
const PRICE_SORT_CAP = 500;

const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

const STAR_PATH =
  "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z";

// Five-star row filled to the exact average (fractional fill via width clip)
function StarRow({ rating, sizeClass = "w-3 h-3" }: { rating: number; sizeClass?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span key={i} className={cn("relative inline-block flex-shrink-0", sizeClass)}>
            <svg className={cn("absolute inset-0 text-slate-300", sizeClass)} viewBox="0 0 24 24" fill="currentColor">
              <path d={STAR_PATH} />
            </svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg className={cn("text-amber-400", sizeClass)} viewBox="0 0 24 24" fill="currentColor">
                <path d={STAR_PATH} />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ─── Business Card ────────────────────────────────────────────────────────────

type BusinessWithServices = {
  id: string;
  slug: string;
  name: string;
  category: ServiceCategory;
  city: string;
  coverImageUrl: string | null;
  averageRating: number;
  totalReviews: number;
  services: { price: number; discountedPrice: number | null }[];
};

function minServicePrice(business: BusinessWithServices): number | null {
  return business.services.length > 0
    ? Math.min(...business.services.map((s) => s.discountedPrice ?? s.price))
    : null;
}

function BusinessCard({ business }: { business: BusinessWithServices }) {
  const minPrice = minServicePrice(business);

  return (
    <Link
      href={`/b/${business.slug}`}
      className="group overflow-hidden rounded-2xl search-card"
    >
      {/* Cover */}
      <div className="relative h-44 overflow-hidden">
        {business.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.coverImageUrl}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <PlaceholderCover category={business.category} glyphClassName="w-11 h-11 sm:w-12 sm:h-12" />
        )}
        {/* Glass category chip */}
        <span
          className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px) saturate(200%)",
            WebkitBackdropFilter: "blur(20px) saturate(200%)",
            border: "1px solid rgba(203,213,225,0.50)",
            color: "#475569",
            boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}
        >
          {categoryLabel(business.category)}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3
          className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-1"
          style={{ letterSpacing: "-0.01em" }}
        >
          {business.name}
        </h3>

        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span className="text-xs text-slate-500">{business.city}</span>
        </div>

        {/* Rating — single star + number, or honest "Nowy salon" chip */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {business.totalReviews > 0 ? (
            <span
              className="inline-flex items-center gap-1.5"
              role="img"
              aria-label={`Ocena ${business.averageRating.toFixed(1)} na 5, ${business.totalReviews} opinii`}
            >
              <StarRow rating={business.averageRating} sizeClass="w-3 h-3" />
              <span className="text-xs font-semibold text-slate-900 tabular-nums">
                {business.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">({business.totalReviews})</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-slate-600"
              style={{
                background: "rgba(255,255,255,0.70)",
                border: "1px solid rgba(203,213,225,0.55)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
              }}
            >
              Nowy salon
            </span>
          )}

          {minPrice !== null && (
            <span className="text-sm font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.01em" }}>
              od {formatCurrency(minPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(203,213,225,0.40)",
        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 2px 12px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      <div className="h-44 skeleton" style={{ borderRadius: 0 }} />
      <div className="p-4 space-y-2.5">
        <div className="h-4 rounded-lg w-3/4 skeleton" />
        <div className="h-3 rounded-lg w-1/3 skeleton" />
        <div className="h-4 rounded-lg w-1/2 skeleton" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ─── Results ─────────────────────────────────────────────────────────────────

type SearchParams = {
  q?: string;
  category?: string;
  city?: string;
  date?: string;
  sort?: string;
  page?: string;
};

function buildSearchUrl(params: SearchParams, overrides: Partial<SearchParams>): string {
  const merged = { ...params, ...overrides };
  const url = new URLSearchParams();
  if (merged.q) url.set("q", merged.q);
  if (merged.category) url.set("category", merged.category);
  if (merged.city) url.set("city", merged.city);
  if (merged.sort && merged.sort !== "rating") url.set("sort", merged.sort);
  if (merged.page && merged.page !== "1") url.set("page", merged.page);
  const qs = url.toString();
  return `/search${qs ? `?${qs}` : ""}`;
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;
  const sort = searchParams.sort === "price" ? "price" : "rating";

  // Accepts enum names, canonical slugs, and legacy lowercase slugs —
  // old category links filter correctly instead of silently no-opping.
  const categoryFilter = parseCategoryParam(searchParams.category);

  const where = {
    status: BusinessStatus.ACTIVE,
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(searchParams.city ? { city: { contains: searchParams.city, mode: "insensitive" as const } } : {}),
    ...(searchParams.q
      ? {
          OR: [
            { name: { contains: searchParams.q, mode: "insensitive" as const } },
            { description: { contains: searchParams.q, mode: "insensitive" as const } },
            { shortDescription: { contains: searchParams.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  let businesses: BusinessWithServices[] = [];
  let totalCount = 0;

  try {
    if (sort === "price") {
      // Cheapest-first needs the min service price — computed here, so fetch
      // the (capped) matching set and paginate after sorting.
      const all = await prisma.business.findMany({
        where,
        include: {
          services: { where: { isActive: true }, select: { price: true, discountedPrice: true } },
        },
        orderBy: { averageRating: "desc" },
        take: PRICE_SORT_CAP,
      });
      all.sort((a, b) => (minServicePrice(a) ?? Infinity) - (minServicePrice(b) ?? Infinity));
      totalCount = all.length;
      businesses = all.slice(skip, skip + PAGE_SIZE);
    } else {
      businesses = await prisma.business.findMany({
        where,
        include: {
          services: { where: { isActive: true }, select: { price: true, discountedPrice: true } },
        },
        orderBy: { averageRating: "desc" },
        skip,
        take: PAGE_SIZE,
      });
      totalCount = await prisma.business.count({ where });
    }
  } catch {
    // DB not available — show empty state instead of crashing
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasFilters = Boolean(searchParams.q || searchParams.category || searchParams.city);

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(24px) saturate(200%)",
            WebkitBackdropFilter: "blur(24px) saturate(200%)",
            border: "1px solid rgba(203,213,225,0.45)",
            boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 4px 16px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.90)",
          }}
        >
          <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-slate-900 font-semibold">Nie znaleziono salonów</p>
        <p className="text-slate-500 text-sm mt-1 mb-5">
          Spróbuj zmienić filtry lub wyszukaj inną frazę.
        </p>
        {hasFilters && (
          <Link
            href="/search"
            className="btn-spring px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: INK,
              border: "1px solid #0F172A",
              color: "#F8FAFC",
              boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Wyczyść filtry
          </Link>
        )}
      </div>
    );
  }

  const sortOptions = [
    { key: "rating", label: "Ocena" },
    { key: "price", label: "Cena" },
  ];

  return (
    <div>
      {/* Count + sort */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500 tabular-nums">
          {totalCount} {totalCount === 1 ? "wynik" : totalCount < 5 ? "wyniki" : "wyników"}
        </p>
        <div
          className="inline-flex items-center gap-0.5 p-0.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(203,213,225,0.45)",
            boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.90)",
          }}
          role="group"
          aria-label="Sortowanie wyników"
        >
          {sortOptions.map((opt) => {
            const active = sort === opt.key;
            return (
              <Link
                key={opt.key}
                href={buildSearchUrl(searchParams, { sort: opt.key, page: "1" })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors",
                  active ? "text-white" : "text-slate-500 hover:text-slate-800"
                )}
                style={active ? { background: INK, boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" } : undefined}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {businesses.map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {page > 1 && (
            <Link
              href={buildSearchUrl(searchParams, { page: String(page - 1) })}
              className="btn-spring px-4 py-2 text-sm font-medium rounded-xl"
              style={{ background: "rgba(255,255,255,0.78)", backdropFilter: "blur(20px) saturate(200%)", WebkitBackdropFilter: "blur(20px) saturate(200%)", border: "1px solid rgba(203,213,225,0.45)", color: "#475569", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.90)" }}
            >
              Poprzednia
            </Link>
          )}
          <span className="text-sm text-slate-500 px-2 tabular-nums">Strona {page} z {totalPages}</span>
          {page < totalPages && (
            <Link
              href={buildSearchUrl(searchParams, { page: String(page + 1) })}
              className="btn-spring px-4 py-2 text-sm font-semibold rounded-xl"
              style={{ background: INK, border: "1px solid #0F172A", color: "#F8FAFC", boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 8px 20px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.15)" }}
            >
              Następna
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const categoryFilter = parseCategoryParam(params.category);

  const title = params.q
    ? `Wyniki dla „${params.q}"`
    : categoryFilter
    ? categoryLabel(categoryFilter)
    : "Znajdź specjalistę";

  const subtitle = params.city
    ? `Salony i specjaliści w: ${params.city}`
    : "Salony i specjaliści z rezerwacją online";

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse 100% 70% at 60% -15%, rgba(226,232,240,0.50) 0%, transparent 55%), radial-gradient(ellipse 70% 55% at -5% 90%, rgba(203,213,225,0.28) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(241,245,249,0.55) 0%, transparent 65%), linear-gradient(165deg, #F4F7FB 0%, #F8FAFC 50%, #EEF4FB 100%)" }}
    >
      <LandingNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-6 fade-rise">
          <h1 className="text-2xl sm:text-[1.75rem] font-bold text-slate-900" style={{ letterSpacing: "-0.03em" }}>
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Mobile filter bar */}
        <div className="lg:hidden mb-5 fade-rise fade-rise-d1">
          <MobileFilters
            currentQ={params.q}
            currentCategory={categoryFilter ?? params.category}
            currentCity={params.city}
          />
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0 fade-rise fade-rise-d1">
            <div className="sticky top-24">
              <FilterPanel
                currentQ={params.q}
                currentCategory={categoryFilter ?? params.category}
                currentCity={params.city}
              />
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0 fade-rise fade-rise-d2">
            <Suspense fallback={<SkeletonGrid />}>
              <SearchResults searchParams={params} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
