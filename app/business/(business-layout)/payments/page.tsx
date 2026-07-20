export const dynamic = "force-dynamic";

import { Fragment } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { billingConfigured } from "@/lib/subscription";
import { SubscribeButtons } from "@/components/business/subscribe-buttons";
import {
  PageHeader,
  GlassCard,
  InkLink,
  GlassLink,
  Overline,
  HAIRLINE,
  CHIP,
  INK_GRADIENT,
} from "@/components/ui/glass";

const SUB_STATUS_LABEL: Record<string, string> = {
  TRIALING: "Okres próbny",
  ACTIVE: "Aktywna",
  PAST_DUE: "Zaległa płatność",
  CANCELLED: "Anulowana",
  PAUSED: "Wstrzymana",
};

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "";
}

type SubRow = {
  status: string;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
} | null;

// Real subscription/trial status from synced Stripe data — never a hardcoded "7 dni".
function SubscriptionCard({ sub }: { sub: SubRow }) {
  const active = Boolean(sub?.stripeSubscriptionId);
  return (
    <GlassCard className="p-5 fade-rise fade-rise-d1">
      <Overline>Subskrypcja TermCatch</Overline>
      {active && sub ? (
        <div className="mt-2">
          <p className="text-sm font-semibold text-slate-900">
            Status: {SUB_STATUS_LABEL[sub.status] ?? sub.status}
          </p>
          {sub.status === "TRIALING" && sub.trialEndsAt && (
            <p className="text-sm text-slate-600 mt-1">Okres próbny trwa do {fmtDate(sub.trialEndsAt)}.</p>
          )}
          {sub.status !== "TRIALING" && sub.currentPeriodEnd && (
            <p className="text-sm text-slate-600 mt-1">
              {sub.cancelAtPeriodEnd ? "Subskrypcja zakończy się" : "Kolejne odnowienie"}: {fmtDate(sub.currentPeriodEnd)}.
            </p>
          )}
        </div>
      ) : billingConfigured() ? (
        <div className="mt-2">
          <p className="text-sm text-slate-600 mb-3">
            Rozpocznij subskrypcję z 7-dniowym okresem próbnym — bez opłat na start.
          </p>
          <SubscribeButtons />
        </div>
      ) : (
        <p className="text-sm text-slate-500 mt-2">
          Płatności abonamentowe będą dostępne wkrótce. 7 dni za darmo na start.
        </p>
      )}
    </GlassCard>
  );
}

// ── Data ──────────────────────────────────────────────────────

async function getPaymentsData(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        select: {
          id: true,
          currency: true,
          stripeAccountId: true,
          stripeOnboarded: true,
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              status: true,
              stripeSubscriptionId: true,
              trialEndsAt: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      },
    },
  });
}

type ConnectState = "NOT_CONNECTED" | "PENDING" | "ACTIVE";

// ── Icons ─────────────────────────────────────────────────────

const CardIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CheckMark = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// ── Connect steps — Konto → Weryfikacja → Wypłaty ─────────────
// `current` = index of the step in progress; earlier steps read as done.

const CONNECT_STEPS = [
  { title: "Konto", sub: "Załóż konto Stripe" },
  { title: "Weryfikacja", sub: "Potwierdź dane firmy" },
  { title: "Wypłaty", sub: "Odbieraj środki" },
];

const EMERALD_SOFT = {
  background: "rgba(16,185,129,0.12)",
  border: "1px solid rgba(16,185,129,0.30)",
  color: "#047857",
};

