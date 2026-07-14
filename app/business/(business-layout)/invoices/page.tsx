export const dynamic = "force-dynamic";

import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  PageHeader,
  GlassCard,
  CardHeader,
  StatCard,
  EmptyState,
  GlassLink,
  InkLink,
  GlassButton,
  ChromeAvatar,
  HAIRLINE,
  CHIP,
} from "@/components/ui/glass";

const ROW_LIMIT = 100;

// ── Payment status → honest pill (StatusBadge only knows appointment-status
//    keys, so payment status renders its own tinted pill). Amber is reserved
//    for stars, so "unpaid" stays neutral slate — never dressed up as urgent.
const PAYMENT_TINT: Record<string, { label: string; style: CSSProperties }> = {
  PAID: {
    label: "Opłacone",
    style: { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" },
  },
  AUTHORIZED: {
    label: "Zaliczka",
    style: { background: "rgba(203,213,225,0.25)", border: "1px solid rgba(148,163,184,0.40)", color: "#334155" },
  },
  PENDING: {
    label: "Nieopłacone",
    style: { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" },
  },
  PARTIALLY_REFUNDED: {
    label: "Częściowy zwrot",
    style: { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" },
  },
  REFUNDED: {
    label: "Zwrócone",
    style: { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" },
  },
  FAILED: {
    label: "Nieudane",
    style: { background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.22)", color: "#BE123C" },
  },
  CANCELLED: {
    label: "Anulowane",
    style: { background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.22)", color: "#BE123C" },
  },
};

function PaymentPill({ status }: { status: string }) {
  const meta = PAYMENT_TINT[status] ?? PAYMENT_TINT.PENDING;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0"
      style={meta.style}
    >
      {meta.label}
    </span>
  );
}

function initialsOf(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

async function getBillingData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) return null;

  // Totals are aggregated across ALL completed visits (accurate even when the
  // displayed list is capped at ROW_LIMIT). Rows are the most recent slice.
  const [rows, totals] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId: business.id, status: "COMPLETED" },
      include: {
        service: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: "desc" },
      take: ROW_LIMIT,
    }),
    prisma.appointment.aggregate({
      where: { businessId: business.id, status: "COMPLETED" },
      _sum: { price: true },
      _avg: { price: true },
      _count: true,
    }),
  ]);

  return { rows, totals };
}

export default async function InvoicesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const data = await getBillingData(user.id);
  if (!data) redirect("/business/onboarding");

  const { rows, totals } = data;
  const completedCount = totals._count;
  const revenue = totals._sum.price ?? 0;
  const avgValue = completedCount > 0 ? (totals._avg.price ?? 0) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Faktury"
        subtitle="Historia sprzedaży z ukończonych wizyt"
        actions={
          <GlassLink href="/business/settings" size="sm">
            Ustawienia płatności
          </GlassLink>
        }
      />

      {/* Real numbers, straight from completed appointments */}
      <div className="fade-rise fade-rise-d1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Przychód" value={formatCurrency(revenue)} sub="z ukończonych wizyt" />
        <StatCard label="Ukończone wizyty" value={completedCount} sub="rozliczalne pozycje" />
        <StatCard label="Średnia wartość" value={formatCurrency(avgValue)} sub="za wizytę" />
      </div>

      {completedCount === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
              </svg>
            }
            title="Brak ukończonych wizyt"
            body="Historia sprzedaży zbuduje się sama, gdy oznaczysz pierwszą wizytę jako ukończoną."
            action={
              <InkLink href="/business/calendar?action=new" size="sm">
                Zapisz pierwszą wizytę
              </InkLink>
            }
          />
        </GlassCard>
      ) : (
        <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
          <CardHeader
            title="Historia sprzedaży"
            action={
              <span className="text-xs text-slate-500 tabular-nums">
                {completedCount > ROW_LIMIT
                  ? `ostatnie ${rows.length} z ${completedCount}`
                  : `${rows.length} ${rows.length === 1 ? "pozycja" : "pozycji"}`}
              </span>
            }
          />
          <div>
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-3.5"
                style={i > 0 ? { borderTop: HAIRLINE } : undefined}
              >
                <span className="w-[72px] flex-shrink-0 text-xs font-medium text-slate-500 tabular-nums">
                  {formatDate(r.startTime, { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
                <ChromeAvatar
                  size="sm"
                  initials={initialsOf(r.customer.firstName, r.customer.lastName)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {r.customer.firstName} {r.customer.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{r.service.name}</p>
                </div>
                <PaymentPill status={r.paymentStatus} />
                <p className="w-24 flex-shrink-0 text-right text-sm font-bold text-slate-900 tabular-nums">
                  {formatCurrency(r.price)}
                </p>
                <GlassButton
                  size="sm"
                  disabled
                  title="Wystawianie faktur wymaga podłączenia Stripe oraz danych podatkowych firmy (NIP)."
                  className="flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Wystaw fakturę
                </GlassButton>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Honest limits — no numbering, no PDF, no VAT yet */}
      <div
        className="fade-rise fade-rise-d3 flex items-start gap-2.5 rounded-2xl px-4 py-3"
        style={CHIP}
      >
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <p className={cn("text-xs leading-relaxed text-slate-500")}>
          Formalne faktury VAT z numeracją i PDF wymagają podłączenia Stripe oraz danych
          podatkowych firmy (plan Salon Pro). Powyższa lista to historia sprzedaży z ukończonych
          wizyt — nie są to wystawione faktury.
        </p>
      </div>
    </div>
  );
}
