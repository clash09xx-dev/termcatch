export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { billingConfigured } from "@/lib/subscription";
import { planKeyFromEnum, PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import { SubscribeButtons } from "@/components/business/subscribe-buttons";
import { BillingManageButton } from "@/components/business/billing-manage-button";
import { PageHeader, GlassCard, Overline, HAIRLINE } from "@/components/ui/glass";

// NOTE: Stripe Connect (online card payments / deposits at booking / payouts) is
// NOT built yet, so this page intentionally shows ONLY the real SaaS
// subscription billing — no "connect Stripe" CTAs or deposit promises that would
// advertise unbuilt functionality. Invoicing lives in /business/invoices and is
// being prepared for a Fakturownia integration.

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
function SubscriptionCard({ sub, usage }: { sub: SubRow; usage: Usage }) {
  const active = Boolean(sub?.stripeSubscriptionId);
  const planLabel = sub ? PLAN_ENTITLEMENTS[planKeyFromEnum(sub.plan as never)].label : null;
  const pastDue = sub?.status === "PAST_DUE";
  const cancelled = sub?.status === "CANCELLED";
  return (
    <GlassCard className="p-5 fade-rise fade-rise-d1">
      <Overline>Subskrypcja TermCatch</Overline>
      {active && sub ? (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">
              Plan {planLabel} · {SUB_STATUS_LABEL[sub.status] ?? sub.status}
            </p>
            {usage.welcome && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={EMERALD_SOFT}>
                WELCOME · 3 miesiące gratis
              </span>
            )}
          </div>
          {sub.status === "TRIALING" && sub.trialEndsAt && (
            <p className="text-sm text-slate-600 mt-1">Okres próbny trwa do {fmtDate(sub.trialEndsAt)}.</p>
          )}
          {sub.status !== "TRIALING" && !pastDue && !cancelled && sub.currentPeriodEnd && (
            <p className="text-sm text-slate-600 mt-1">
              {sub.cancelAtPeriodEnd ? "Subskrypcja zakończy się" : "Kolejne odnowienie"}: {fmtDate(sub.currentPeriodEnd)}.
            </p>
          )}
          {pastDue && (
            <p className="text-sm mt-1" style={{ color: "#B45309" }}>
              Zaległa płatność — zaktualizuj metodę płatności w panelu, aby zachować dostęp. Twoje dane są bezpieczne, nic nie usunęliśmy.
            </p>
          )}
          {cancelled && (
            <p className="text-sm mt-1" style={{ color: "#B45309" }}>
              Subskrypcja została anulowana. Wznów ją w panelu, aby odzyskać pełny dostęp — Twoje dane są bezpieczne.
            </p>
          )}

          {/* Usage against the current plan's limits */}
          <div className="mt-3 pt-3" style={{ borderTop: HAIRLINE }}>
            <UsageRow label="Specjaliści" used={usage.employees} limit={usage.employeeLimit} />
            <UsageRow label="Lokalizacje" used={usage.locations} limit={usage.locationLimit} />
          </div>

          <div className="mt-3">
            {/* Portal handles upgrade, downgrade, payment method + cancellation. */}
            <BillingManageButton />
          </div>
        </div>
      ) : billingConfigured() ? (
        <div className="mt-2">
          <p className="text-sm text-slate-600 mb-3">
            Rozpocznij subskrypcję z 7-dniowym okresem próbnym — bez opłat na start.
          </p>
          <div className="mb-3 pb-3" style={{ borderBottom: HAIRLINE }}>
            <UsageRow label="Specjaliści" used={usage.employees} limit={usage.employeeLimit} />
            <UsageRow label="Lokalizacje" used={usage.locations} limit={usage.locationLimit} />
          </div>
          <SubscribeButtons />
        </div>
      ) : (
        <p className="text-sm text-slate-500 mt-2">
          Płatności są jeszcze konfigurowane. 7 dni za darmo na start, gdy tylko je uruchomimy.
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
      <PageHeader title="Płatności" subtitle="Twoja subskrypcja TermCatch" />

      <SubscriptionCard sub={sub} usage={usage} />

      {/* Honest forward-looking note — NOT a promise that it already works. */}
      <GlassCard className="p-5 fade-rise fade-rise-d2">
        <Overline>Wkrótce</Overline>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Płatności online kartą i zaliczki przy rezerwacji przygotowujemy na kolejny etap. Damy znać, gdy będą gotowe — na razie rozliczenia z klientami prowadzisz na miejscu.
        </p>
      </GlassCard>
    </div>
  );
}
