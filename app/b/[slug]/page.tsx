export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/layout/landing-nav";
import { formatCurrency, formatDate, formatDuration, getInitials, cn } from "@/lib/utils";
import { BusinessStatus, ReviewStatus } from "@prisma/client";
import { PlaceholderCover } from "@/components/ui/placeholder-cover";
import BookingWidget from "./booking-widget";
import ReviewForm from "./review-form";
import FavouriteButton from "@/components/booking/favourite-button";
import { isFavourite } from "@/lib/actions/favourites";
import { getServerUser } from "@/lib/supabase/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Poniedziałek",
  TUESDAY: "Wtorek",
  WEDNESDAY: "Środa",
  THURSDAY: "Czwartek",
  FRIDAY: "Piątek",
  SATURDAY: "Sobota",
  SUNDAY: "Niedziela",
};

const DAY_ORDER: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

const STAR_PATH =
  "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z";

function Star({ className }: { className?: string }) {
  return (
    <svg className={cn("text-amber-400", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  );
}

// Five-star row filled to the exact average (fractional fill via width clip —
// no SVG gradient ids, so it is safe to repeat in RSC lists).
// Rendered only for rated salons; unrated ones get the "Nowy salon" chip.
function StarRow({ rating, sizeClass = "w-3.5 h-3.5" }: { rating: number; sizeClass?: string }) {
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

function reviewsWord(n: number) {
  return n === 1 ? "opinia" : n < 5 ? "opinie" : "opinii";
}

// Star row + average + review count, e.g. ★★★★½ 4.5 (1230 opinii)
function Rating({
  rating,
  count,
  size = "md",
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`Ocena ${rating.toFixed(1)} na 5${count ? `, ${count} ${reviewsWord(count)}` : ""}`}
    >
      <StarRow rating={rating} sizeClass={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span className={cn("font-semibold text-slate-900 tabular-nums", size === "sm" ? "text-xs" : "text-sm")}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && count > 0 && (
        <span className={cn("text-slate-500", size === "sm" ? "text-xs" : "text-sm")}>
          ({count} {reviewsWord(count)})
        </span>
      )}
    </span>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
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

// "Otwarte · do 18:00" — computed per-request in Europe/Warsaw
function getOpenStatus(
  hours: { dayOfWeek: string; isOpen: boolean; openTime: string; closeTime: string }[]
): { open: boolean; label: string } {
  const now = new Date();
  const dayName = now
    .toLocaleDateString("en-US", { timeZone: "Europe/Warsaw", weekday: "long" })
    .toUpperCase();
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const today = hours.find((h) => h.dayOfWeek === dayName);
  if (!today || !today.isOpen) return { open: false, label: "Dziś zamknięte" };
  if (hm < today.openTime) return { open: false, label: `Otwiera o ${today.openTime}` };
  if (hm < today.closeTime) return { open: true, label: `Otwarte · do ${today.closeTime}` };
  return { open: false, label: "Dziś zamknięte" };
}

// ─── Metadata (SEO) ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      city: true,
      category: true,
      shortDescription: true,
      metaTitle: true,
      metaDescription: true,
      status: true,
    },
  });

  if (!business || business.status !== "ACTIVE") {
    return { title: "Salon nie znaleziony" };
  }

  const categoryLabel = CATEGORY_LABELS[business.category] ?? "Salon";
  const title =
    business.metaTitle ??
    `${business.name} — ${categoryLabel}, ${business.city} | Rezerwacja online`;
  const description =
    business.metaDescription ??
    business.shortDescription ??
    `Umów wizytę online w ${business.name} (${categoryLabel}, ${business.city}). Sprawdź usługi, ceny i wolne terminy — rezerwacja 24/7 przez Termcatch.`;

  return {
    title,
    description,
    alternates: { canonical: `/b/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BusinessProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { slug } = await params;
  const { review: reviewAppointmentId } = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
      employees: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
      workingHours: {
        orderBy: { dayOfWeek: "asc" },
      },
      reviews: {
        where: { status: ReviewStatus.PUBLISHED },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!business || business.status !== BusinessStatus.ACTIVE) {
    notFound();
  }

  const favourite = await isFavourite(business.id);

  // Review modal — only for the customer's own COMPLETED, unreviewed appointment
  let reviewAppointment: { id: string; serviceName: string } | null = null;
  if (reviewAppointmentId) {
    const authUser = await getServerUser();
    if (authUser) {
      const dbUser = await prisma.user.findUnique({
        where: { supabaseId: authUser.id },
        select: { id: true },
      });
      if (dbUser) {
        const apt = await prisma.appointment.findFirst({
          where: {
            id: reviewAppointmentId,
            customerId: dbUser.id,
            businessId: business.id,
            status: "COMPLETED",
            review: null,
          },
          select: { id: true, service: { select: { name: true } } },
        });
        if (apt) {
          reviewAppointment = { id: apt.id, serviceName: apt.service.name };
        }
      }
    }
  }

  const categoryLabel = CATEGORY_LABELS[business.category] ?? business.category;

  const sortedWorkingHours = [...business.workingHours].sort(
    (a, b) => (DAY_ORDER[a.dayOfWeek] ?? 0) - (DAY_ORDER[b.dayOfWeek] ?? 0)
  );

  const openStatus = sortedWorkingHours.length > 0 ? getOpenStatus(sortedWorkingHours) : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${business.address}, ${business.city}`
  )}`;

  const initials = getInitials(business.name.split(" ")[0] ?? "", business.name.split(" ")[1]);

  // Rating distribution — only when the 5 fetched reviews are ALL reviews (no partial-data bars)
  const distribution =
    business.totalReviews > 0 && business.reviews.length >= business.totalReviews
      ? [5, 4, 3, 2, 1].map((s) => ({
          star: s,
          count: business.reviews.filter((r) => r.rating === s).length,
        }))
      : null;

  // Structured data — LocalBusiness dla Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: business.name,
    description: business.shortDescription ?? business.description ?? undefined,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"}/b/${slug}`,
    telephone: business.phone ?? undefined,
    image: business.coverImageUrl ?? business.logoUrl ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.city,
      postalCode: business.postalCode,
      addressCountry: "PL",
    },
    ...(business.totalReviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: business.averageRating.toFixed(1),
            reviewCount: business.totalReviews,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  const glassCard = {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(36px) saturate(200%)",
    WebkitBackdropFilter: "blur(36px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.45)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.30), 0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(203,213,225,0.08)",
  } as React.CSSProperties;

  // Solid-white row card — repeats in lists, so no backdrop blur (perf)
  const rowCard = {
    background: "rgba(255,255,255,0.80)",
    border: "1px solid rgba(203,213,225,0.45)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.22), 0 1px 2px rgba(0,0,0,0.02), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
  } as React.CSSProperties;

  const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse 100% 70% at 60% -10%, rgba(226,232,240,0.50) 0%, transparent 55%), radial-gradient(ellipse 70% 55% at -5% 90%, rgba(203,213,225,0.28) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(241,245,249,0.55) 0%, transparent 65%), linear-gradient(165deg, #F4F7FB 0%, #F8FAFC 50%, #EEF4FB 100%)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      {/* Cover — real photo gets height; placeholder stays intentional and low */}
      <div className="pt-16">
        {business.coverImageUrl ? (
          <div className="relative h-[200px] sm:h-[280px] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={business.coverImageUrl}
              alt={business.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/25 to-transparent" />
          </div>
        ) : (
          <div className="relative h-[140px] sm:h-[160px] w-full">
            <PlaceholderCover category={business.category} />
          </div>
        )}
      </div>

      {/* Business header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          className="fade-rise relative -mt-10 flex items-end gap-4 sm:gap-5 pb-6"
          style={{ borderBottom: "1px solid rgba(203,213,225,0.28)" }}
        >
          {/* Logo */}
          <div
            className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden"
            style={{ ...glassCard, border: "3px solid rgba(255,255,255,0.92)" }}
          >
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(140deg, #E8EEF6 0%, #F4F7FB 50%, #DFE7F1 100%)" }}
              >
                <span
                  className="text-xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, #475569 0%, #94A3B8 55%, #334155 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {initials}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: "rgba(203,213,225,0.22)", border: "1px solid rgba(203,213,225,0.50)", color: "#475569", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)" }}
              >
                {categoryLabel}
              </span>
              {openStatus && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={
                    openStatus.open
                      ? { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" }
                      : { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: openStatus.open ? "#10B981" : "#94A3B8" }}
                  />
                  <span className="tabular-nums">{openStatus.label}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight" style={{ letterSpacing: "-0.03em" }}>
              {business.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
              {business.totalReviews > 0 ? (
                <Rating rating={business.averageRating} count={business.totalReviews} />
              ) : (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.70)", border: "1px solid rgba(203,213,225,0.55)", color: "#475569", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }}
                >
                  Nowy salon
                </span>
              )}
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                {business.city}
              </div>
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <span className="tabular-nums">{business.phone}</span>
                </a>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 pb-1">
            <FavouriteButton businessId={business.id} initialIsFavourite={favourite} redirectPath={`/b/${slug}`} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* Services */}
            <section className="fade-rise fade-rise-d1">
              <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.025em" }}>Usługi</h2>
              {business.services.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={glassCard}>
                  <p className="text-slate-500 text-sm">Ten salon nie dodał jeszcze usług.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {business.services.map((service) => (
                    <div
                      key={service.id}
                      className="card-hover-lift rounded-2xl p-4 sm:p-5 flex items-start gap-4"
                      style={rowCard}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900" style={{ letterSpacing: "-0.01em" }}>
                          {service.name}
                        </p>
                        {service.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{service.description}</p>
                        )}
                        <p className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          {formatDuration(service.duration)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                        <div className="text-right">
                          {service.discountedPrice ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-slate-400 line-through tabular-nums">{formatCurrency(service.price)}</span>
                              <span className="text-base font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.01em" }}>
                                {formatCurrency(service.discountedPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.01em" }}>
                              {formatCurrency(service.price)}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/b/${slug}/book?serviceId=${service.id}`}
                          className="btn-spring px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                          style={{
                            background: "rgba(203,213,225,0.22)",
                            border: "1px solid rgba(203,213,225,0.55)",
                            color: "#334155",
                            boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.80)",
                          }}
                        >
                          Umów
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* About */}
            {(business.description || business.shortDescription) && (
              <section className="fade-rise fade-rise-d2">
                <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.025em" }}>O nas</h2>
                <div className="rounded-2xl p-5" style={glassCard}>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {business.description ?? business.shortDescription}
                  </p>
                </div>
              </section>
            )}

            {/* Gallery */}
            {business.images.length > 0 && (
              <section className="fade-rise fade-rise-d2">
                <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.025em" }}>Galeria</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {business.images.map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(203,213,225,0.45)", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 4px 14px rgba(100,116,139,0.07)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${business.name} — zdjęcie ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.04]"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Team */}
            {business.employees.length > 0 && (
              <section className="fade-rise fade-rise-d3">
                <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.025em" }}>Zespół</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {business.employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="card-hover-lift rounded-2xl p-4 flex flex-col items-start gap-3"
                      style={rowCard}
                    >
                      {employee.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={employee.avatarUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover"
                          style={{ border: "1px solid rgba(203,213,225,0.45)" }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: employee.color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
                        >
                          <span className="text-white text-sm font-bold">
                            {getInitials(employee.firstName, employee.lastName)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {employee.firstName} {employee.lastName}
                        </p>
                        {(employee.title || employee.bio) && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {employee.title ?? employee.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Working hours + contact */}
            <section className="fade-rise fade-rise-d4">
              <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.025em" }}>Informacje</h2>
              <div className="rounded-2xl overflow-hidden" style={glassCard}>
                {/* Working hours */}
                {sortedWorkingHours.length > 0 && (
                  <div className="p-5" style={{ borderBottom: "1px solid rgba(203,213,225,0.25)" }}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        Godziny otwarcia
                      </h3>
                      {openStatus && (
                        <span
                          className={cn("text-xs font-semibold tabular-nums", openStatus.open ? "text-emerald-700" : "text-slate-500")}
                        >
                          {openStatus.label}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {sortedWorkingHours.map((wh) => {
                        const today = new Date().toLocaleDateString("en-US", { timeZone: "Europe/Warsaw", weekday: "long" }).toUpperCase();
                        const isToday = today === wh.dayOfWeek;
                        return (
                          <div
                            key={wh.id}
                            className={cn("flex items-center justify-between text-sm py-1", isToday ? "font-semibold text-slate-800" : "text-slate-500")}
                          >
                            <span className="flex items-center gap-2">
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                              {!isToday && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                              {DAY_LABELS[wh.dayOfWeek]}
                            </span>
                            <span className={cn("tabular-nums", !wh.isOpen && "text-slate-400")}>
                              {wh.isOpen ? `${wh.openTime} — ${wh.closeTime}` : "Nieczynne"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Address + map */}
                <div className="p-5" style={{ borderBottom: "1px solid rgba(203,213,225,0.25)" }}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    Adres
                  </h3>
                  <p className="text-sm text-slate-600">{business.address}, {business.postalCode} {business.city}</p>
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(203,213,225,0.35)" }}>
                    <iframe
                      title={`Mapa dojazdu — ${business.name}`}
                      src={`https://maps.google.com/maps?f=q&source=s_q&q=${encodeURIComponent(`${business.name}, ${business.address}, ${business.city}`)}&z=15&t=m&hl=pl&ie=UTF8&iwloc=B&output=embed`}
                      className="w-full h-56 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 transition-colors">
                    Otwórz w Google Maps (nawigacja)
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>

                {/* Contact */}
                {(business.phone || business.email || business.website) && (
                  <div className="p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                      </svg>
                      Kontakt
                    </h3>
                    <div className="space-y-1.5">
                      {business.phone && <a href={`tel:${business.phone}`} className="block text-sm text-slate-600 hover:text-slate-900 transition-colors tabular-nums">{business.phone}</a>}
                      {business.email && <a href={`mailto:${business.email}`} className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">{business.email}</a>}
                      {business.website && <a href={business.website} target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">{business.website.replace(/^https?:\/\//, "")}</a>}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Reviews */}
            <section className="fade-rise fade-rise-d5">
              <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.025em" }}>
                Opinie{" "}
                {business.totalReviews > 0 && (
                  <span className="text-slate-400 font-normal text-base">({business.totalReviews})</span>
                )}
              </h2>

              {business.reviews.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={glassCard}>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: "rgba(255,255,255,0.78)",
                      border: "1px solid rgba(203,213,225,0.50)",
                      boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.90)",
                    }}
                  >
                    <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Ten salon nie ma jeszcze opinii</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Opinię może wystawić tylko klient po zakończonej wizycie — dzięki temu wszystkie oceny są prawdziwe.
                  </p>
                </div>
              ) : (
                <>
                {business.averageRating > 0 && (
                  <div className="rounded-2xl p-5 mb-3 flex items-center gap-6" style={glassCard}>
                    <div className="text-center flex-shrink-0">
                      <p className="text-4xl font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.03em" }}>
                        {business.averageRating.toFixed(1)}
                      </p>
                      <div className="flex justify-center mt-1.5">
                        <StarRow rating={business.averageRating} sizeClass="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        {business.totalReviews} {reviewsWord(business.totalReviews)}
                      </p>
                    </div>
                    {distribution ? (
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {distribution.map(({ star, count }) => {
                          const pct = business.totalReviews > 0 ? (count / business.totalReviews) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2.5">
                              <span className="w-3 text-xs font-medium text-slate-500 tabular-nums text-right">{star}</span>
                              <Star className="w-3 h-3 flex-shrink-0" />
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(203,213,225,0.35)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: INK }}
                                />
                              </div>
                              <span className="w-4 text-xs text-slate-500 tabular-nums">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        <div className="h-12 w-px flex-shrink-0" style={{ background: "rgba(203,213,225,0.35)" }} />
                        <p className="text-sm text-slate-500">
                          Na podstawie{" "}
                          <span className="font-semibold text-slate-800">{business.totalReviews}</span>{" "}
                          {reviewsWord(business.totalReviews)} klientów
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2.5">
                  {business.reviews.map((review) => (
                    <div key={review.id} className="card-hover-lift rounded-2xl p-5" style={rowCard}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "linear-gradient(140deg, rgba(226,232,240,0.70) 0%, rgba(203,213,225,0.40) 100%)", border: "1px solid rgba(203,213,225,0.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)" }}
                          >
                            <span className="text-xs font-bold text-slate-600">
                              {review.customer.firstName[0]}{review.customer.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {review.customer.firstName} {review.customer.lastName[0]}.
                            </p>
                            <div className="mt-0.5" role="img" aria-label={`Ocena ${review.rating} na 5`}>
                              <StarRow rating={review.rating} sizeClass="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                          {formatDate(review.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
                </>
              )}
            </section>
          </div>

          {/* Right column — Booking widget */}
          <div className="hidden lg:block w-[360px] flex-shrink-0">
            <div className="sticky top-24 fade-rise fade-rise-d2">
              <BookingWidget
                slug={slug}
                services={business.services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  duration: s.duration,
                  price: s.price,
                  discountedPrice: s.discountedPrice,
                }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {business.services.length > 0 && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          style={{
            background: "rgba(255,255,255,0.90)",
            backdropFilter: "blur(24px) saturate(200%)",
            WebkitBackdropFilter: "blur(24px) saturate(200%)",
            borderTop: "1px solid rgba(203,213,225,0.35)",
            boxShadow: "0 -8px 24px rgba(100,116,139,0.08)",
          }}
        >
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Usługi od</p>
              <p className="text-base font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.01em" }}>
                {formatCurrency(Math.min(...business.services.map((s) => s.discountedPrice ?? s.price)))}
              </p>
            </div>
            <Link
              href={`/b/${slug}/book`}
              className="btn-spring px-6 py-3 rounded-xl text-sm font-semibold"
              style={{
                background: INK,
                border: "1px solid #0F172A",
                color: "#F8FAFC",
                boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              Zarezerwuj wizytę
            </Link>
          </div>
        </div>
      )}
      {/* Spacer so the sticky bar doesn't cover content on mobile */}
      {business.services.length > 0 && <div className="h-20 lg:hidden" />}

      {/* Review modal */}
      {reviewAppointment && (
        <ReviewForm
          appointmentId={reviewAppointment.id}
          businessName={business.name}
          serviceName={reviewAppointment.serviceName}
        />
      )}
    </div>
  );
}