function ConnectSteps({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center gap-1 sm:gap-2">
      {CONNECT_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={s.title}>
            <div className="flex flex-col items-center text-center w-[76px] sm:w-24 flex-shrink-0">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold tabular-nums"
                style={
                  done
                    ? EMERALD_SOFT
                    : active
                    ? {
                        background: INK_GRADIENT,
                        border: "1px solid #0F172A",
                        color: "#F8FAFC",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.15)",
                      }
                    : CHIP
                }
              >
                {done ? <CheckMark /> : <span className={active ? "text-white" : "text-slate-500"}>{i + 1}</span>}
              </span>
              <p className={cn("mt-2 text-sm font-semibold", done || active ? "text-slate-900" : "text-slate-500")}>
                {s.title}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{s.sub}</p>
            </div>
            {i < CONNECT_STEPS.length - 1 && (
              <span className="h-px flex-1 min-w-[12px] mt-5" style={{ background: "rgba(203,213,225,0.6)" }} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── What connecting unlocks (honest) ──────────────────────────

const UNLOCKS = [
  { title: "Zaliczki przy rezerwacji", sub: "Pobierz część kwoty z góry, zanim klient przyjdzie" },
  { title: "Płatność online kartą", sub: "Klient płaci od razu w trakcie rezerwacji" },
  { title: "Mniej nieodwołanych wizyt", sub: "Zaliczka realnie ogranicza no-show" },
];

// ── Page ──────────────────────────────────────────────────────

export default async function PaymentsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getPaymentsData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const state: ConnectState = !business.stripeAccountId
    ? "NOT_CONNECTED"
    : business.stripeOnboarded
    ? "ACTIVE"
    : "PENDING";

  const feePct = PLATFORM_FEE_PERCENT.toString().replace(".", ",");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        title="Płatności"
        subtitle="Płatności online i wypłaty przez Stripe"
        actions={<GlassLink href="/business/settings" size="sm">Ustawienia</GlassLink>}
      />

      <SubscriptionCard sub={business.subscriptions[0] ?? null} />

      {state === "NOT_CONNECTED" && (
        <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
          {/* Focal intro */}
          <div className="px-6 sm:px-8 pt-9 pb-6 text-center">
            <span
              className="w-14 h-14 rounded-2xl inline-flex items-center justify-center text-slate-600"
              style={CHIP}
            >
              <CardIcon />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
              Przyjmuj płatności online
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Podłącz Stripe, żeby pobierać zaliczki i płatności kartą bezpośrednio przy rezerwacji.
            </p>
          </div>

          {/* 3-step visual */}
          <div className="px-6 sm:px-8 pb-7">
            <ConnectSteps current={0} />
          </div>

          {/* Focal CTA */}
          <div className="px-6 sm:px-8 pb-8 flex justify-center">
            <InkLink href="/business/settings" size="lg">
              Podłącz Stripe
            </InkLink>
          </div>

          {/* What unlocks — honest list */}
          <div className="px-6 sm:px-8 py-6" style={{ borderTop: HAIRLINE, background: "rgba(203,213,225,0.07)" }}>
            <Overline className="mb-4">Co odblokujesz</Overline>
            <ul className="space-y-3.5">
              {UNLOCKS.map((u) => (
                <li key={u.title} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={EMERALD_SOFT}
                  >
                    <CheckMark className="w-3 h-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{u.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{u.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[11px] text-slate-400 leading-relaxed">
              Prowizja platformy: <span className="tabular-nums font-medium text-slate-500">{feePct}%</span> od każdej płatności online. Wypłaty realizuje bezpośrednio Stripe.
            </p>
          </div>
        </GlassCard>
      )}

      {state === "PENDING" && (
        <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
          <div className="px-6 sm:px-8 pt-9 pb-6 text-center">
            <span
              className="w-14 h-14 rounded-2xl inline-flex items-center justify-center"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(217,119,6,0.28)", color: "#B45309" }}
            >
              <ClockIcon />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
              Weryfikacja w toku
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Konto Stripe zostało utworzone, ale weryfikacja nie jest jeszcze zakończona. Dokończ ją, żeby zacząć przyjmować płatności.
            </p>
            <div className="mt-6 flex justify-center">
              <InkLink href="/business/settings" size="lg">
                Dokończ weryfikację
              </InkLink>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-7" style={{ borderTop: HAIRLINE, background: "rgba(203,213,225,0.07)" }}>
            <ConnectSteps current={1} />
          </div>
        </GlassCard>
      )}

      {state === "ACTIVE" && (
        <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
          <div className="px-6 sm:px-8 pt-9 pb-7 text-center">
            <span className="w-14 h-14 rounded-2xl inline-flex items-center justify-center" style={EMERALD_SOFT}>
              <ShieldCheckIcon />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
              Płatności aktywne
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Konto Stripe jest połączone i zweryfikowane. Możesz przyjmować płatności online i zaliczki przy rezerwacji.
            </p>
            <span
              className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
              style={EMERALD_SOFT}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#059669" }} />
              Połączono ze Stripe
            </span>
          </div>

          {/* Real config facts — no transaction data yet */}
          <div className="grid grid-cols-3" style={{ borderTop: HAIRLINE }}>
            {[
              { label: "Waluta rozliczeń", value: business.currency },
              { label: "Wypłaty", value: "Co tydzień" },
              { label: "Prowizja", value: `${feePct}%` },
            ].map((m, i) => (
              <div key={m.label} className="px-4 py-4 text-center" style={i > 0 ? { borderLeft: HAIRLINE } : undefined}>
                <p className="text-[11px] text-slate-500">{m.label}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Honest note — history/payouts land here after first payment */}
          <div className="px-6 sm:px-8 py-6" style={{ borderTop: HAIRLINE, background: "rgba(203,213,225,0.07)" }}>
            <Overline className="mb-2">Historia i wypłaty</Overline>
            <p className="text-xs text-slate-500 leading-relaxed">
              Historia transakcji i wypłaty pojawią się tutaj po pierwszej płatności online. Śledzenie płatności w aplikacji jest jeszcze uruchamiane — do tego czasu pełne rozliczenia znajdziesz w panelu Stripe.
            </p>
            <div className="mt-4">
              <GlassLink href="/business/settings" size="sm">
                Ustawienia płatności
              </GlassLink>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
