"use client";

import { useState, useMemo, useTransition } from "react";
import { updateWorkingHours } from "@/lib/actions/business";
import type { DayOfWeek } from "@prisma/client";
import { PageHeader, GlassCard, InkButton, GlassButton, CHIP, HAIRLINE, INK_GRADIENT } from "@/components/ui/glass";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/motion";
import { useT } from "@/components/i18n/i18n-provider";

type DayHours = { dayOfWeek: DayOfWeek; isOpen: boolean; openTime: string; closeTime: string };
type Props = { initialHours: DayHours[] };

const ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
// Weekday labels come from the dictionary (t.weekdays.*) so the whole page body
// follows the selected language — never hardcoded Polish.
type DayLabels = Record<DayOfWeek, string>;

// 24-hour clock, half-hour steps. Values are fixed "HH:MM" strings, so the times
// render identically ("09:00", "18:00") regardless of the browser's locale —
// never a 12-hour AM/PM rendering.
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

const toMin = (t: string): number => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
/** A day is only valid when closing strictly after opening (no zero/negative spans). */
const dayInvalid = (h: DayHours): boolean => h.isOpen && toMin(h.closeTime) <= toMin(h.openTime);

function dur(open: string, close: string): string {
  const d = toMin(close) - toMin(open);
  if (d <= 0) return "0 h";
  return `${Math.floor(d / 60)}${d % 60 ? `:${String(d % 60).padStart(2, "0")}` : ""} h`;
}

// Group consecutive same-hours days into a human summary (labels localized).
function summarize(hours: DayHours[], short: DayLabels, closedShort: string): string {
  const sorted = ORDER.map((d) => hours.find((h) => h.dayOfWeek === d)).filter(Boolean) as DayHours[];
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    const cur = sorted[i];
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].isOpen === cur.isOpen && sorted[j + 1].openTime === cur.openTime && sorted[j + 1].closeTime === cur.closeTime) j++;
    const range = i === j ? short[cur.dayOfWeek] : `${short[cur.dayOfWeek]}–${short[sorted[j].dayOfWeek]}`;
    parts.push(cur.isOpen ? `${range} ${cur.openTime}–${cur.closeTime}` : `${range} ${closedShort}`);
    i = j + 1;
  }
  return parts.join(" · ");
}

