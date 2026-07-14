export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  PageHeader,
  GlassCard,
  CardHeader,
  EmptyState,
  InkLink,
  GlassLink,
  Overline,
  CHIP,
  HAIRLINE,
} from "@/components/ui/glass";

// Every observation on this page is a plain arithmetic fact derived from the
// owner's own rows. There is no model, no prediction — this footer sits under
// each card so the claim is never mistaken for AI output.
const HONEST_FOOTER = "Wyliczone z Twoich danych — nie jest to prognoza AI";

const DORMANT_DAYS = 60;
const HISTOGRAM_WINDOW_DAYS = 90;
const NO_SHOW_MIN_BASE = 4; // don't flag a rate off a tiny sample
const QUIET_DAY_MIN_APPTS = 5; // need enough demand to call a day "quiet"

// 0 = Mon … 6 = Sun
const DOW_INDEX: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
};
const DAY_FULL_PL = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const WARSAW_WEEKDAY = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", weekday: "short" });
const SHORT_DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function warsawDayIdx(d: Date): number {
  // returns 0 = Mon … 6 = Sun, computed in the salon's timezone
  return SHORT_DOW.indexOf(WARSAW_WEEKDAY.format(d));
}

// Statuses that never occupied a slot — excluded from the demand histogram.
const NON_DEMAND = new Set(["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS", "RESCHEDULED"]);

async function getAiData(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          appointments: {
            orderBy: { startTime: "desc" },
            include: {
              customer: { select: { id: true, firstName: true, lastName: true } },
              service: { select: { id: true, name: true } },
            },
          },
          // Only the rows we need to count: published & still unanswered.
          reviews: {
            where: { status: "PUBLISHED", replyText: null },
            select: { id: true },
          },
          workingHours: { select: { dayOfWeek: true, isOpen: true } },
        },
      },
    },
  });
}

// ── Shared card shell — CardHeader + spoken fact + honest footer ──
function ObservationCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={`overflow-hidden ${className ?? ""}`}>
      <CardHeader title={title} action={action} />
      <div className="px-5 py-4">
        {children}
        <p className="mt-3.5 text-[11px] text-slate-400 leading-relaxed">{HONEST_FOOTER}</p>
      </div>
    </GlassCard>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-slate-900 tabular-nums">{children}</strong>;
}

