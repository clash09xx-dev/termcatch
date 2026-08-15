export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { billingConfigured } from "@/lib/subscription";
import { planKeyFromEnum, PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import { SubscribeButtons } from "@/components/business/subscribe-buttons";
import { BillingManageButton } from "@/components/business/billing-manage-button";
import { PageHeader, GlassCard, Overline, HAIRLINE } from "@/components/ui/glass";
import { getServerI18n } from "@/lib/i18n/server";
import { formatDate as fmtDate } from "@/lib/i18n/format";
import { interpolate } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

// NOTE: Stripe Connect (online card payments / deposits at booking / payouts) is
// NOT built yet, so this page intentionally shows ONLY the real SaaS
// subscription billing — no "connect Stripe" CTAs or deposit promises that would
// advertise unbuilt functionality. Invoicing lives in /business/invoices and is
// being prepared for a Fakturownia integration.

type PayT = Dictionary["pages"]["payments"];
const subStatusLabel = (T: PayT, status: string): string =>
  ({ TRIALING: T.statusTRIALING, ACTIVE: T.statusACTIVE, PAST_DUE: T.statusPAST_DUE, CANCELLED: T.statusCANCELLED, PAUSED: T.statusPAUSED } as Record<string, string>)[status] ?? status;

const dateOrEmpty = (d: Date | null, locale: Locale): string => (d ? fmtDate(d, locale) : "");

const EMERALD_SOFT = {
  background: "rgba(16,185,129,0.12)",
  border: "1px solid rgba(16,185,129,0.30)",
  color: "#047857",
};

type SubRow = {
  status: string;
  plan: string;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
} | null;

type Usage = {
  employees: number;
  employeeLimit: number | null; // null = unlimited
  locations: number;
  locationLimit: number | null;
  /** WELCOME promo redeemed for this business (3 months free), when present. */
  welcome: boolean;
};

const limitText = (limit: number | null) => (limit === null ? "∞" : String(limit));

/** One usage-vs-limit meter (e.g. "Specjaliści 3 / 4"). Over-limit is flagged amber. */
function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const over = limit !== null && used > limit;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: over ? "#B45309" : "#0F172A" }}>
        {used} / {limitText(limit)}
      </span>
    </div>
  );
}

// Real subscription/trial status from synced Stripe data — never a hardcoded "7 dni".
// When access has expired (cancelled/past-due) we show a billing-required state
// but NEVER touch the salon's data. Only display-safe values reach the browser —
// no Stripe secret ids (the subscription id is used server-side as a boolean only).
function SubscriptionCard({ sub, usage, T, locale, plans }: { sub: SubRow; usage: Usage; T: PayT; locale: Locale; plans: Dictionary["plans"] }) {
  const active = Boolean(sub?.stripeSubscriptionId);
  const planLabel = sub ? plans[planKeyFromEnum(sub.plan as never)] : null;
  const pastDue = sub?.status === "PAST_DUE";
  const cancelled = sub?.status === "CANCELLED";
  return (
    <GlassCard className="p-5 fade-rise fade-rise-d1">
      <Overline>{T.subscription}</Overline>
      {active && sub ? (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">
              {T.planPrefix} {planLabel} · {subStatusLabel(T, sub.status)}
            </p>
            {usage.welcome && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={EMERALD_SOFT}>
                {T.welcomeBadge}
              </span>
            )}
          </div>
          {sub.status === "TRIALING" && sub.trialEndsAt && (
            <p className="text-sm text-slate-600 mt-1">{interpolate(T.trialUntil, { date: dateOrEmpty(sub.trialEndsAt, locale) })}</p>
          )}
          {sub.status !== "TRIALING" && !pastDue && !cancelled && sub.currentPeriodEnd && (
            <p className="text-sm text-slate-600 mt-1">
              {interpolate(sub.cancelAtPeriodEnd ? T.endsOn : T.renewsOn, { date: dateOrEmpty(sub.currentPeriodEnd, locale) })}
            </p>
          )}
          {pastDue && (
            <p className="text-sm mt-1" style={{ color: "#B45309" }}>
              {T.pastDueBody}
            </p>
          )}
          {cancelled && (
            <p className="text-sm mt-1" style={{ color: "#B45309" }}>
              {T.cancelledBody}
            </p>
          )}

          {/* Usage against the current plan's limits */}
          <div className="mt-3 pt-3" style={{ borderTop: HAIRLINE }}>
            <UsageRow label={T.usageEmployees} used={usage.employees} limit={usage.employeeLimit} />
            <UsageRow label={T.usageLocations} used={usage.locations} limit={usage.locationLimit} />
          </div>

          <div className="mt-3">
            {/* Portal handles upgrade, downgrade, payment method + cancellation. */}
            <BillingManageButton label={T.manage} opening={T.opening} unconfigured={T.unconfigured} />
          </div>
        </div>
      ) : billingConfigured() ? (
        <div className="mt-2">
          <p className="text-sm text-slate-600 mb-3">
            {T.startBody}
          </p>
          <div className="mb-3 pb-3" style={{ borderBottom: HAIRLINE }}>
            <UsageRow label={T.usageEmployees} used={usage.employees} limit={usage.employeeLimit} />
            <UsageRow label={T.usageLocations} used={usage.locations} limit={usage.locationLimit} />
          </div>
          <SubscribeButtons plans={plans} note={T.trialNote} />
        </div>
      ) : (
        <p className="text-sm text-slate-500 mt-2">
          {T.notReady}
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
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              status: true,
              plan: true,
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

// ── Page ──────────────────────────────────────────────────────

export default async function PaymentsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { locale, dict } = await getServerI18n();
  const T = dict.pages.payments;
  const dbUser = await getPaymentsData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  // Live usage against the effective plan (the subscription's plan when active,
  // else the conservative FREE baseline). Single-location salons have no Location
  // rows yet, so they count as one location (the main branch).
  const sub = business.subscriptions[0] ?? null;
  const planKey = planKeyFromEnum((sub?.plan ?? null) as never);
  const planLimits = PLAN_ENTITLEMENTS[planKey];
  const [activeEmployees, activeLocations, welcomeRedemption] = await Promise.all([
    prisma.employee.count({ where: { businessId: business.id, isActive: true } }),
    prisma.location.count({ where: { businessId: business.id, isActive: true } }),
    prisma.promoRedemption.findFirst({ where: { businessId: business.id, status: "REDEEMED" }, select: { id: true } }),
  ]);
  const usage: Usage = {
    employees: activeEmployees,
    employeeLimit: planLimits.maxEmployees,
    locations: Math.max(1, activeLocations),
    locationLimit: planLimits.maxLocations,
    welcome: Boolean(welcomeRedemption) && (sub?.status === "ACTIVE" || sub?.status === "TRIALING"),
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader title={T.title} subtitle={T.subtitle} />

      <SubscriptionCard sub={sub} usage={usage} T={T} locale={locale} plans={dict.plans} />

      {/* Honest forward-looking note — NOT a promise that it already works. */}
      <GlassCard className="p-5 fade-rise fade-rise-d2">
        <Overline>{T.soon}</Overline>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{T.soonBody}</p>
      </GlassCard>
    </div>
  );
}
