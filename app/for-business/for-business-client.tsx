"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { reveal, revealFade, REVEAL_VIEWPORT, SPRING, useReducedMotion } from "@/lib/motion";
import { LandingNav } from "@/components/layout/landing-nav";
import { useT } from "@/components/i18n/i18n-provider";
import { LandingFooter } from "@/components/layout/landing-footer";

// ── Glass style constants ─────────────────────────────────────────────────────

const G = {
  inkBtn: {
    background: "var(--ink-raised)",
    border: "1px solid #0F172A",
    color: "#F8FAFC",
    boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), 0 2px 6px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.15)",
  } as React.CSSProperties,
  innerBtn: {
    background: "var(--surface)",
    border: "1px solid var(--hairline-soft)",
    boxShadow: "var(--e1)",
  } as React.CSSProperties,
  divider: { borderBottom: "1px solid var(--hairline-soft)" } as React.CSSProperties,
};

const BG = {
  hero: [
    "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
    "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
    "radial-gradient(ellipse 40% 35% at 20% 25%, rgba(203,213,225,0.35) 0%, transparent 60%)",
    "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
  ].join(", "),
  features: [
    "radial-gradient(ellipse 90% 70% at 50% 60%, rgba(203,213,225,0.20) 0%, transparent 65%)",
    "radial-gradient(ellipse 55% 45% at 90% 10%, rgba(148,163,184,0.14) 0%, transparent 55%)",
    "#EEF3FA",
  ].join(", "),
  cta: [
    "radial-gradient(ellipse 100% 60% at 50% 108%, rgba(148,163,184,0.22) 0%, transparent 62%)",
    "linear-gradient(180deg, #F7FAFD 0%, #EDF2F8 100%)",
  ].join(", "),
};



// ── Dashboard Preview Widget ──────────────────────────────────────────────────

const BOOKING_DATA = [
  { time: "09:00", name: "Ania K.", price: "80 zł", active: true },
  { time: "10:30", name: "Marek B.", price: "60 zł", active: false },
  { time: "12:00", name: "Kasia W.", price: "90 zł", active: false },
  { time: "14:00", name: "Tomek S.", price: "50 zł", active: false },
];

