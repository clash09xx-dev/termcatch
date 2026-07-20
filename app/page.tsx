"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { CustomerAssistant } from "@/components/assistant/customer-assistant";

// ── Premium Chrome Glass style helpers ───────────────────────────────────────
// Every surface is multi-layer: chrome ring → contact → depth → ambient
// + inner top highlight + inner bottom chrome reflection.

const G = {
  // Primary large glass card — widget, feature card, CTA
  card: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.50)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.40), 0 2px 4px rgba(0,0,0,0.04), 0 12px 36px rgba(100,116,139,0.10), 0 40px 80px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(203,213,225,0.10)",
  } as React.CSSProperties,

  // Secondary panel — steps, feature cards, stat cards
  panel: {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(32px) saturate(200%)",
    WebkitBackdropFilter: "blur(32px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.40)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.30), 0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(203,213,225,0.08)",
  } as React.CSSProperties,

  // Small glass chip — floating label, number badge
  chip: {
    background: "rgba(255,255,255,0.80)",
    backdropFilter: "blur(20px) saturate(200%)",
    WebkitBackdropFilter: "blur(20px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.50)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.35), 0 2px 8px rgba(100,116,139,0.08), 0 8px 24px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.95)",
  } as React.CSSProperties,

  // Pill — category, badge, subtle tag
  pill: {
    background: "rgba(255,255,255,0.68)",
    backdropFilter: "blur(16px) saturate(190%)",
    WebkitBackdropFilter: "blur(16px) saturate(190%)",
    border: "1px solid rgba(203,213,225,0.40)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 4px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
  } as React.CSSProperties,

  // Input — Apple search style
  input: {
    background: "rgba(255,255,255,0.80)",
    backdropFilter: "blur(20px) saturate(200%)",
    WebkitBackdropFilter: "blur(20px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.50)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.30), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 1px 3px rgba(0,0,0,0.03)",
    color: "#0F172A",
  } as React.CSSProperties,

  // Inner interactive button — booking widget rows
  innerBtn: {
    background: "rgba(255,255,255,0.60)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: "1px solid rgba(203,213,225,0.40)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.85)",
  } as React.CSSProperties,

  // Primary CTA button — machined graphite ink (the one primary-action color)
  inkBtn: {
    background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
    border: "1px solid #0F172A",
    color: "#F8FAFC",
    boxShadow:
      "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), 0 2px 6px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.15)",
  } as React.CSSProperties,

  divider: { borderBottom: "1px solid rgba(203,213,225,0.22)" } as React.CSSProperties,
};

// ── Section backgrounds — premium ambient mesh ────────────────────────────────
// Layered cool-chrome radial glows on white/near-white base.
// Glass elements need colored surfaces underneath to look physical.
const BG = {
  hero: [
    "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
    "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
    "radial-gradient(ellipse 40% 35% at 20% 25%, rgba(203,213,225,0.35) 0%, transparent 60%)",
    "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
  ].join(", "),

  steps: [
    "radial-gradient(ellipse 90% 70% at 50% 60%, rgba(203,213,225,0.24) 0%, transparent 65%)",
    "radial-gradient(ellipse 55% 45% at 90% 10%, rgba(148,163,184,0.16) 0%, transparent 55%)",
    "#EEF3FA",
  ].join(", "),

  business: [
    "radial-gradient(ellipse 100% 65% at 20% 50%, rgba(203,213,225,0.22) 0%, transparent 60%)",
    "radial-gradient(ellipse 65% 55% at 85% 80%, rgba(148,163,184,0.16) 0%, transparent 55%)",
    "#E9EFF8",
  ].join(", "),

  numbers: [
    "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(203,213,225,0.26) 0%, transparent 65%)",
    "#EEF3FA",
  ].join(", "),

  cta: [
    "radial-gradient(ellipse 90% 70% at 50% 85%, rgba(203,213,225,0.24) 0%, transparent 60%)",
    "radial-gradient(ellipse 65% 55% at 15% 15%, rgba(148,163,184,0.18) 0%, transparent 55%)",
    "#EBF1F9",
  ].join(", "),
};

// ── Interactive Booking Widget ────────────────────────────────────────────────

const SERVICES = [
  { name: "Strzyżenie + modelowanie", dur: "45 min", price: "80 zł" },
  { name: "Fade klasyczny", dur: "30 min", price: "60 zł" },
  { name: "Broda + strzyżenie", dur: "60 min", price: "110 zł" },
];
const DAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So"];
const SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"];

