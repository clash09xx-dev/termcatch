"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, getInitials, formatRelativeTime, formatDate } from "@/lib/utils";
import type { CustomerSummary } from "./page";
import {
  PageHeader, GlassCard, EmptyState, StatusBadge, ChromeAvatar, InkLink, GlassLink,
  Overline, SplitShell, DetailEmpty, Timeline, TimelineRow, HAIRLINE, CHIP, STATUS_TINT, type StatusKey,
} from "@/components/ui/glass";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

const DAY = 86400_000;

function displayContact(c: { email: string; phone: string | null }): string {
  if (c.email.endsWith("@termcatch.local")) return c.phone ?? "dodano ręcznie";
  return c.phone ?? c.email;
}
function ageDays(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}
function freshness(c: CustomerSummary): { color: string; label: string } {
  const a = ageDays(c.lastVisit);
  if (a === null) return { color: "#CBD5E1", label: "—" };
  if (a <= 30) return { color: "#059669", label: "aktywny" };
  if (a <= 60) return { color: "#D97706", label: "stygnie" };
  return { color: "#94A3B8", label: "uśpiony" };
}
type Segment = "all" | "new" | "returning" | "dormant";
function segmentOf(c: CustomerSummary): Segment[] {
  const segs: Segment[] = ["all"];
  const a = ageDays(c.lastVisit);
  if (c.totalAppointments === 1) segs.push("new");
  if (c.completedCount >= 2 && (a === null || a <= 60)) segs.push("returning");
  if (a !== null && a > 60 && c.completedCount >= 1) segs.push("dormant");
  return segs;
}

