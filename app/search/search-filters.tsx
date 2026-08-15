"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { gentleFade, overlayFade, projectMomentum, sheetUp, SPRING_SHEET, useReducedMotion } from "@/lib/motion";
import { CHROME_STRONG, SCRIM } from "@/components/ui/glass/tokens";
import { cn } from "@/lib/utils";
import { visibleCategoriesFor } from "@/lib/categories";
import { useT, useLocale } from "@/components/i18n/i18n-provider";

// ─── Shared styles ────────────────────────────────────────────────────────────

const INK = "var(--ink-raised)";

const INK_BTN: React.CSSProperties = {
  background: INK,
  border: "1px solid #0F172A",
  color: "#F8FAFC",
  boxShadow:
    "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
};

const GLASS_PANEL: React.CSSProperties = {
  background: "var(--surface)",
  backdropFilter: "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e2)",
};

interface SearchFiltersProps {
  currentQ?: string;
  currentCategory?: string;
  currentCity?: string;
  currentAvailable?: string;
  currentDate?: string;
  onApplied?: () => void;
}

// ─── Filter form (desktop panel + sheet body) ────────────────────────────────

export default function SearchFilters({
  currentQ,
  currentCategory,
  currentCity,
  currentAvailable,
  currentDate,
  onApplied,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const s = useT().search;
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(currentQ ?? "");
  const [category, setCategory] = useState(currentCategory ?? "");
  const [city, setCity] = useState(currentCity ?? "");
  const [available, setAvailable] = useState(currentAvailable ?? "");
  const [date, setDate] = useState(currentDate ?? "");

  const applyFilters = useCallback(
    (overrides: { q?: string; category?: string; city?: string; available?: string; date?: string }) => {
      const newQ = overrides.q !== undefined ? overrides.q : q;
      const newCategory = overrides.category !== undefined ? overrides.category : category;
      const newCity = overrides.city !== undefined ? overrides.city : city;
      const newAvailable = overrides.available !== undefined ? overrides.available : available;
      const newDate = overrides.date !== undefined ? overrides.date : date;

      const params = new URLSearchParams();
      if (newQ) params.set("q", newQ);
      if (newCategory) params.set("category", newCategory);
      if (newCity) params.set("city", newCity);
      // An exact date wins over the today/tomorrow shortcut.
      if (newDate) params.set("date", newDate);
      else if (newAvailable) params.set("available", newAvailable);

      startTransition(() => {
        router.push(`${pathname}${params.size > 0 ? `?${params.toString()}` : ""}`);
      });
    },
    [q, category, city, available, date, pathname, router]
  );

  const handleReset = () => {
    setQ("");
    setCategory("");
    setCity("");
    setAvailable("");
    setDate("");
    startTransition(() => {
      router.push(pathname);
    });
    onApplied?.();
  };

  const hasFilters = Boolean(q || category || city || available || date);

  return (
    <div
      className={cn(
        "space-y-5 transition-opacity duration-200",
        isPending && "opacity-60 pointer-events-none"
      )}
    >
      {/* Search input */}
      <div>
        <label
          htmlFor="filter-q"
          className="block text-[11px] font-semibold text-slate-500 uppercase mb-2"
          style={{ letterSpacing: "0.08em" }}
        >
          {s.filterSearch}
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="filter-q"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ q });
            }}
            onBlur={() => {
              if (q !== (currentQ ?? "")) applyFilters({ q });
            }}
            placeholder={s.servicePlaceholder}
            className="input-glass w-full pl-9 pr-3 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 transition-shadow"
          />
        </div>
      </div>

      {/* City */}
      <div>
        <label
          htmlFor="filter-city"
          className="block text-[11px] font-semibold text-slate-500 uppercase mb-2"
          style={{ letterSpacing: "0.08em" }}
        >
          {s.city}
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <input
            id="filter-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ city });
            }}
            onBlur={() => {
              if (city !== (currentCity ?? "")) applyFilters({ city });
            }}
            placeholder={s.cityPlaceholder}
            className="input-glass w-full pl-9 pr-3 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 transition-shadow"
          />
        </div>
      </div>

      {/* Category — one compact combobox instead of a radio wall */}
      <div>
        <label
          htmlFor="filter-category"
          className="block text-[11px] font-semibold text-slate-500 uppercase mb-2"
          style={{ letterSpacing: "0.08em" }}
        >
          {s.category}
        </label>
        <div className="relative">
          <select
            id="filter-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              applyFilters({ category: e.target.value });
            }}
            className="input-glass w-full appearance-none pl-3 pr-9 py-2.5 text-sm rounded-xl outline-none text-slate-800 transition-shadow cursor-pointer"
          >
            <option value="">{s.allCategories}</option>
            {visibleCategoriesFor(locale).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Availability — real free-slot filter (today / tomorrow / exact date) */}
      <div>
        <label
          className="block text-[11px] font-semibold text-slate-500 uppercase mb-2"
          style={{ letterSpacing: "0.08em" }}
        >
          {s.availability}
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "", label: s.anyDate },
            { key: "today", label: s.availableToday },
            { key: "tomorrow", label: s.availableTomorrow },
          ].map((opt) => {
            const active = !date && (available || "") === opt.key;
            return (
              <button
                key={opt.key || "any"}
                type="button"
                onClick={() => {
                  setAvailable(opt.key);
                  setDate("");
                  applyFilters({ available: opt.key, date: "" });
                }}
                aria-pressed={active}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                  active ? "text-white border-transparent" : "text-slate-600 border-slate-200 hover:text-slate-900"
                )}
                style={active ? INK_BTN : { background: "var(--surface)" }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setAvailable("");
            applyFilters({ date: e.target.value, available: "" });
          }}
          aria-label={s.dateSpecific}
          className="input-glass w-full mt-2 px-3 py-2.5 text-sm rounded-xl outline-none text-slate-800"
        />
      </div>

      {/* Reset */}
      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="w-full text-sm text-slate-500 hover:text-slate-900 underline underline-offset-4 transition-colors py-1"
        >
          {s.clearFilters}
        </button>
      )}
    </div>
  );
}

