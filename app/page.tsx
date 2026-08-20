"use client";

import { useState, useCallback } from "react";
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
import { BRAND_TAGLINE_LINES } from "@/lib/brand";
import { ELEV_RAISED, INK_BTN, ON_INK_BTN, ON_INK_GHOST_BTN } from "@/components/ui/glass/tokens";
import { jsonLdScript } from "@/lib/json-ld";

// ── Landing surfaces ─────────────────────────────────────────────────────────
//
// Almost nothing is left here, and that is the point: the page used to be built
// from card / panel / chip / pill styles applied to every slot, so every section
// looked like every other section. Composition now does that work — rails,
// rules, numerals and one ink band — and only the two genuinely interactive
// surfaces still need a style object.

const G = {
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


// ── Step visuals ─────────────────────────────────────────────────────────────
// Small, static diagrams of the three steps, drawn with the product's own
// shapes. No images, no icons library, no text that would need translating
// beyond the day labels the booking widget already uses.

const BAR = "rounded-full";

function Bar({ w, tone = "soft" }: { w: string; tone?: "soft" | "firm" }) {
  return (
    <span
      className={`block h-2 ${BAR}`}
      style={{ width: w, background: tone === "firm" ? "rgba(15,23,42,0.16)" : "rgba(15,23,42,0.075)" }}
    />
  );
}

/** 01 — a search field with two results beneath it. */
function StepSearchVisual() {
  return (
    <div className="space-y-2.5">
      <div
        className="flex items-center gap-2.5 h-10 px-3 rounded-[10px]"
        style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)" }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <Bar w="52%" />
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 h-10 px-3 rounded-[10px]"
          style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)" }}
        >
          <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: "var(--selected)" }} />
          <span className="flex-1 space-y-1.5">
            <Bar w={i === 0 ? "58%" : "44%"} tone="firm" />
            <Bar w={i === 0 ? "34%" : "40%"} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** 02 — days across the top, times below, one of each chosen. */
