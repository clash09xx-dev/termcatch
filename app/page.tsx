"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { reveal, revealFade, REVEAL_VIEWPORT, SPRING, useReducedMotion } from "@/lib/motion";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { CustomerAssistant } from "@/components/assistant/customer-assistant";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { visibleCategoriesFor } from "@/lib/categories";
import { ELEV_RAISED, INK_BTN } from "@/components/ui/glass/tokens";

// ── Landing surfaces ─────────────────────────────────────────────────────────
//
// These used to be six stacked backdrop-filters. Nothing moves behind them —
// the section ground is a static mesh gradient — so the blur bought nothing and
// cost a composited layer each, while milky 65%-white washed the type out.
//
// Marketing is allowed more presence than the dashboard, so the elevation runs
// one step warmer here (a hero at --e3 where an app card sits at --e2), but the
// material is the same one the product uses: opaque silver, hairline, ink.

const G = {
  /** Hero card — the booking widget and the closing CTA. */
  card: {
    ...ELEV_RAISED,
    boxShadow: "var(--e3)",
  } as React.CSSProperties,

  /** Secondary panel — steps, feature cards, stat cards. */
  panel: ELEV_RAISED as React.CSSProperties,

  /** Small chip — floating label, number badge. */
  chip: {
    background: "var(--surface)",
    border: "1px solid var(--hairline-soft)",
    boxShadow: "var(--e2)",
  } as React.CSSProperties,

  /** Pill — category, badge, subtle tag. */
  pill: {
    background: "var(--surface)",
    border: "1px solid var(--hairline-soft)",
    boxShadow: "var(--e1)",
  } as React.CSSProperties,

  /** Search input. */
  input: {
    background: "var(--surface)",
    border: "1px solid var(--hairline)",
    boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  /** Inner interactive row inside the booking widget. */
  innerBtn: {
    background: "var(--surface-inset)",
    border: "1px solid var(--hairline-soft)",
  } as React.CSSProperties,

  /** Primary CTA — machined graphite ink, the one primary-action colour. */
  inkBtn: INK_BTN as React.CSSProperties,

  divider: { borderBottom: "1px solid var(--hairline-soft)" } as React.CSSProperties,
};

// ── Section grounds ───────────────────────────────────────────────────────────
// These used to be five near-identical silver meshes, which is why the page read
// as one long undifferentiated wash: nothing framed anything else.
//
// Now they carry actual rhythm — light, then near-white, then the ink band, then
// near-white again. The tonal drop in the middle is what makes the silver read
// as silver rather than as grey, and it gives the eye somewhere to land.
const BG = {
  // Hero: light and cool, with the luminance gathered top-left behind the
  // headline so the type sits in the brightest part of the frame.
  hero: [
    "radial-gradient(ellipse 70% 55% at 8% 0%, rgba(255,255,255,0.92) 0%, transparent 60%)",
    "radial-gradient(ellipse 90% 70% at 92% 8%, rgba(186,203,224,0.42) 0%, transparent 58%)",
    "radial-gradient(ellipse 60% 50% at 40% 100%, rgba(203,213,225,0.30) 0%, transparent 62%)",
    "linear-gradient(172deg, #EDF2F9 0%, #F5F8FC 46%, #E7EEF7 100%)",
  ].join(", "),

  // Steps: the quietest surface on the page. The section is an editorial list,
  // so the ground gets out of its way entirely.
  steps: "#FAFCFE",

  // Trust: a hairline row on near-white, deliberately almost nothing.
  numbers: "#F6F9FC",

  // Closing: one soft floor glow, so the page settles rather than stopping.
  cta: [
    "radial-gradient(ellipse 100% 60% at 50% 108%, rgba(148,163,184,0.22) 0%, transparent 62%)",
    "linear-gradient(180deg, #F7FAFD 0%, #EDF2F8 100%)",
  ].join(", "),
};

// ── Interactive Booking Widget ────────────────────────────────────────────────

const SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"];

function BookingWidget() {
  const h = useT().home;
  const SERVICES = [
    { name: h.demoService1, dur: "45 min", price: "80 zł" },
    { name: h.demoService2, dur: "30 min", price: "60 zł" },
    { name: h.demoService3, dur: "60 min", price: "110 zł" },
  ];
  const DAYS = h.demoDays.split(",");
  const [svc, setSvc] = useState(0);
  const [day, setDay] = useState(2);
  const [slot, setSlot] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.22 }}
      className="stage"
    >
      <div className="relative">

        {/* Stage chrome — the toolbar of the screen you are looking into. */}
        <div
          className="relative flex items-center gap-3 px-6 sm:px-7 py-4"
          style={{ borderBottom: "1px solid var(--hairline-soft)", background: "var(--surface-2)" }}
        >
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: "var(--ink-raised)", color: "#F8FAFC" }}
          >
            T
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold truncate text-slate-900 track-heading">{h.yourSalon}</p>
            <p className="text-[11.5px] text-slate-500">{h.previewSubtitle}</p>
          </div>
          <span className="ml-auto text-[10.5px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
            {h.preview}
          </span>
        </div>

        <div className="relative px-6 sm:px-7 pt-5 pb-7 space-y-5">
          {/* Services */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase track-overline mb-2.5 text-slate-500">{h.service}</p>
            <div className="space-y-1.5">
              {SERVICES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSvc(i)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-[11px] text-sm transition-colors duration-150"
                  style={svc === i
                    ? { background: "var(--selected)", border: "1px solid var(--hairline)", color: "#1E293B", boxShadow: "var(--e1)" }
                    : { ...G.innerBtn, color: "#64748B" }
                  }
                >
                  <span className="font-medium text-left">{s.name}</span>
                  <span className="text-xs flex-shrink-0 ml-2" style={{ color: svc === i ? "#475569" : "#94A3B8" }}>
                    {s.dur} · <span className="font-semibold">{s.price}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase track-overline mb-2.5 text-slate-500">{h.time}</p>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { setDay(i); setSlot(null); }}
                  className="flex-1 py-2.5 rounded-[9px] text-xs font-semibold transition-colors duration-150"
                  style={day === i
                    ? { background: "var(--selected)", border: "1px solid var(--hairline)", color: "#334155", boxShadow: "var(--e1)" }
                    : { ...G.innerBtn, color: "#94A3B8" }
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Slots */}
          <div className="grid grid-cols-4 gap-1.5">
            {SLOTS.map((s, i) => (
              <button
                key={i}
                onClick={() => setSlot(i)}
                className="py-2.5 rounded-[9px] text-xs font-medium tabular-nums transition-colors duration-150"
                style={slot === i
                  ? { background: "rgba(100,116,139,0.22)", border: "1px solid rgba(100,116,139,0.38)", color: "#334155" }
                  : { ...G.innerBtn, color: "#94A3B8" }
                }
              >
                {s}
              </button>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/register"
            data-on-ink
            className="btn-spring flex items-center justify-center w-full py-3 min-h-[44px] text-sm font-semibold rounded-[12px]"
            style={G.inkBtn}
          >
            {slot !== null ? interpolate(h.bookAt, { time: SLOTS[slot] }) : h.pickTime}
          </Link>
        </div>
      </div>

    </motion.div>
  );
}

// ── Hero Search ───────────────────────────────────────────────────────────────

function HeroSearch() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city.trim()) params.set("city", city.trim());
    router.push(`/search${params.toString() ? "?" + params.toString() : ""}`);
  }, [q, city, router]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-xl">
      <div className="relative flex-1">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t.search.servicePlaceholder}
          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-colors placeholder:text-slate-400"
          style={G.input}
        />
      </div>
      <div className="relative sm:w-40">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
        <input
          type="text" value={city} onChange={(e) => setCity(e.target.value)}
          placeholder={t.home.cityPlaceholder}
          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-colors placeholder:text-slate-400"
          style={G.input}
        />
      </div>
      <button
        type="submit" 
        className="btn-spring px-6 py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 flex-shrink-0"
        style={G.inkBtn}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        {t.nav.search}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────



