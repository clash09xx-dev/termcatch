import Link from "next/link";
import { formatDuration, cn } from "@/lib/utils";
import { PageHeader, GlassCard, EmptyState, Overline } from "@/components/ui/glass";
import { formatCurrency as fmtMoney, formatDate as fmtDate, intlLocale } from "@/lib/i18n/format";
import { interpolate } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

type Row = {
  id: string;
  status: string;
  startTime: string;
  price: number;
  duration: number;
  customer: string;
  service: string;
  employee: string | null;
};

const FILTER_KEYS = ["all", "completed", "cancelled", "noshow"] as const;

const STATUS_TINT: Record<string, { bg: string; fg: string }> = {
  COMPLETED: { bg: "rgba(16,185,129,0.12)", fg: "#047857" },
  CANCELLED_CUSTOMER: { bg: "rgba(148,163,184,0.18)", fg: "#475569" },
  CANCELLED_BUSINESS: { bg: "rgba(148,163,184,0.18)", fg: "#475569" },
  NO_SHOW: { bg: "rgba(244,63,94,0.10)", fg: "#BE123C" },
};

const INK = "var(--ink-raised)";

function href(filter: string, page: number): string {
  const p = new URLSearchParams();
  if (filter !== "all") p.set("filter", filter);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return `/business/history${qs ? `?${qs}` : ""}`;
}

export function HistoryClient({
  rows,
  filter,
  page,
  totalPages,
  total,
  t,
  locale,
}: {
  rows: Row[];
  filter: string;
  page: number;
  totalPages: number;
  total: number;
  t: Dictionary["pages"]["history"];
  locale: Locale;
}) {
  const FILTER_LABEL: Record<(typeof FILTER_KEYS)[number], string> = {
    all: t.fAll, completed: t.fCompleted, cancelled: t.fCancelled, noshow: t.fNoShow,
  };
  const STATUS_LABEL: Record<string, string> = {
    COMPLETED: t.stCompleted,
    CANCELLED_CUSTOMER: t.stCancelledCustomer,
    CANCELLED_BUSINESS: t.stCancelledBusiness,
    NO_SHOW: t.stNoShow,
  };
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {/* Filters — URL-driven (server-side filtered + paginated) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.filterAria}>
        {FILTER_KEYS.map((key) => {
          const active = filter === key;
          return (
            <Link
              key={key}
              href={href(key, 1)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors border",
                active ? "text-white border-transparent" : "text-slate-600 border-slate-200 hover:text-slate-900"
              )}
              style={active ? { background: INK } : { background: "var(--surface)" }}
            >
              {FILTER_LABEL[key]}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={28} height={28} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7.5v5l3 2" />
            </svg>
          }
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="divide-y" style={{ borderColor: "rgba(203,213,225,0.35)" }}>
            {rows.map((r) => {
              const tint = STATUS_TINT[r.status] ?? { bg: "rgba(148,163,184,0.18)", fg: "#475569" };
              const d = new Date(r.startTime);
              return (
                <div key={r.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {r.customer} · {r.service}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {fmtDate(d, locale, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      {new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Warsaw" }).format(d)} ·{" "}
                      {formatDuration(r.duration)}
                      {r.employee ? ` · ${r.employee}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: tint.bg, color: tint.fg }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0 w-20 text-right">
                    {fmtMoney(r.price, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={href(filter, page - 1)} className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900">
              {t.prev}
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm text-slate-300">{t.prev}</span>
          )}
          <span className="text-sm text-slate-500 tabular-nums">{interpolate(t.pageOf, { page, total: totalPages })}</span>
          {page < totalPages ? (
            <Link href={href(filter, page + 1)} className="px-4 py-2 text-sm font-semibold rounded-xl text-white" style={{ background: INK }}>
              {t.next}
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm text-slate-300">{t.next}</span>
          )}
        </div>
      )}

      <Overline className="block text-center">{interpolate(total === 1 ? t.totalOne : t.totalMany, { n: total })}</Overline>
    </div>
  );
}