export function HoursClient({ initialHours }: Props) {
  const t = useT();
  const T = t.pages.hours;
  const FULL = t.weekdays.full;
  const SHORT = t.weekdays.short;
  const ordered = useMemo(() => ORDER.map((d) => initialHours.find((h) => h.dayOfWeek === d) ?? { dayOfWeek: d, isOpen: false, openTime: "09:00", closeTime: "18:00" }), [initialHours]);
  const [hours, setHours] = useState<DayHours[]>(ordered);
  const [isPending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const reduce = useReducedMotion();

  const dirty = useMemo(() => JSON.stringify(hours) !== JSON.stringify(ordered), [hours, ordered]);
  const hasInvalid = useMemo(() => hours.some(dayInvalid), [hours]);

  const upd = (d: DayOfWeek, patch: Partial<DayHours>) => setHours((prev) => prev.map((h) => h.dayOfWeek === d ? { ...h, ...patch } : h));
  // Changing the opening time keeps the range valid: if it lands at/after the
  // current closing time, nudge closing to the next half-hour slot (never leaves
  // an impossible end-before-start range on screen).
  const setOpenTime = (d: DayOfWeek, openTime: string) => setHours((prev) => prev.map((h) => {
    if (h.dayOfWeek !== d) return h;
    let closeTime = h.closeTime;
    if (toMin(closeTime) <= toMin(openTime)) {
      const next = TIMES.find((t) => toMin(t) > toMin(openTime));
      closeTime = next ?? h.closeTime;
    }
    return { ...h, openTime, closeTime };
  }));
  function copyToAll() {
    const src = hours.find((h) => h.isOpen);
    if (!src) return;
    setHours((prev) => prev.map((h) => h.dayOfWeek === "SUNDAY" ? h : { ...h, isOpen: true, openTime: src.openTime, closeTime: src.closeTime }));
  }
  function save() {
    if (hasInvalid) return; // guard: never persist an end-before-start range
    start(async () => { await updateWorkingHours(hours); setSaved(true); setTimeout(() => setSaved(false), 2000); });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={<GlassButton size="sm" onClick={copyToAll}>{T.copyToAll}</GlassButton>}
      />

      {/* Customer-facing summary */}
      <div className="fade-rise fade-rise-d1 rounded-2xl px-4 py-3 flex items-start gap-3" style={CHIP}>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
        <p className="text-[13px] text-slate-600 leading-relaxed"><span className="font-semibold text-slate-800">{T.customersSee}</span> {summarize(hours, SHORT, T.closedShort)}</p>
      </div>

      {/* Week as day cards */}
      <div className="fade-rise fade-rise-d2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {hours.map((h) => (
          <div key={h.dayOfWeek} className={cn("rounded-2xl p-4 transition-opacity", !h.isOpen && "opacity-70")} style={{ background: h.isOpen ? "var(--surface)" : "var(--surface-inset)", border: "1px solid var(--hairline-soft)", boxShadow: h.isOpen ? "var(--e1)" : "none" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">{FULL[h.dayOfWeek]}</span>
              <button type="button" role="switch" aria-checked={h.isOpen} aria-label={`${FULL[h.dayOfWeek]} — ${h.isOpen ? T.openState : T.closedState}`} onClick={() => upd(h.dayOfWeek, { isOpen: !h.isOpen })} className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0" style={{ background: h.isOpen ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
                <span className={cn("inline-block h-3.5 w-3.5 mx-0.5 rounded-full bg-white shadow transition-transform", h.isOpen ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
            {h.isOpen ? (
              (() => {
                const invalid = dayInvalid(h);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <select value={h.openTime} onChange={(e) => setOpenTime(h.dayOfWeek, e.target.value)} aria-label={`${FULL[h.dayOfWeek]} — ${T.openLabel}`} className="input-glass flex-1 rounded-lg px-2 py-1.5 text-sm outline-none text-slate-800 tabular-nums">{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                      <span className="text-slate-400 text-xs">–</span>
                      {/* Closing options are limited to times after opening, so an
                          end ≤ start can't be selected in the first place. */}
                      <select value={h.closeTime} onChange={(e) => upd(h.dayOfWeek, { closeTime: e.target.value })} aria-label={`${FULL[h.dayOfWeek]} — ${T.closeLabel}`} aria-invalid={invalid} className="input-glass flex-1 rounded-lg px-2 py-1.5 text-sm outline-none text-slate-800 tabular-nums" style={invalid ? { border: "1px solid rgba(190,18,60,0.5)" } : undefined}>{TIMES.filter((t) => toMin(t) > toMin(h.openTime)).map((t) => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    {invalid ? (
                      <p role="alert" className="text-[11px] font-medium text-center" style={{ color: "#BE123C" }}>{T.closeAfterOpen}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 tabular-nums text-center">{dur(h.openTime, h.closeTime)} {T.openSuffix}</p>
                    )}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-slate-400 italic py-2">Nieczynne</p>
            )}
          </div>
        ))}
      </div>

      {/* Sticky dirty-state save bar */}
      <AnimatePresence>
        {(dirty || saved || hasInvalid) && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 pl-5 pr-2 py-2 rounded-2xl"
            style={{ zIndex: "var(--z-sticky)" as unknown as number, background: "var(--chrome-strong)", backdropFilter: "var(--chrome-blur-lg)", WebkitBackdropFilter: "var(--chrome-blur-lg)", border: "1px solid var(--hairline)", boxShadow: "var(--e3)" }}
          >
            <span className="text-[13px] font-medium" style={{ color: hasInvalid ? "#BE123C" : "#334155" }}>
              {saved ? T.saved : hasInvalid ? T.fixHours : T.unsaved}
            </span>
            {!saved && <InkButton size="sm" onClick={save} disabled={isPending || hasInvalid}>{isPending ? T.saving : T.save}</InkButton>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