// ─── Desktop panel wrapper ────────────────────────────────────────────────────

export function FilterPanel(props: SearchFiltersProps) {
  return (
    <div className="rounded-2xl p-5" style={GLASS_PANEL}>
      <SearchFilters {...props} />
    </div>
  );
}

// ─── Mobile: "Filtry" pill + bottom sheet ────────────────────────────────────

export function MobileFilters(props: SearchFiltersProps) {
  const s = useT().search;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const activeCount = [
    props.currentQ,
    props.currentCategory,
    props.currentCity,
    props.currentAvailable || props.currentDate,
  ].filter(Boolean).length;

  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-spring inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700"
        style={GLASS_PANEL}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7 8.5v6l-4 1.5v-7.5l-7-8.5Z" />
        </svg>
        {s.filters}
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold text-white tabular-nums"
            style={{ background: INK }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Portal to <body>: an animated/transformed ancestor would otherwise
          become the containing block for this fixed overlay */}
      {mounted && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            variants={overlayFade}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 flex items-end justify-center"
            style={{ ...SCRIM, zIndex: "var(--z-overlay)" }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={s.filtersAria}
          >
            <motion.div
              variants={reduceMotion ? gentleFade : sheetUp}
              initial="hidden"
              animate="show"
              exit="exit"
              drag={reduceMotion ? false : "y"}
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_: unknown, info: PanInfo) => {
                if (info.offset.y + projectMomentum(info.velocity.y) > 100) setOpen(false);
              }}
              transition={SPRING_SHEET}
              className="w-full rounded-t-[22px] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
              style={{
                ...CHROME_STRONG,
                borderTop: "1px solid var(--hairline)",
                boxShadow: "var(--e4)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-3" aria-hidden="true">
                <div className="w-9 h-1 rounded-full" style={{ background: "var(--hairline-firm)" }} />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900" style={{ letterSpacing: "var(--track-title)" }}>
                  {s.filters}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={s.closeFilters}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <SearchFilters {...props} onApplied={() => setOpen(false)} />

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-spring w-full mt-5 py-3 rounded-xl text-sm font-semibold"
                style={INK_BTN}
              >
                Pokaż wyniki
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}