const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "TermCatch", url: "https://termcatch.com", logo: "https://termcatch.com/opengraph-image", email: "hello@termcatch.com", description: "Polska platforma rezerwacji online dla salonów beauty i wellness.", areaServed: "PL" },
    { "@type": "WebSite", name: "TermCatch", url: "https://termcatch.com", inLanguage: "pl-PL", potentialAction: { "@type": "SearchAction", target: "https://termcatch.com/search?q={search_term_string}", "query-input": "required name=search_term_string" } },
  ],
};

export default function HomePage() {
  const fade = useReducedMotion() ? revealFade : reveal;
  const t = useT();
  const h = t.home;
  const locale = useLocale();
  const marquee = visibleCategoriesFor(locale).map((c) => c.label);
  return (
    <div className="min-h-screen overflow-x-hidden text-slate-900" style={{ background: BG.hero }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }} />
      <LandingNav variant="marketing" />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-start overflow-hidden px-6 pt-28 md:pt-32 pb-16">
        {/* Dot grid — chrome refined */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(203,213,225,0.35) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
            maskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, black 30%, transparent 100%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-[1fr_480px] gap-14 xl:gap-20 items-center pb-20">
          {/* Left */}
          <div>
            {/* The hero opens straight on the headline — no early-access badge. */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl sm:text-7xl xl:text-8xl font-bold leading-[0.95] text-slate-900"
              style={{ letterSpacing: "var(--track-display)" }}
            >
              {h.heroLine1}<br />
              {h.heroLine2}<br />
              <span
                className="italic font-bold"
                style={{
                  background: "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {h.heroLine3}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.2 }}
              className="mt-7 text-lg max-w-md leading-relaxed text-slate-500"
            >
              {h.heroSubtitle}
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.3 }}
              className="mt-9"
            >
              <HeroSearch />
              <div className="mt-3">
                <CustomerAssistant />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {h.orPrefix}{" "}
                <Link href="/register?role=business" className="underline underline-offset-2 hover:text-slate-700 transition-colors">
                  {h.addSalonFree}
                </Link>
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-xs text-slate-500"
            >
              {h.heroTrust}
            </motion.p>
          </div>

          {/* Right — booking widget */}
          <div className="lg:pt-0 pt-8">
            <BookingWidget />
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div>
            <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </div>
        </motion.div>
      </section>

      {/* ── "Prowadzisz salon?" — business CTA above the category ticker ── */}
      <section className="px-4 sm:px-6 pt-10 pb-3">
        <div
          className="max-w-4xl mx-auto rounded-2xl px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
          style={G.panel}
        >
          <div className="flex-1 text-center sm:text-left">
            <p className="text-lg font-bold text-slate-900" style={{ letterSpacing: "var(--track-title)" }}>
              {h.runSalon}
            </p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              {h.runSalonDesc}
            </p>
          </div>
          <Link
            href="/register?role=business&promo=WELCOME"
            className="btn-spring whitespace-nowrap inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-xl"
            style={G.inkBtn}
          >
            {t.nav.registerSalon}
          </Link>
        </div>
      </section>

      {/* ── MARQUEE TICKER ───────────────────────────────────────── */}
      <div
        className="py-4 marquee-wrap"
        style={{ background: "var(--selected)", borderTop: "1px solid var(--hairline-soft)", borderBottom: "1px solid var(--hairline-soft)" }}
      >
        <div className="marquee-track gap-3 px-3">
          {[...marquee, ...marquee].map((label, i) => (
            <span
              key={i}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                boxShadow: "var(--e1)",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grad-sep" />

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: BG.steps }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade} className="mb-16">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full text-slate-500" style={G.pill}>
              {h.howBadge}
            </span>
            <h2 className="text-4xl font-bold text-slate-900" style={{ letterSpacing: "var(--track-display)" }}>{h.howTitle}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: "01", title: h.step1Title, desc: h.step1Desc },
              { n: "02", title: h.step2Title, desc: h.step2Desc },
              { n: "03", title: h.step3Title, desc: h.step3Desc },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} custom={i} variants={fade}
                transition={SPRING}
                className="card-hover-raise relative p-7 rounded-3xl overflow-hidden"
                style={G.panel}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold mb-5" style={G.chip}>
                    <span className="text-slate-500">{step.n}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-slate-800">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="grad-sep" />

      {/* ── FOR BUSINESS ─────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: BG.business }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Main feature card */}
            <motion.div
              variants={fade} initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT}
              className="relative rounded-3xl p-10 overflow-hidden"
              style={G.card}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />
              {/* Chrome top specular edge */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.95) 70%, transparent)" }} />

              <div className="relative">
                <span className="text-xs font-semibold uppercase tracking-widest block mb-6 text-slate-400">{h.bizBadge}</span>
                <h2 className="text-3xl font-bold leading-snug mb-5 text-slate-900" style={{ letterSpacing: "var(--track-display)" }}>
                  {h.bizTitle1}<br />{h.bizTitle2}
                </h2>
                <p className="text-sm leading-relaxed mb-9 text-slate-500">
                  {h.bizSubtitle}
                </p>
                <div className="space-y-3 mb-10">
                  {[h.feat1, h.feat2, h.feat3, h.feat4, h.feat5, h.feat6].map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm text-slate-600">
                      <svg className="w-4 h-4 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <div 
                  className="btn-spring inline-flex"
                >
                  <Link
                    href="/register?role=business"
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl"
                    style={G.inkBtn}
                  >
                    {h.registerFree}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Feature cards */}
            <motion.div initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade} className="space-y-4 lg:pt-2">
              <h3 className="text-2xl font-bold mb-6 text-slate-900">{h.whyTitle}</h3>
              {[
                { n: "01", title: h.why1Title, desc: h.why1Desc },
                { n: "02", title: h.why2Title, desc: h.why2Desc },
                { n: "03", title: h.why3Title, desc: h.why3Desc },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} custom={i} variants={fade}
                  transition={SPRING}
                  className="card-hover-raise relative flex gap-4 p-5 rounded-2xl overflow-hidden"
                  style={G.panel}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />
                  <div className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 text-slate-500" style={G.chip}>
                    {f.n}
                  </div>
                  <div className="relative">
                    <p className="text-sm font-bold mb-1 text-slate-800">{f.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
              <Link href="/for-business" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity mt-2 text-slate-500">
                {h.allFeatures}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="grad-sep" />

      {/* ── TRUST BAR ────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: BG.numbers }}>
        <motion.div
          initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade}
          className="max-w-3xl mx-auto relative rounded-2xl overflow-hidden px-6 py-6 sm:px-10"
          style={G.panel}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-center">
            {[h.trust1, h.trust2, h.trust3].map((claim) => (
              <div key={claim} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <svg className="w-4 h-4 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
                {claim}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <div className="grad-sep" />

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: BG.cta }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fade} initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT}
            className="relative rounded-3xl p-14 text-center overflow-hidden"
            style={G.card}
          >
            {/* Chrome dot grid */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle, rgba(203,213,225,0.28) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            {/* Chrome top specular */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.98) 30%, rgba(255,255,255,0.98) 70%, transparent)" }} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, rgba(203,213,225,0.70))" }} />
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#CBD5E1", boxShadow: "var(--e1)" }} />
                <span className="h-px w-12" style={{ background: "linear-gradient(90deg, rgba(203,213,225,0.70), transparent)" }} />
              </div>
              <h2 className="text-4xl font-bold mb-4 text-slate-900" style={{ letterSpacing: "var(--track-display)" }}>{h.ctaTitle}</h2>
              <p className="mb-10 max-w-sm mx-auto text-base text-slate-500">
                {h.ctaSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <div 
                >
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl text-slate-700"
                    style={G.innerBtn}
                  >
                    {t.customer.findSpecialist}
                  </Link>
                </div>
                <div 
                >
                  <Link
                    href="/register?role=business"
                    className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl"
                    style={G.inkBtn}
                  >
                    {h.registerSalonArrow}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
