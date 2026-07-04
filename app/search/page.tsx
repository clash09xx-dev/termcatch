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
import { formatCurrency } from "@/lib/utils";
import { ServiceCategory, BusinessStatus } from "@prisma/client";
import SearchFilters from "./search-filters";

// ─── Category map ───────────────────────────────────────────────────────────

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
  PSYCHIATRIST: "Psychiatra",
  DIETICIAN: "Dietetyk",
  GENERAL_PHYSICIAN: "Lekarz ogólny",
  DENTIST: "Stomatolog",
  DERMATOLOGIST: "Dermatolog",
  GYNECOLOGIST: "Ginekolog",
  OPHTHALMOLOGIST: "Okulista",
  ORTHOPEDIST: "Ortopeda",
  PEDIATRICIAN: "Pediatra",
  PET_GROOMING: "Grooming",
  PHOTOGRAPHY: "Fotografia",
};

const PAGE_SIZE = 20;

// ─── Stars SVG ───────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rounded >= star;
          const half = !filled && rounded >= star - 0.5;
          return (
            <svg
              key={star}
              className={`w-3.5 h-3.5 ${filled || half ? "text-amber-400" : "text-gray-200"}`}
              viewBox="0 0 24 24"
              fill={filled ? "currentColor" : half ? "url(#half)" : "none"}
              stroke="currentColor"
              strokeWidth={filled || half ? 0 : 1.5}
            >
              {half && (
                <defs>
                  <linearGradient id={`half-${star}`}>
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              )}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                fill={filled ? "currentColor" : "none"}
              />
            </svg>
          );
        })}
      </div>
      <span className="text-xs text-gray-500">
        {rating > 0 ? rating.toFixed(1) : "—"}
        {count > 0 && <span className="ml-1 text-gray-400">({count})</span>}
      </span>
    </div>
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

function BusinessCard({ business }: { business: BusinessWithServices }) {
  const minPrice = business.services.length > 0
    ? Math.min(...business.services.map((s) => s.discountedPrice ?? s.price))
    : null;
  const categoryLabel = CATEGORY_LABELS[business.category] ?? business.category;

  return (
    <Link
      href={`/b/${business.slug}`}
      className="group bg-white border border-gray-100 rounded-2xl shadow-soft overflow-hidden hover:shadow-soft-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden">
        {business.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.coverImageUrl}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-gray-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614"
              />
            </svg>
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 border border-white/60">
          {categoryLabel}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-gray-700 transition-colors">
          {business.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span className="text-xs text-gray-500">{business.city}</span>
        </div>
        <div className="mt-2.5">
          <StarRating rating={business.averageRating} count={business.totalReviews} />
        </div>
        {minPrice !== null && (
          <p className="mt-2.5 text-sm font-semibold text-gray-900">
            Od {formatCurrency(minPrice)}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-soft overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
        <div className="h-4 bg-gray-100 rounded-lg w-1/4 mt-1" />
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
  page?: string;
};

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const categoryFilter = searchParams.category &&
    Object.keys(ServiceCategory).includes(searchParams.category)
    ? (searchParams.category as ServiceCategory)
    : undefined;

  let businesses: BusinessWithServices[] = [];
  let totalCount = 0;

  try {
    businesses = await prisma.business.findMany({
    where: {
      status: BusinessStatus.ACTIVE,
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(searchParams.city ? { city: { contains: searchParams.city, mode: "insensitive" } } : {}),
      ...(searchParams.q
        ? {
            OR: [
              { name: { contains: searchParams.q, mode: "insensitive" } },
              { description: { contains: searchParams.q, mode: "insensitive" } },
              { shortDescription: { contains: searchParams.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      services: {
        where: { isActive: true },
        select: { price: true, discountedPrice: true },
      },
    },
    orderBy: { averageRating: "desc" },
    skip,
    take: PAGE_SIZE,
  });

    totalCount = await prisma.business.count({
      where: {
        status: BusinessStatus.ACTIVE,
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(searchParams.city ? { city: { contains: searchParams.city, mode: "insensitive" } } : {}),
        ...(searchParams.q
          ? {
              OR: [
                { name: { contains: searchParams.q, mode: "insensitive" } },
                { description: { contains: searchParams.q, mode: "insensitive" } },
                { shortDescription: { contains: searchParams.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });
  } catch {
    // DB not available — show empty state instead of crashing
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-gray-900 font-semibold">Nie znaleziono salonów</p>
        <p className="text-gray-500 text-sm mt-1">Spróbuj zmienić filtry lub wyszukaj inną frazę.</p>
      </div>
    );
  }

  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.category) params.set("category", searchParams.category);
  if (searchParams.city) params.set("city", searchParams.city);
  if (searchParams.date) params.set("date", searchParams.date);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Znaleziono <span className="font-semibold text-gray-900">{totalCount}</span>{" "}
        {totalCount === 1 ? "salon" : totalCount < 5 ? "salony" : "salonów"}
      </p>

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
              href={`/search?${params.toString()}&page=${page - 1}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Poprzednia
            </Link>
          )}
          <span className="text-sm text-gray-500 px-2">
            Strona {page} z {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/search?${params.toString()}&page=${page + 1}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
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

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {params.q ? `Wyniki dla „${params.q}"` : "Znajdź specjalistę"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Salony i specjaliści dostępni online
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-24">
              <SearchFilters
                currentQ={params.q}
                currentCategory={params.category}
                currentCity={params.city}
                currentDate={params.date}
              />
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0">
            <Suspense fallback={<SkeletonGrid />}>
              <SearchResults searchParams={params} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