function StepSlotsVisual({ days }: { days: string[] }) {
  const picked = 2;
  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        {days.slice(0, 5).map((d, i) => (
          <span
            key={i}
            className="flex-1 h-8 rounded-[8px] flex items-center justify-center text-[10.5px] font-semibold"
            style={
              i === picked
                ? { background: "var(--ink-raised)", color: "#F8FAFC" }
                : { background: "var(--surface)", border: "1px solid var(--hairline-soft)", color: "#8593A8" }
            }
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {["09:00", "10:30", "12:00", "13:30"].map((t, i) => (
          <span
            key={t}
            className="h-8 rounded-[8px] flex items-center justify-center text-[10.5px] font-medium tabular-nums"
            style={
              i === 1
                ? { background: "var(--selected)", border: "1px solid var(--hairline)", color: "#334155" }
                : { background: "var(--surface)", border: "1px solid var(--hairline-soft)", color: "#8593A8" }
            }
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 03 — the confirmation the customer ends up with. */
function StepConfirmVisual() {
  return (
    <div className="space-y-2.5">
      <div
        className="flex items-center gap-3 h-[52px] px-3.5 rounded-[10px]"
        style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--e1)" }}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ink-raised)" }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <span className="flex-1 space-y-1.5">
          <Bar w="62%" tone="firm" />
          <Bar w="38%" />
        </span>
      </div>
      <div
        className="flex items-center gap-2.5 h-10 px-3.5 rounded-[10px]"
        style={{ background: "var(--surface-inset)", border: "1px solid var(--hairline-soft)" }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />
        </svg>
        <Bar w="46%" />
      </div>
    </div>
  );
}

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
    // No areaServed: the platform is not restricted to one market, and naming
    // a single country here told search engines the opposite. Markets that are
    // actually launched are expressed by the salons listed, not by a claim.
    { "@type": "Organization", name: "TermCatch", url: "https://termcatch.com", logo: "https://termcatch.com/opengraph-image", email: "hello@termcatch.com", description: "Online booking platform for salons, wellness and service businesses." },
    { "@type": "WebSite", name: "TermCatch", url: "https://termcatch.com", inLanguage: "pl-PL", potentialAction: { "@type": "SearchAction", target: "https://termcatch.com/search?q={search_term_string}", "query-input": "required name=search_term_string" } },
  ],
};

export default function HomePage() {
  const fade = useReducedMotion() ? revealFade : reveal;
  // Reused by the step visual so the two previews speak the same language.
  const DAYS_DEMO = useT().home.demoDays.split(",");
  const t = useT();
  const h = t.home;
  const locale = useLocale();
  const marquee = visibleCategoriesFor(locale).map((c) => c.label);
  return (
    <div className="min-h-screen overflow-x-hidden text-slate-900" style={{ background: BG.hero }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(HOME_JSON_LD) }} />
      <LandingNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 md:pt-32 pb-16 md:pb-24">
        {/* One hairline grid, low and wide, gathered under the headline rather
            than a full-bleed dot field with a vignette over it. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.13) 1px, transparent 1px)",
            backgroundSize: "112px 100%",
            maskImage: "linear-gradient(180deg, transparent 0%, black 22%, black 72%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 22%, black 72%, transparent 100%)",
          }}
        />

        {/* Left-anchored editorial grid. The text column keeps the page's 7xl
            rhythm; the stage column deliberately does not, and runs out of the
            frame. */}
        <div
          className="relative z-10 grid lg:grid-cols-[minmax(0,52ch)_minmax(0,1fr)] gap-y-12 lg:gap-x-16 xl:gap-x-24 items-center"
          style={{ paddingLeft: "max(1.5rem, calc((100vw - 80rem) / 2))" }}
        >
          {/* ── Editorial column ── */}
          <div className="pr-6 lg:pr-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="rail mb-7"
            >
              <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                {h.heroEyebrow}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="type-display text-slate-900"
            >
              {/* "Book. Manage. Grow." is a brand string, so it comes from
                  lib/brand and is identical in every locale — there is no
                  dictionary key for a translator to reach. The line beneath it
                  IS translated, so a visitor who does not read English still
                  learns what TermCatch does.

                  Typographically the three lines build to the payoff: the two
                  actions recede, "Grow." lands in full ink. */}
              <span className="text-slate-500">{BRAND_TAGLINE_LINES[0]}</span><br />
              <span className="text-slate-500">{BRAND_TAGLINE_LINES[1]}</span><br />
              <span className="text-slate-900">{BRAND_TAGLINE_LINES[2]}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.16 }}
              className="type-lede mt-8 max-w-[46ch] text-secondary"
            >
              {h.heroSubtitle}
            </motion.p>

            {/* The search is the hero's one instrument, so it sits on its own
                line with room around it instead of being another stacked block. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.26 }}
              className="mt-10"
            >
              <HeroSearch />
              <div className="mt-3">
                <CustomerAssistant />
              </div>
            </motion.div>

            {/* Secondary route + trust, grouped as one quiet block under a rule
                rather than two loose paragraphs. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10 pt-6"
              style={{ borderTop: "1px solid var(--hairline-soft)" }}
            >
              <p className="text-[13px] text-secondary">
                {h.orPrefix}{" "}
                <Link href="/register?role=business" className="font-semibold text-slate-900 underline underline-offset-[3px] decoration-slate-300 hover:decoration-slate-900 transition-colors">
                  {h.addSalonFree}
                </Link>
              </p>
              <p className="mt-2 text-[12px] text-muted-glass">{h.heroTrust}</p>
            </motion.div>
          </div>

          {/* ── Stage column — runs off the right edge ── */}
          <div className="lg:pl-0 pr-6 lg:pr-0">
            <BookingWidget />
          </div>
        </div>
      </section>

      {/* ── "Prowadzisz salon?" — business CTA above the category ticker ── */}
      <section className="px-6" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
        <div className="max-w-7xl mx-auto py-7 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-slate-900 track-heading">
              {h.runSalon}
            </p>
            <p className="text-[13px] text-secondary mt-1 leading-relaxed max-w-[62ch]">
              {h.runSalonDesc}
            </p>
          </div>
          <Link
            href="/register?role=business&promo=WELCOME"
            data-on-ink
            className="btn-spring whitespace-nowrap inline-flex items-center justify-center px-5 py-2.5 min-h-[40px] text-[13px] font-semibold rounded-[10px] flex-shrink-0 self-start sm:self-auto"
            style={G.inkBtn}
          >
            {t.nav.registerSalon}
          </Link>
        </div>
      </section>

      {/* ── MARQUEE TICKER ───────────────────────────────────────── */}
      <div
        className="py-3.5 marquee-wrap"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--hairline-soft)", borderBottom: "1px solid var(--hairline-soft)" }}
      >
        <div className="marquee-track gap-8 px-8 items-center">
          {[...marquee, ...marquee].map((label, i) => (
            <span
              key={i}
              className="flex-shrink-0 text-[12px] font-medium uppercase track-overline text-slate-400"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS — three steps that show the product ────── */}
      <section className="py-24 md:py-32 px-6" style={{ background: BG.steps }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade} className="mb-12 md:mb-16 max-w-2xl">
            <div className="rail mb-6">
              <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                {h.howBadge}
              </span>
            </div>
            <h2 className="type-section text-slate-900">{h.howTitle}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 lg:gap-5">
            {[
              { n: "01", title: h.step1Title, desc: h.step1Desc, visual: <StepSearchVisual /> },
              { n: "02", title: h.step2Title, desc: h.step2Desc, visual: <StepSlotsVisual days={DAYS_DEMO} /> },
              { n: "03", title: h.step3Title, desc: h.step3Desc, visual: <StepConfirmVisual /> },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} custom={i} variants={fade}
                className="rounded-[18px] overflow-hidden flex flex-col"
                style={ELEV_RAISED}
              >
                {/* The visual sits in a recessed well so the card reads as a
                    frame around a piece of product, not as a picture card. */}
                <div
                  className="px-5 pt-5 pb-5"
                  style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline-soft)" }}
                  aria-hidden="true"
                >
                  {step.visual}
                </div>
                <div className="p-5 flex-1">
                  <p className="text-[11px] font-semibold uppercase track-overline text-slate-400 mb-2.5 tabular-nums">
                    {step.n}
                  </p>
                  <h3 className="text-[16px] font-semibold text-slate-900 track-heading mb-1.5">{step.title}</h3>
                  <p className="text-[13.5px] leading-[1.6] text-secondary">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR BUSINESS — the ink band, the page's one dark anchor ── */}
      <section className="band-ink px-6 py-24 md:py-36">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] gap-12 lg:gap-20 items-start">

            {/* Left — the pitch, set as type on the band itself. No card. */}
            <motion.div variants={fade} initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT}>
              <div className="rail mb-7">
                <span className="text-[11px] font-semibold uppercase track-overline on-ink-muted flex-shrink-0">
                  {h.bizBadge}
                </span>
              </div>

              <h2 className="type-section on-ink-primary">
                {h.bizTitle1}<br />
                <span className="font-normal on-ink-secondary">{h.bizTitle2}</span>
              </h2>

              <p className="type-lede mt-7 max-w-[46ch] on-ink-secondary">
                {h.bizSubtitle}
              </p>

              {/* Capabilities as a two-column hairline list — dense enough to
                  read as a real feature set, quiet enough not to shout. */}
              <div className="mt-11 grid sm:grid-cols-2 gap-x-10">
                {[h.feat1, h.feat2, h.feat3, h.feat4, h.feat5, h.feat6].map((f) => (
                  <div
                    key={f}
                    className="flex items-start gap-3 py-3.5 text-[14px] on-ink-secondary"
                    style={{ borderTop: "1px solid rgba(226,232,240,0.14)" }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#94A3B8" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>

              <div className="mt-11 flex flex-wrap items-center gap-3">
                <Link
                  href="/register?role=business"
                  className="btn-spring inline-flex items-center gap-2 px-6 py-3 min-h-[44px] text-sm font-semibold rounded-[11px]"
                  style={ON_INK_BTN}
                >
                  {h.registerFree}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </Link>
                <Link
                  href="/for-business"
                  className="btn-spring inline-flex items-center gap-1.5 px-5 py-3 min-h-[44px] text-sm font-semibold rounded-[11px]"
                  style={ON_INK_GHOST_BTN}
                >
                  {h.allFeatures}
                </Link>
              </div>
            </motion.div>

            {/* Right — the three reasons, as a numbered rail on the band. */}
            <motion.div initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade} className="lg:pt-2">
              <h3 className="text-[13px] font-semibold uppercase track-overline on-ink-muted mb-2">{h.whyTitle}</h3>
              {[
                { n: "01", title: h.why1Title, desc: h.why1Desc },
                { n: "02", title: h.why2Title, desc: h.why2Desc },
                { n: "03", title: h.why3Title, desc: h.why3Desc },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} custom={i} variants={fade}
                  className="flex gap-5 py-6"
                  style={{ borderTop: "1px solid rgba(226,232,240,0.14)" }}
                >
                  <span className="text-[12px] font-semibold tabular-nums on-ink-muted pt-0.5 flex-shrink-0">{f.n}</span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold on-ink-primary track-heading">{f.title}</p>
                    <p className="text-[13.5px] leading-[1.6] on-ink-secondary mt-1.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST — a hairline row, not a card ───────────────────── */}
      <section className="px-6" style={{ background: BG.numbers }}>
        <motion.div
          initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT} variants={fade}
          className="max-w-6xl mx-auto grid sm:grid-cols-3"
        >
          {[h.trust1, h.trust2, h.trust3].map((claim) => (
            <div
              key={claim}
              className="flex items-center gap-2.5 py-6 sm:py-8 text-[13.5px] font-medium text-slate-700 sm:justify-center"
              style={{ borderTop: "1px solid var(--hairline-soft)" }}
            >
              <svg className="w-4 h-4 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              {claim}
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA — open, not boxed. The page settles instead of stopping. ── */}
      <section className="px-6 py-28 md:py-44" style={{ background: BG.cta }}>
        <motion.div
          variants={fade} initial="hidden" whileInView="show" viewport={REVEAL_VIEWPORT}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="type-section text-slate-900">{h.ctaTitle}</h2>
          <p className="type-lede mt-6 max-w-[42ch] mx-auto text-secondary">
            {h.ctaSubtitle}
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?role=business"
              data-on-ink
              className="btn-spring inline-flex items-center justify-center px-7 py-3.5 min-h-[48px] font-semibold text-sm rounded-[12px]"
              style={G.inkBtn}
            >
              {h.registerSalonArrow}
            </Link>
            <Link
              href="/search"
              className="btn-spring inline-flex items-center justify-center px-7 py-3.5 min-h-[48px] font-semibold text-sm rounded-[12px] text-slate-700"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--e1)" }}
            >
              {t.customer.findSpecialist}
            </Link>
          </div>
        </motion.div>
      </section>

      <LandingFooter />
    </div>
  );
}