function BookingWidget() {
  const [svc, setSvc] = useState(0);
  const [day, setDay] = useState(2);
  const [slot, setSlot] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Main glass card */}
      <div className="relative rounded-3xl overflow-hidden" style={G.card}>
        {/* Top specular catch-light */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />
        {/* Chrome top edge */}
        <div className="absolute top-0 left-8 right-8 h-px pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)" }} />

        {/* Header */}
        <div className="relative flex items-center gap-3 px-5 py-4" style={G.divider}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "rgba(148,163,184,0.22)", border: "1px solid rgba(148,163,184,0.32)", color: "#475569" }}
          >
            T
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-slate-800">Twój salon</p>
            <p className="text-xs text-slate-400">Tak klienci widzą Twój profil</p>
          </div>
          <span className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 text-slate-500" style={G.pill}>
            Podgląd
          </span>
        </div>

        <div className="relative px-5 pt-4 pb-5 space-y-4">
          {/* Services */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-400">Usługa</p>
            <div className="space-y-1.5">
              {SERVICES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSvc(i)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150"
                  style={svc === i
                    ? { background: "rgba(203,213,225,0.28)", border: "1px solid rgba(203,213,225,0.60)", color: "#1E293B", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.90)" }
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
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-400">Termin</p>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { setDay(i); setSlot(null); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={day === i
                    ? { background: "rgba(203,213,225,0.30)", border: "1px solid rgba(203,213,225,0.60)", color: "#334155", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.85)" }
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
                className="py-2 rounded-lg text-xs font-medium transition-all duration-150"
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
          <motion.div
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.978 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            <Link
              href="/register"
              className="flex items-center justify-center w-full py-3 text-sm font-semibold rounded-xl"
              style={G.inkBtn}
            >
              {slot !== null ? `Zarezerwuj na ${SLOTS[slot]}` : "Wybierz godzinę"}
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Floating chips */}
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="absolute -top-6 -right-6 rounded-2xl px-4 py-3 hidden sm:block"
        style={G.chip}
      >
        <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Nowa rezerwacja</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">Dziś · 15:30</p>
      </motion.div>

      <motion.div
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 4.0, repeat: Infinity, ease: [0.45, 0, 0.55, 1], delay: 1.2 }}
        className="absolute -bottom-6 -left-6 rounded-2xl px-4 py-3 hidden sm:block"
        style={G.chip}
      >
        <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Powiadomienie</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">Wizyta potwierdzona</p>
      </motion.div>
    </motion.div>
  );
}

// ── Hero Search ───────────────────────────────────────────────────────────────

function HeroSearch() {
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
          placeholder="Fryzjer, masaż, manicure…"
          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all placeholder:text-slate-400"
          style={G.input}
        />
      </div>
      <div className="relative sm:w-40">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
        <input
          type="text" value={city} onChange={(e) => setCity(e.target.value)}
          placeholder="Miasto"
          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all placeholder:text-slate-400"
          style={G.input}
        />
      </div>
      <motion.button
        type="submit"
        whileHover={{ scale: 1.015, y: -0.5 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="px-6 py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 flex-shrink-0"
        style={G.inkBtn}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        Szukaj
      </motion.button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
};

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "TermCatch", url: "https://termcatch.com", logo: "https://termcatch.com/opengraph-image", email: "hello@termcatch.com", description: "Polska platforma rezerwacji online dla salonów beauty i wellness.", areaServed: "PL" },
    { "@type": "WebSite", name: "TermCatch", url: "https://termcatch.com", inLanguage: "pl-PL", potentialAction: { "@type": "SearchAction", target: "https://termcatch.com/search?q={search_term_string}", "query-input": "required name=search_term_string" } },
  ],
};

