import Link from "next/link";
import { formatCurrency, formatDate, formatDuration, cn } from "@/lib/utils";
import { PageHeader, GlassCard, EmptyState, Overline } from "@/components/ui/glass";

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

const FILTERS = [
  { key: "all", label: "Wszystkie" },
  { key: "completed", label: "Zakończone" },
  { key: "cancelled", label: "Anulowane" },
  { key: "noshow", label: "Nieobecność" },
] as const;

const STATUS_TINT: Record<string, { label: string; bg: string; fg: string }> = {
  COMPLETED: { label: "Zakończona", bg: "rgba(16,185,129,0.12)", fg: "#047857" },
  CANCELLED_CUSTOMER: { label: "Anulowana (klient)", bg: "rgba(148,163,184,0.18)", fg: "#475569" },
  CANCELLED_BUSINESS: { label: "Anulowana (salon)", bg: "rgba(148,163,184,0.18)", fg: "#475569" },
  NO_SHOW: { label: "Nieobecność", bg: "rgba(244,63,94,0.10)", fg: "#BE123C" },
};

const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

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
}: {
  rows: Row[];
  filter: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader title="Historia" subtitle="Zakończone, anulowane i nieodbyte wizyty" />

      {/* Filters — URL-driven (server-side filtered + paginated) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtruj historię">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={href(f.key, 1)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors border",
                active ? "text-white border-transparent" : "text-slate-600 border-slate-200 hover:text-slate-900"
              )}
              style={active ? { background: INK } : { background: "rgba(255,255,255,0.70)" }}
            >
              {f.label}
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
          title="Brak wizyt w tej kategorii"
          body="Zakończone i anulowane wizyty pojawią się tutaj."
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="divide-y" style={{ borderColor: "rgba(203,213,225,0.35)" }}>
            {rows.map((r) => {
              const tint = STATUS_TINT[r.status] ?? { label: r.status, bg: "rgba(148,163,184,0.18)", fg: "#475569" };
              const d = new Date(r.startTime);
              return (
                <div key={r.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {r.customer} · {r.service}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {formatDate(d, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      {d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" })} ·{" "}
                      {formatDuration(r.duration)}
                      {r.employee ? ` · ${r.employee}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: tint.bg, color: tint.fg }}>
                    {tint.label}
                  </span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0 w-20 text-right">
                    {formatCurrency(r.price)}
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
              Poprzednia
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm text-slate-300">Poprzednia</span>
          )}
          <span className="text-sm text-slate-500 tabular-nums">Strona {page} z {totalPages}</span>
          {page < totalPages ? (
            <Link href={href(filter, page + 1)} className="px-4 py-2 text-sm font-semibold rounded-xl text-white" style={{ background: INK }}>
              Następna
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm text-slate-300">Następna</span>
          )}
        </div>
      )}

      <Overline className="block text-center">{total} {total === 1 ? "wizyta" : "wizyt"} w historii</Overline>
    </div>
  );
}