function DashboardPreview() {
  const T = useT().publicPages.forBusiness;
  const services = [T.previewService1, T.previewService2, T.previewService3, T.previewService4];
  const BOOKINGS = BOOKING_DATA.map((b, i) => ({ ...b, service: services[i] }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.22 }}
      className="stage"
    >
      <div className="relative">

        {/* Header */}
        <div
          className="relative flex items-center justify-between px-6 sm:px-7 py-4"
          style={{ borderBottom: "1px solid var(--hairline-soft)", background: "var(--surface-2)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
              style={{ background: "rgba(148,163,184,0.22)", border: "1px solid rgba(148,163,184,0.32)", color: "#475569" }}>
              T
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 leading-none">{T.previewSalon}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{T.previewPanel}</p>
            </div>
          </div>
          <span className="text-[10.5px] font-semibold uppercase track-overline text-slate-500">{T.previewBadge}</span>
        </div>

        {/* Bookings */}
        <div className="relative px-4 pt-3 pb-2 space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-2 text-slate-400">{T.previewSchedule}</p>
          {BOOKINGS.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={b.active
                ? { background: "var(--selected)", border: "1px solid var(--hairline)", boxShadow: "var(--e1)" }
                : { ...G.innerBtn }
              }
            >
              <span className="text-[10px] font-mono text-slate-400 w-9 flex-shrink-0">{b.time}</span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 text-slate-600"
                style={{ background: "var(--selected)", border: "1px solid var(--hairline)" }}
              >
                {b.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 leading-none truncate">{b.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{b.service}</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 flex-shrink-0">{b.price}</span>
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3">
          {[
            { num: "4", label: T.previewVisitsToday },
            { num: "280 zł", label: T.previewRevenue },
            { num: "97%", label: T.previewOccupancy },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-[10px] text-center" style={{ background: "var(--surface-inset)", border: "1px solid var(--hairline-soft)" }}>
              <p className="text-sm font-bold text-slate-800">{s.num}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating chip — new booking notification */}
    </motion.div>
  );
}

// ── Feature cards data ────────────────────────────────────────────────────────

const FEATURE_ICONS = [
  {
    n: "01",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    n: "02",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    n: "03",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    n: "04",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    n: "05",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    n: "06",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export function ForBusinessClient() {
  const fade = useReducedMotion() ? revealFade : reveal;
  const T = useT().publicPages.forBusiness;

  const STEPS = [
    { n: "01", title: T.step1Title, desc: T.step1Desc },
    { n: "02", title: T.step2Title, desc: T.step2Desc },
    { n: "03", title: T.step3Title, desc: T.step3Desc },
  ];
  const featureCopy = [
    { title: T.f1Title, desc: T.f1Desc },
    { title: T.f2Title, desc: T.f2Desc },
    { title: T.f3Title, desc: T.f3Desc },
    { title: T.f4Title, desc: T.f4Desc },
    { title: T.f5Title, desc: T.f5Desc },
    { title: T.f6Title, desc: T.f6Desc },
  ];
  const FEATURES = FEATURE_ICONS.map((f, i) => ({ ...f, ...featureCopy[i] }));

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: BG.hero }}>
      <LandingNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 md:pt-32 pb-16 md:pb-24">
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.13) 1px, transparent 1px)",
            backgroundSize: "112px 100%",
            maskImage: "linear-gradient(180deg, transparent 0%, black 22%, black 72%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 22%, black 72%, transparent 100%)",
          }}
        />

        <div
          className="relative z-10 grid lg:grid-cols-[minmax(0,52ch)_minmax(0,1fr)] gap-y-12 lg:gap-x-16 xl:gap-x-24 items-center"
          style={{ paddingLeft: "max(1.5rem, calc((100vw - 80rem) / 2))" }}
        >
          {/* Editorial column */}
          <div className="pr-6 lg:pr-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="rail mb-7"
            >
              <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                {T.eyebrow}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="type-display text-slate-900"
            >
              {T.headlineTop}<br />
              <span className="italic font-bold" style={{
                background: "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                {T.headlineBottom}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.2 }}
              className="type-lede mt-8 max-w-[46ch] text-secondary"
            >
              {T.lede}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 mt-9"
            >
              <div 
              >
                <Link
                  href="/register?role=business"
                  className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl"
                  style={G.inkBtn}
                >
                  {T.ctaPrimary}
                  <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 pt-6 text-[12px] text-muted-glass"
              style={{ borderTop: "1px solid var(--hairline-soft)" }}
            >
              {T.trust}
            </motion.p>
          </div>

          {/* Stage column — runs off the right edge */}
          <div className="pr-6 lg:pr-0">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── STATS — the page's ink band ──────────────────────────── */}
      <section className="band-ink py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-10">
          {[
            { num: T.statLessLabel, label: T.statLessValue },
            { num: "24/7", label: T.statAvailability },
            { num: "5 min", label: T.statSetupSalon },
            { num: T.statMonthsValue, label: T.statFreeMonths },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} custom={i} variants={fade}
              className="text-center px-4"
            >
              <p className="type-numeral on-ink-primary">{s.num}</p>
              <p className="text-[12px] font-medium uppercase track-overline on-ink-muted mt-3 leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── STEPS ────────────────────────────────────────────────── */}
      <section
        className="py-28 px-6"
        style={{
          background: "#FAFCFE"
        }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade} className="mb-16">
            <div className="rail mb-6">
              <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                {T.stepsEyebrow}
              </span>
            </div>
            <h2 className="type-section text-slate-900">
              {T.stepsTitle}
            </h2>
          </motion.div>

          <div>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} custom={i} variants={fade}
                className="grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[7rem_minmax(0,26rem)_minmax(0,1fr)] gap-x-6 md:gap-x-10 gap-y-2 py-8 md:py-11"
                style={{ borderTop: "1px solid var(--hairline-soft)" }}
              >
                <span className="type-numeral text-muted-glass select-none row-span-2 md:row-span-1">{step.n}</span>
                <h3 className="text-[19px] md:text-[22px] font-semibold text-slate-900 track-title self-center">{step.title}</h3>
                <p className="text-[14.5px] leading-[1.65] text-secondary max-w-[52ch] self-center col-start-2 md:col-start-3">{step.desc}</p>
              </motion.div>
            ))}
            <div className="rule" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: BG.features }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade} className="mb-16">
            <div className="rail mb-6">
              <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                {T.featuresEyebrow}
              </span>
            </div>
            <h2 className="type-section text-slate-900">
              {T.featuresTitle}
            </h2>
            <p className="type-lede mt-5 max-w-[46ch] text-secondary">
              {T.featuresLede}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.n}
                initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} custom={i} variants={fade}
                className="py-7"
                style={{ borderTop: "1px solid var(--hairline-soft)" }}
              >
                <div className="text-slate-400 mb-4">{f.icon}</div>
                <h3 className="text-[15px] font-semibold mb-2 text-slate-900 track-heading">{f.title}</h3>
                <p className="text-[14px] leading-[1.65] text-secondary max-w-[38ch]">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — open. The page ends on room, not on more chrome. ── */}
      <section className="px-6 py-28 md:py-44" style={{ background: BG.cta }}>
        <motion.div
          initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="type-section text-slate-900">{T.ctaTitle}</h2>
          <p className="type-lede mt-6 max-w-[42ch] mx-auto text-secondary">{T.ctaLede}</p>

          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?role=business"
              data-on-ink
              className="btn-spring inline-flex items-center justify-center px-7 py-3.5 min-h-[48px] font-semibold text-sm rounded-[12px]"
              style={G.inkBtn}
            >
              {T.ctaPrimary}
            </Link>
            <Link
              href="/search"
              className="btn-spring inline-flex items-center justify-center px-7 py-3.5 min-h-[48px] font-semibold text-sm rounded-[12px] text-slate-700"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--e1)" }}
            >
              {T.browseSalons}
            </Link>
          </div>
        </motion.div>
      </section>

      <LandingFooter />
    </div>
  );
}
