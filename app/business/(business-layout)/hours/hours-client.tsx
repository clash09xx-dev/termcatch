"use client";

import { useState, useMemo, useTransition } from "react";
import { updateWorkingHours } from "@/lib/actions/business";
import type { DayOfWeek } from "@prisma/client";
import { PageHeader, GlassCard, InkButton, GlassButton, CHIP, HAIRLINE, INK_GRADIENT } from "@/components/ui/glass";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/motion";

type DayHours = { dayOfWeek: DayOfWeek; isOpen: boolean; openTime: string; closeTime: string };
type Props = { initialHours: DayHours[] };

const ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const FULL: Record<DayOfWeek, string> = { MONDAY: "Poniedziałek", TUESDAY: "Wtorek", WEDNESDAY: "Środa", THURSDAY: "Czwartek", FRIDAY: "Piątek", SATURDAY: "Sobota", SUNDAY: "Niedziela" };
const SHORT: Record<DayOfWeek, string> = { MONDAY: "pon", TUESDAY: "wt", WEDNESDAY: "śr", THURSDAY: "czw", FRIDAY: "pt", SATURDAY: "sob", SUNDAY: "ndz" };

const TIMES: string[] = [];
for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

function dur(open: string, close: string): string {
  const [oh, om] = open.split(":").map(Number), [ch, cm] = close.split(":").map(Number);
  const d = (ch * 60 + cm) - (oh * 60 + om);
  if (d <= 0) return "0 h";
  return `${Math.floor(d / 60)}${d % 60 ? `:${String(d % 60).padStart(2, "0")}` : ""} h`;
}

// Group consecutive same-hours days into a human summary
function summarize(hours: DayHours[]): string {
  const sorted = ORDER.map((d) => hours.find((h) => h.dayOfWeek === d)).filter(Boolean) as DayHours[];
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    const cur = sorted[i];
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].isOpen === cur.isOpen && sorted[j + 1].openTime === cur.openTime && sorted[j + 1].closeTime === cur.closeTime) j++;
    const range = i === j ? SHORT[cur.dayOfWeek] : `${SHORT[cur.dayOfWeek]}–${SHORT[sorted[j].dayOfWeek]}`;
    parts.push(cur.isOpen ? `${range} ${cur.openTime}–${cur.closeTime}` : `${range} nieczynne`);
    i = j + 1;
  }
  return parts.join(" · ");
}

export function HoursClient({ initialHours }: Props) {
  const ordered = useMemo(() => ORDER.map((d) => initialHours.find((h) => h.dayOfWeek === d) ?? { dayOfWeek: d, isOpen: false, openTime: "09:00", closeTime: "18:00" }), [initialHours]);
  const [hours, setHours] = useState<DayHours[]>(ordered);
  const [isPending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const reduce = useReducedMotion();

  const dirty = useMemo(() => JSON.stringify(hours) !== JSON.stringify(ordered), [hours, ordered]);

  const upd = (d: DayOfWeek, patch: Partial<DayHours>) => setHours((prev) => prev.map((h) => h.dayOfWeek === d ? { ...h, ...patch } : h));
  function copyToAll() {
    const src = hours.find((h) => h.isOpen);
    if (!src) return;
    setHours((prev) => prev.map((h) => h.dayOfWeek === "SUNDAY" ? h : { ...h, isOpen: true, openTime: src.openTime, closeTime: src.closeTime }));
  }
  function save() { start(async () => { await updateWorkingHours(hours); setSaved(true); setTimeout(() => setSaved(false), 2000); }); }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      <PageHeader
        title="Godziny"
        subtitle="Ustaw rytm tygodnia — klienci rezerwują tylko w godzinach otwarcia"
        actions={<GlassButton size="sm" onClick={copyToAll}>Kopiuj pon→sob</GlassButton>}
      />

      {/* Customer-facing summary */}
      <div className="fade-rise fade-rise-d1 rounded-2xl px-4 py-3 flex items-start gap-3" style={CHIP}>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
        <p className="text-[13px] text-slate-600 leading-relaxed"><span className="font-semibold text-slate-800">Klienci zobaczą:</span> {summarize(hours)}</p>
      </div>

      {/* Week as day cards */}
      <div className="fade-rise fade-rise-d2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {hours.map((h) => (
          <div key={h.dayOfWeek} className={cn("rounded-2xl p-4 transition-opacity", !h.isOpen && "opacity-70")} style={{ background: h.isOpen ? "rgba(255,255,255,0.8)" : "rgba(203,213,225,0.12)", border: "1px solid rgba(203,213,225,0.45)", boxShadow: h.isOpen ? "inset 0 1px 0 rgba(255,255,255,0.9)" : "none" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">{FULL[h.dayOfWeek]}</span>
              <button type="button" role="switch" aria-checked={h.isOpen} aria-label={`${FULL[h.dayOfWeek]} — ${h.isOpen ? "otwarte" : "zamknięte"}`} onClick={() => upd(h.dayOfWeek, { isOpen: !h.isOpen })} className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0" style={{ background: h.isOpen ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
                <span className={cn("inline-block h-3.5 w-3.5 mx-0.5 rounded-full bg-white shadow transition-transform", h.isOpen ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
            {h.isOpen ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <select value={h.openTime} onChange={(e) => upd(h.dayOfWeek, { openTime: e.target.value })} aria-label="Otwarcie" className="input-glass flex-1 rounded-lg px-2 py-1.5 text-sm outline-none text-slate-800 tabular-nums">{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  <span className="text-slate-400 text-xs">–</span>
                  <select value={h.closeTime} onChange={(e) => upd(h.dayOfWeek, { closeTime: e.target.value })} aria-label="Zamknięcie" className="input-glass flex-1 rounded-lg px-2 py-1.5 text-sm outline-none text-slate-800 tabular-nums">{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                </div>
                <p className="text-[11px] text-slate-400 tabular-nums text-center">{dur(h.openTime, h.closeTime)} otwarte</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic py-2">Nieczynne</p>
            )}
          </div>
        ))}
      </div>

      {/* Sticky dirty-state save bar */}
      <AnimatePresence>
        {(dirty || saved) && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            className="fixed bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pl-5 pr-2 py-2 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(24px) saturate(200%)", WebkitBackdropFilter: "blur(24px) saturate(200%)", border: "1px solid rgba(203,213,225,0.5)", boxShadow: "0 8px 32px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.95)" }}
          >
            <span className="text-[13px] font-medium text-slate-700">{saved ? "Zapisano zmiany ✓" : "Masz niezapisane zmiany"}</span>
            {!saved && <InkButton size="sm" onClick={save} disabled={isPending}>{isPending ? "Zapisywanie…" : "Zapisz"}</InkButton>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