export default function HomePage() {
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
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium mb-9"
              style={{ ...G.pill, color: "#64748B", letterSpacing: "0.01em" }}
            >
              {/* Double-ring status dot */}
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "#94A3B8", animation: "dot-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
                />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#CBD5E1" }} />
              </span>
              Wczesny dostęp · dołącz jako jeden z pierwszych salonów
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl sm:text-7xl xl:text-8xl font-bold leading-[0.95] text-slate-900"
              style={{ letterSpacing: "-0.04em" }}
            >
              Rezerwuj<br />
              bez<br />
              <span
                className="italic font-bold"
                style={{
                  background: "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                telefonu.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 text-lg max-w-md leading-relaxed text-slate-500"
            >
              Jeden link do salonu. Klienci wybierają termin sami — Ty dostajesz powiadomienie i gotowe.
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-9"
            >
              <HeroSearch />
              <div className="mt-3">
                <CustomerAssistant />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Lub{" "}
                <Link href="/register?role=business" className="underline underline-offset-2 hover:text-slate-700 transition-colors">
                  dodaj salon za darmo →
                </Link>
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-xs text-slate-500"
            >
              Bez karty kredytowej · Instalacja w 5 minut · Polskie wsparcie
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
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
            <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── MARQUEE TICKER ───────────────────────────────────────── */}
      <div
        className="py-4 marquee-wrap"
        style={{ background: "rgba(203,213,225,0.14)", borderTop: "1px solid rgba(203,213,225,0.30)", borderBottom: "1px solid rgba(203,213,225,0.30)" }}
      >
        <div className="marquee-track gap-3 px-3">
          {[
            "Fryzjer", "Barber", "Masaż", "Manicure", "Kosmetyczka", "Tatuaż",
            "Spa & wellness", "Fizjoterapia", "Joga", "Pilates", "Solarium",
            "Dietetyk", "Trener personalny", "Makijaż", "Brwi & Rzęsy",
            "Fryzjer", "Barber", "Masaż", "Manicure", "Kosmetyczka", "Tatuaż",
            "Spa & wellness", "Fizjoterapia", "Joga", "Pilates", "Solarium",
            "Dietetyk", "Trener personalny", "Makijaż", "Brwi & Rzęsy",
          ].map((label, i) => (
            <span
              key={i}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500"
              style={{
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(203,213,225,0.45)",
                boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.90)",
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
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} className="mb-16">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full text-slate-500" style={G.pill}>
              Jak to działa
            </span>
            <h2 className="text-4xl font-bold text-slate-900" style={{ letterSpacing: "-0.03em" }}>Trzy kroki. Nic więcej.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: "01", title: "Wyszukaj", desc: "Wpisz usługę lub kategorię. Widzisz dostępność w czasie rzeczywistym — żadnego czekania na odpowiedź." },
              { n: "02", title: "Wybierz termin", desc: "Wolne sloty aktualizują się automatycznie. Filtruj po pracowniku, dacie i cenie." },
              { n: "03", title: "Gotowe", desc: "Rezerwacja w kilka sekund. Potwierdzenie i przypomnienie na SMS i e-mail." },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fade}
                whileHover={{ y: -4, scale: 1.008 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="relative p-7 rounded-3xl overflow-hidden glass-shimmer-wrap"
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
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-3xl p-10 overflow-hidden"
              style={G.card}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />
              {/* Chrome top specular edge */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.95) 70%, transparent)" }} />

              <div className="relative">
                <span className="text-xs font-semibold uppercase tracking-widest block mb-6 text-slate-400">Panel specjalisty</span>
                <h2 className="text-3xl font-bold leading-snug mb-5 text-slate-900" style={{ letterSpacing: "-0.03em" }}>
                  Mniej administracji.<br />Więcej klientów.
                </h2>
                <p className="text-sm leading-relaxed mb-9 text-slate-500">
                  Kalendarz online, zarządzanie personelem, płatności i analityka — w jednym miejscu.
                </p>
                <div className="space-y-3 mb-10">
                  {["Kalendarz online 24/7", "Automatyczne przypomnienia SMS", "Zarządzanie pracownikami", "Płatności i depozyty", "CRM i historia klientów", "Analityka i raporty"].map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm text-slate-600">
                      <svg className="w-4 h-4 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <motion.div
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.978 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className="inline-flex"
                >
                  <Link
                    href="/register?role=business"
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl"
                    style={G.inkBtn}
                  >
                    Zarejestruj salon — za darmo
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Feature cards */}
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} className="space-y-4 lg:pt-2">
              <h3 className="text-2xl font-bold mb-6 text-slate-900">Dlaczego TermCatch?</h3>
              {[
                { n: "01", title: "Mniej nieobecności", desc: "Automatyczne przypomnienia SMS i e-mail przed każdą wizytą pomagają ograniczyć nieobecności." },
                { n: "02", title: "Rezerwacje o każdej porze", desc: "Klienci rezerwują o 2 w nocy, w weekend, w czasie pracy — bez Twojego udziału." },
                { n: "03", title: "Jeden link", desc: "Twoja strona rezerwacji gotowa od razu. Wystarczy wysłać link klientom lub dodać go do bio." },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fade}
                  whileHover={{ y: -3, scale: 1.008 }}
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                  className="relative flex gap-4 p-5 rounded-2xl overflow-hidden glass-shimmer-wrap"
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
                Wszystkie funkcje dla salonów
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
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="max-w-3xl mx-auto relative rounded-2xl overflow-hidden glass-shimmer-wrap px-6 py-6 sm:px-10"
          style={G.panel}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-center">
            {[
              "Darmowa rejestracja konta",
              "Prowizja 20% tylko od 1. wizyty nowego klienta",
              "Wsparcie w języku polskim",
            ].map((claim) => (
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
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
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
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#CBD5E1", boxShadow: "0 0 0 2px rgba(203,213,225,0.30)" }} />
                <span className="h-px w-12" style={{ background: "linear-gradient(90deg, rgba(203,213,225,0.70), transparent)" }} />
              </div>
              <h2 className="text-4xl font-bold mb-4 text-slate-900" style={{ letterSpacing: "-0.03em" }}>Zacznij dziś — za darmo</h2>
              <p className="mb-10 max-w-sm mx-auto text-base text-slate-500">
                Żadnych kart kredytowych. Żadnych ukrytych opłat.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.div
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.978 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl text-slate-700"
                    style={G.innerBtn}
                  >
                    Znajdź specjalistę
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.978 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  <Link
                    href="/register?role=business"
                    className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl"
                    style={G.inkBtn}
                  >
                    Zarejestruj salon →
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