export default async function AiPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getAiData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const appointments = business.appointments;
  const now = new Date();
  const nowMs = now.getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dormantCutoff = nowMs - DORMANT_DAYS * 86_400_000;
  const histogramStart = nowMs - HISTOGRAM_WINDOW_DAYS * 86_400_000;

  // ── 1. Uśpieni klienci — last COMPLETED visit > 60 days ago ─────────
  // (customers already re-booked into the future are not "dormant", so they
  //  are excluded — that keeps the nudge honest.)
  const byCustomer = new Map<
    string,
    { name: string; lastCompleted: number | null; hasUpcoming: boolean }
  >();
  for (const a of appointments) {
    const c =
      byCustomer.get(a.customer.id) ??
      { name: `${a.customer.firstName} ${a.customer.lastName}`.trim(), lastCompleted: null, hasUpcoming: false };
    const t = a.startTime.getTime();
    if (a.status === "COMPLETED") c.lastCompleted = c.lastCompleted === null ? t : Math.max(c.lastCompleted, t);
    if ((a.status === "PENDING" || a.status === "CONFIRMED") && t > nowMs) c.hasUpcoming = true;
    byCustomer.set(a.customer.id, c);
  }
  const dormant = Array.from(byCustomer.values())
    .filter((c) => c.lastCompleted !== null && c.lastCompleted < dormantCutoff && !c.hasUpcoming)
    .sort((a, b) => (a.lastCompleted ?? 0) - (b.lastCompleted ?? 0)); // longest-gone first
  const dormantTop = dormant.slice(0, 5);

  // ── 2. Opinie bez odpowiedzi ────────────────────────────────────────
  const unrepliedReviews = business.reviews.length;

  // ── 3. Najspokojniejszy otwarty dzień ───────────────────────────────
  const openDays = new Set<number>();
  for (const wh of business.workingHours) {
    if (wh.isOpen) openDays.add(DOW_INDEX[wh.dayOfWeek]);
  }
  const dayHist = Array(7).fill(0) as number[];
  for (const a of appointments) {
    if (NON_DEMAND.has(a.status)) continue;
    const t = a.startTime.getTime();
    if (t < histogramStart || t > nowMs) continue;
    const idx = warsawDayIdx(a.startTime);
    if (idx >= 0) dayHist[idx]++;
  }
  const openTotal = Array.from(openDays).reduce((s, d) => s + dayHist[d], 0);
  let quietDay: { idx: number; count: number } | null = null;
  if (openDays.size >= 2 && openTotal >= QUIET_DAY_MIN_APPTS) {
    for (const d of openDays) {
      if (quietDay === null || dayHist[d] < quietDay.count) quietDay = { idx: d, count: dayHist[d] };
    }
  }

  // ── 4. No-show — this month, over completed + noshow ────────────────
  let completedThisMonth = 0;
  let noShowThisMonth = 0;
  const svcRevenue = new Map<string, { name: string; revenue: number; count: number }>();
  for (const a of appointments) {
    const t = a.startTime.getTime();
    if (t < monthStart.getTime() || t > nowMs) continue;
    if (a.status === "COMPLETED") {
      completedThisMonth++;
      const s = svcRevenue.get(a.service.id) ?? { name: a.service.name, revenue: 0, count: 0 };
      s.revenue += a.price;
      s.count++;
      svcRevenue.set(a.service.id, s);
    }
    if (a.status === "NO_SHOW") noShowThisMonth++;
  }
  const noShowBase = completedThisMonth + noShowThisMonth;
  const noShowRate = noShowBase > 0 ? noShowThisMonth / noShowBase : 0;
  const showNoShow = noShowBase >= NO_SHOW_MIN_BASE && noShowRate > 0.15;

  // ── 5. Najlepsza usługa — top completed revenue this month ──────────
  const topService = Array.from(svcRevenue.values()).sort((a, b) => b.revenue - a.revenue)[0] ?? null;

  // ── Assemble the secondary cards (dormant is the focal, rendered apart) ──
  const secondaryCards: React.ReactNode[] = [];

  if (showNoShow) {
    secondaryCards.push(
      <ObservationCard
        key="noshow"
        title="Nieobecności (no-show)"
        action={<GlassLink href="/business/analytics" size="sm">W analityce</GlassLink>}
      >
        <p className="text-sm text-slate-700 leading-relaxed">
          W tym miesiącu <Num>{noShowThisMonth}</Num> z <Num>{noShowBase}</Num> odbytych wizyt to
          nieobecności — to <Num>{Math.round(noShowRate * 100)}%</Num>. Rozważ zadatek albo
          przypomnienie dzień wcześniej.
        </p>
      </ObservationCard>
    );
  }

  if (unrepliedReviews > 0) {
    secondaryCards.push(
      <ObservationCard
        key="reviews"
        title="Opinie bez odpowiedzi"
        action={<GlassLink href="/business/reviews" size="sm">Odpowiedz</GlassLink>}
      >
        <p className="text-sm text-slate-700 leading-relaxed">
          <Num>{unrepliedReviews}</Num>{" "}
          {unrepliedReviews === 1 ? "opublikowana opinia czeka" : "opublikowanych opinii czeka"} na
          Twoją odpowiedź. Odpowiedź buduje zaufanie u kolejnych klientów.
        </p>
      </ObservationCard>
    );
  }

  if (topService) {
    secondaryCards.push(
      <ObservationCard
        key="service"
        title="Najlepsza usługa"
        action={<GlassLink href="/business/services" size="sm">Usługi</GlassLink>}
      >
        <p className="text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900">{topService.name}</span> przyniosła w tym
          miesiącu najwięcej — <Num>{formatCurrency(topService.revenue)}</Num> z{" "}
          <Num>{topService.count}</Num> {topService.count === 1 ? "wizyty" : "wizyt"}.
        </p>
      </ObservationCard>
    );
  }

  if (quietDay) {
    secondaryCards.push(
      <ObservationCard
        key="quietday"
        title="Najspokojniejszy dzień"
        action={<GlassLink href="/business/coupons" size="sm">Promocja</GlassLink>}
      >
        <p className="text-sm text-slate-700 leading-relaxed">
          Twój najspokojniejszy otwarty dzień to{" "}
          <span className="font-semibold text-slate-900">{DAY_FULL_PL[quietDay.idx]}</span> —{" "}
          <Num>{quietDay.count}</Num> {quietDay.count === 1 ? "wizyta" : "wizyt"} w ostatnich{" "}
          <Num>{HISTOGRAM_WINDOW_DAYS}</Num> dniach. Dobry moment na promocję, żeby go zapełnić.
        </p>
      </ObservationCard>
    );
  }

  const hasAnyObservation = dormant.length > 0 || secondaryCards.length > 0;
  const hasNoData = appointments.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="AI Asystent"
        subtitle="Automatyczne obserwacje na podstawie Twoich danych"
      />

      {hasNoData ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            title="Obserwacje pojawią się po pierwszych wizytach"
            body="Gdy w kalendarzu znajdą się wizyty, wyliczymy z nich uśpionych klientów, najspokojniejsze dni i najlepsze usługi. Bez zgadywania."
            action={<InkLink href="/business/calendar?action=new" size="sm">Zapisz pierwszą wizytę</InkLink>}
          />
        </GlassCard>
      ) : !hasAnyObservation ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            }
            title="Na razie nic nie wymaga uwagi"
            body="Nie ma uśpionych klientów, zaległych opinii ani podwyższonych nieobecności. Obserwacje wrócą, gdy w danych pojawi się coś wartego zgłoszenia."
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d1 space-y-4">
          {/* Focal card — dormant customers, full width with name chips */}
          {dormant.length > 0 && (
            <ObservationCard
              title="Uśpieni klienci"
              action={
                dormant.length > dormantTop.length ? (
                  <GlassLink href="/business/crm" size="sm">Wszyscy w CRM</GlassLink>
                ) : undefined
              }
            >
              <p className="text-sm text-slate-700 leading-relaxed">
                <Num>{dormant.length}</Num>{" "}
                {dormant.length === 1 ? "klient nie był" : "klientów nie było"} u Ciebie od ponad{" "}
                <Num>{DORMANT_DAYS}</Num> dni. Odezwij się, zanim znajdą inne miejsce.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dormantTop.map((c) => {
                  const daysAgo = Math.floor((nowMs - (c.lastCompleted ?? nowMs)) / 86_400_000);
                  return (
                    <GlassLink
                      key={c.name + daysAgo}
                      href={`/business/crm?q=${encodeURIComponent(c.name)}`}
                      size="sm"
                    >
                      <span className="truncate max-w-[10rem]">{c.name}</span>
                      <span className="text-slate-400 tabular-nums font-normal">· {daysAgo} dni</span>
                    </GlassLink>
                  );
                })}
                {dormant.length > dormantTop.length && (
                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-500 tabular-nums" style={CHIP}>
                    +{dormant.length - dormantTop.length} więcej
                  </span>
                )}
              </div>
              <p className="mt-3.5 text-[11px] text-slate-400 leading-relaxed">{HONEST_FOOTER}</p>
            </ObservationCard>
          )}

          {secondaryCards.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">{secondaryCards}</div>
          )}
        </div>
      )}

      {/* Clearly separate quiet strip: genuine ML features, honestly upcoming */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-3">
          <Overline>Na horyzoncie</Overline>
          <span className="flex-1" style={{ borderTop: HAIRLINE }} />
        </div>
        <GlassCard className="opacity-[0.92]">
          <CardHeader
            title="Prawdziwe funkcje AI"
            action={
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-600" style={CHIP}>
                Wkrótce
              </span>
            }
          />
          <div className="px-5 py-4">
            <p className="text-xs text-slate-500 leading-relaxed mb-3.5">
              Poniższe funkcje wymagają modeli uczenia maszynowego i nie są jeszcze dostępne.
              Obserwacje powyżej to zwykłe wyliczenia — nie udajemy, że to już działa.
            </p>
            <ul className="space-y-2.5">
              {[
                { name: "Prognoza przychodów", desc: "przewidywanie utargu na kolejne tygodnie" },
                { name: "Analiza sentymentu opinii", desc: "automatyczne wykrywanie nastroju w recenzjach" },
                { name: "Generowane odpowiedzi na opinie", desc: "propozycje treści odpowiedzi do zaakceptowania" },
              ].map((f) => (
                <li key={f.name} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm text-slate-500">
                    <span className="font-medium text-slate-600">{f.name}</span>
                    <span className="text-slate-400"> — {f.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