export function CrmClient({ customers }: { customers: CustomerSummary[] }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [segment, setSegment] = useState<Segment>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: customers.length, new: 0, returning: 0, dormant: 0 };
    for (const cust of customers) {
      const s = segmentOf(cust);
      if (s.includes("new")) c.new++;
      if (s.includes("returning")) c.returning++;
      if (s.includes("dormant")) c.dormant++;
    }
    return c;
  }, [customers]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (!segmentOf(c).includes(segment)) return false;
      if (!q) return true;
      return (`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? "").includes(q));
    });
  }, [customers, search, segment]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Klienci"
        subtitle={<span className="tabular-nums">{customers.length} {customers.length === 1 ? "klient" : "w bazie"}</span>}
      />

      {/* Controls */}
      <div className="fade-rise fade-rise-d1 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj klienta…" aria-label="Szukaj klienta" className="input-glass w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800" />
        </div>
        <Segmented
          ariaLabel="Segment klientów" idBase="crm-seg" size="sm" value={segment} onChange={(v) => setSegment(v as Segment)}
          options={[
            { value: "all", label: "Wszyscy", count: counts.all },
            { value: "returning", label: "Wracający", count: counts.returning },
            { value: "new", label: "Nowi", count: counts.new },
            { value: "dormant", label: "Uśpieni", count: counts.dormant },
          ]}
        />
      </div>

      {customers.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2">
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
            title="Brak klientów"
            body="Klienci pojawią się tu po pierwszej rezerwacji — online albo dodanej ręcznie."
            action={<InkLink href="/business/calendar?action=new" size="sm">Zapisz pierwszego klienta</InkLink>}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d2">
          <SplitShell
            detailOpen={selected !== null}
            list={
              <GlassCard className="overflow-hidden">
                {list.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">Brak klientów w tym segmencie.</p>
                ) : (
                  <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
                    {list.map((c, i) => {
                      const f = freshness(c);
                      const active = c.id === selectedId;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors", active ? "" : "row-hover")}
                          style={{ ...(i > 0 ? { borderTop: HAIRLINE } : {}), ...(active ? { background: "rgba(203,213,225,0.28)" } : {}) }}
                        >
                          <span className="relative flex-shrink-0">
                            <ChromeAvatar initials={getInitials(c.firstName, c.lastName)} />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: f.color }} title={f.label} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-500 truncate tabular-nums">{c.totalAppointments} {c.totalAppointments === 1 ? "wizyta" : "wizyt"}{c.lastVisit && ` · ${formatRelativeTime(new Date(c.lastVisit))}`}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">{formatCurrency(c.totalSpent)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            }
            detail={
              selected ? (
                <ClientProfile customer={selected} onBack={() => setSelectedId(null)} />
              ) : (
                <DetailEmpty
                  icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>}
                  title="Wybierz klienta"
                  body="Kliknij osobę z listy, aby zobaczyć historię wizyt, wartość i sugestię kolejnego kroku."
                />
              )
            }
          />
        </div>
      )}
    </div>
  );
}

function ClientProfile({ customer: c, onBack }: { customer: CustomerSummary; onBack: () => void }) {
  const a = ageDays(c.lastVisit);
  const dormant = a !== null && a > 60 && c.completedCount >= 1;

  // Honest, history-based next step (never a prediction)
  let suggestion: { text: string; strong?: string } | null = null;
  if (dormant) {
    suggestion = { text: c.cadenceDays ? `Nie było od ${formatRelativeTime(new Date(c.lastVisit!))} — zwykle wraca co ~${c.cadenceDays} dni.` : `Nie było od ${formatRelativeTime(new Date(c.lastVisit!))}.`, strong: "Dobry moment na zaproszenie z powrotem." };
  } else if (c.upcomingCount > 0) {
    suggestion = { text: `Ma ${c.upcomingCount} ${c.upcomingCount === 1 ? "nadchodzącą wizytę" : "nadchodzące wizyty"}.` };
  } else if (c.totalAppointments === 1) {
    suggestion = { text: "Nowy klient — jedna wizyta.", strong: "Zadbaj o powrót." };
  } else if (c.cadenceDays) {
    suggestion = { text: `Bywa regularnie, co ~${c.cadenceDays} dni.` };
  }

  return (
    <GlassCard className="overflow-hidden">
      {/* Header */}
      <div className="p-5" style={{ borderBottom: HAIRLINE }}>
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="lg:hidden icon-btn p-2 -ml-2 rounded-lg flex-shrink-0" style={{ color: "#94A3B8" }} aria-label="Wróć do listy">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <ChromeAvatar size="lg" initials={getInitials(c.firstName, c.lastName)} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900" style={{ letterSpacing: "-0.01em" }}>{c.firstName} {c.lastName}</h2>
            <p className="text-sm text-slate-500 truncate">{displayContact(c)}</p>
          </div>
          <InkLink href="/business/calendar?action=new" size="sm" className="flex-shrink-0">Umów</InkLink>
        </div>
        {/* Stat chips */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="Wizyty" value={c.completedCount} sub={`${c.totalAppointments} łącznie`} />
          <Stat label="Wartość" value={formatCurrency(c.totalSpent)} />
          <Stat label="No-show" value={c.noShowCount} tone={c.noShowCount > 0 ? "warn" : undefined} />
        </div>
      </div>

      {/* Suggestion */}
      {suggestion && (
        <div className="px-5 py-4" style={{ borderBottom: HAIRLINE }}>
          <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: dormant ? "rgba(251,191,36,0.1)" : "rgba(203,213,225,0.18)", border: `1px solid ${dormant ? "rgba(217,119,6,0.25)" : "rgba(203,213,225,0.5)"}` }}>
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={dormant ? "#B45309" : "#64748B"} strokeWidth={1.8}><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /></svg>
            <p className="text-[13px] leading-relaxed text-slate-600">
              {suggestion.text}{suggestion.strong && <span className="font-semibold text-slate-800"> {suggestion.strong}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Visit history */}
      <div className="p-5">
        <Overline className="mb-3">Historia wizyt</Overline>
        {c.appointments.length === 0 ? (
          <p className="text-sm text-slate-500">Brak wizyt.</p>
        ) : (
          <Timeline>
            {c.appointments.map((v, i) => {
              const rail = STATUS_TINT[v.status as StatusKey]?.rail ?? "#94A3B8";
              return (
                <TimelineRow key={v.id} time={formatDate(new Date(v.startTime), { day: "numeric", month: "short" })} sub={new Date(v.startTime).getFullYear() !== new Date().getFullYear() ? String(new Date(v.startTime).getFullYear()) : undefined} dotColor={rail} connector={i < c.appointments.length - 1}>
                  <div className="flex items-center justify-between gap-3 pb-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.service.name}</p>
                      <StatusBadge status={v.status} className="mt-1" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">{formatCurrency(v.price)}</span>
                  </div>
                </TimelineRow>
              );
            })}
          </Timeline>
        )}
      </div>
    </GlassCard>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl p-3" style={CHIP}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums mt-0.5", tone === "warn" ? "text-amber-700" : "text-slate-900")}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 tabular-nums">{sub}</p>}
    </div>
  );
}
