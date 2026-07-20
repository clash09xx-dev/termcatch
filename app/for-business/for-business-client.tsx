"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

// ── Glass style constants ─────────────────────────────────────────────────────

const G = {
  card: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.50)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.40), 0 2px 4px rgba(0,0,0,0.04), 0 12px 36px rgba(100,116,139,0.10), 0 40px 80px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(203,213,225,0.10)",
  } as React.CSSProperties,
  panel: {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(32px) saturate(200%)",
    WebkitBackdropFilter: "blur(32px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.40)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.30), 0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.92)",
  } as React.CSSProperties,
  chip: {
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px) saturate(200%)",
    WebkitBackdropFilter: "blur(20px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.50)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.35), 0 2px 8px rgba(100,116,139,0.08), 0 8px 24px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.95)",
  } as React.CSSProperties,
  pill: {
    background: "rgba(255,255,255,0.68)",
    backdropFilter: "blur(16px) saturate(190%)",
    WebkitBackdropFilter: "blur(16px) saturate(190%)",
    border: "1px solid rgba(203,213,225,0.40)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 4px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
  } as React.CSSProperties,
  inkBtn: {
    background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
    border: "1px solid #0F172A",
    color: "#F8FAFC",
    boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), 0 2px 6px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.15)",
  } as React.CSSProperties,
  innerBtn: {
    background: "rgba(255,255,255,0.60)",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: "1px solid rgba(203,213,225,0.40)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.85)",
  } as React.CSSProperties,
  divider: { borderBottom: "1px solid rgba(203,213,225,0.22)" } as React.CSSProperties,
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
    "radial-gradient(ellipse 90% 70% at 50% 85%, rgba(203,213,225,0.24) 0%, transparent 60%)",
    "radial-gradient(ellipse 65% 55% at 15% 15%, rgba(148,163,184,0.18) 0%, transparent 55%)",
    "#EBF1F9",
  ].join(", "),
};

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ── Dashboard Preview Widget ──────────────────────────────────────────────────

const BOOKINGS = [
  { time: "09:00", name: "Ania K.", service: "Strzyżenie", price: "80 zł", active: true },
  { time: "10:30", name: "Marek B.", service: "Fade klasyczny", price: "60 zł", active: false },
  { time: "12:00", name: "Kasia W.", service: "Manicure", price: "90 zł", active: false },
  { time: "14:00", name: "Tomek S.", service: "Broda", price: "50 zł", active: false },
];

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Main glass card */}
      <div className="relative rounded-3xl overflow-hidden" style={G.card}>
        {/* Specular top edge */}
        <div className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-3.5" style={G.divider}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
              style={{ background: "rgba(148,163,184,0.22)", border: "1px solid rgba(148,163,184,0.32)", color: "#475569" }}>
              T
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 leading-none">Twój salon</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Panel zarządzania</p>
            </div>
          </div>
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full text-slate-500" style={G.pill}>Przykład</span>
        </div>

        {/* Bookings */}
        <div className="relative px-4 pt-3 pb-2 space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-2 text-slate-400">Harmonogram dnia</p>
          {BOOKINGS.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={b.active
                ? { background: "rgba(203,213,225,0.28)", border: "1px solid rgba(203,213,225,0.60)", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.90)" }
                : { ...G.innerBtn }
              }
            >
              <span className="text-[10px] font-mono text-slate-400 w-9 flex-shrink-0">{b.time}</span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 text-slate-600"
                style={{ background: "rgba(203,213,225,0.30)", border: "1px solid rgba(203,213,225,0.45)" }}
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
            { num: "4", label: "wizyty dziś" },
            { num: "280 zł", label: "przychód" },
            { num: "97%", label: "zajętość" },
          ].map((s) => (
            <div key={s.label} className="p-2.5 rounded-xl text-center" style={G.panel}>
              <p className="text-sm font-bold text-slate-800">{s.num}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating chip — new booking notification */}
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className="absolute -top-6 -right-5 rounded-2xl px-4 py-3"
        style={G.chip}
      >
        <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Nowa rezerwacja</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">Jutro · 11:00</p>
      </motion.div>

      {/* Floating SMS chip */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 4.0, repeat: Infinity, ease: [0.45, 0, 0.55, 1], delay: 1.5 }}
        className="absolute -bottom-5 -left-5 rounded-2xl px-4 py-3"
        style={G.chip}
      >
        <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Przypomnienie SMS</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">Wysłano do 3 klientów</p>
      </motion.div>
    </motion.div>
  );
}

// ── Feature cards data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    n: "01",
    title: "Kalendarz online 24/7",
    desc: "Klienci rezerwują sami — o dowolnej porze, bez dzwonienia. Ty dostajesz powiadomienie i Twój kalendarz jest zawsze aktualny.",
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
    title: "Mniej nieobecności",
    desc: "Automatyczne przypomnienia SMS i e-mail przed każdą wizytą. Mniej pustych slotów, więcej realnych spotkań i spokojniejszy dzień pracy.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Zarządzanie personelem",
    desc: "Każdy pracownik ma własny harmonogram, usługi i dostępność. Klienci mogą wybrać konkretną osobę lub losowego specjalistę.",
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
    title: "Płatności i depozyty",
    desc: "Przyjmuj płatności online lub depozyty przy rezerwacji. Integracja ze Stripe — pieniądze trafiają bezpośrednio do Ciebie.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    n: "05",
    title: "CRM i historia klientów",
    desc: "Pełna historia wizyt, notatki i preferencje każdego klienta. Buduj relacje i wracający biznes.",
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
    title: "Analityka i raporty",
    desc: "Przychody, popularne usługi, najlepsi klienci — dane dzienne, tygodniowe i miesięczne w jednym miejscu.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: "01", title: "Zarejestruj salon", desc: "Wypełnij formularz w 5 minut — kategoria, lokalizacja, godziny pracy." },
  { n: "02", title: "Dodaj usługi i personel", desc: "Dodaj usługi z cenami i pracowników z własnymi harmonogramami." },
  { n: "03", title: "Wyślij link klientom", desc: "Twoja strona rezerwacji gotowa. Link do bio, do SMS, do Google." },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export function ForBusinessClient() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: BG.hero }}>
      <LandingNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-start overflow-hidden px-6 pt-28 md:pt-32 pb-16">
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(203,213,225,0.35) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
            maskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, black 30%, transparent 100%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-[1fr_440px] gap-14 xl:gap-20 items-center pb-20">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium mb-9"
              style={{ ...G.pill, color: "#64748B" }}
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "#94A3B8", animation: "dot-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#CBD5E1" }} />
              </span>
              Dla właścicieli salonów i specjalistów
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl sm:text-7xl xl:text-8xl font-bold leading-[0.95] text-slate-900"
              style={{ letterSpacing: "-0.04em" }}
            >
              Mniej<br />
              telefonów.<br />
              <span className="italic font-bold" style={{
                background: "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Więcej klientów.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 text-lg max-w-md leading-relaxed text-slate-500"
            >
              Jeden link — Twoja strona rezerwacji. Klienci wybierają termin sami, Ty skupiasz się na pracy.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 mt-9"
            >
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
                  Zarejestruj salon — za darmo
                  <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.978 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
              >
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl text-slate-600"
                  style={G.innerBtn}
                >
                  Obejrzyj demo
                </Link>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-5 text-xs text-slate-500"
            >
              Bez karty kredytowej · Instalacja w 5 minut · Pierwsze 100 salonów: 3 miesiące bez opłat
            </motion.p>
          </div>

          {/* Right — dashboard preview */}
          <div className="lg:pt-0 pt-8">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <div className="grad-sep" />
      <section
        className="py-16 px-6"
        style={{
          background: [
            "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(203,213,225,0.22) 0%, transparent 65%)",
            "#EEF3FA",
          ].join(", ")
        }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { num: "Mniej", label: "telefonów dzięki rezerwacjom online" },
            { num: "24/7", label: "dostępność kalendarza" },
            { num: "5 min", label: "konfiguracja salonu" },
            { num: "3 mies.", label: "bez opłat — pierwsze 100 salonów" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fade}
              whileHover={{ y: -4, scale: 1.012 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className="relative text-center p-6 rounded-2xl overflow-hidden glass-shimmer-wrap"
              style={G.panel}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
              <p className="relative text-3xl font-bold text-slate-800 tabular-nums" style={{ letterSpacing: "-0.03em" }}>{s.num}</p>
              <p className="relative mt-1.5 text-xs text-slate-400 leading-tight">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── STEPS ────────────────────────────────────────────────── */}
      <div className="grad-sep" />
      <section
        className="py-28 px-6"
        style={{
          background: [
            "radial-gradient(ellipse 90% 70% at 50% 60%, rgba(203,213,225,0.24) 0%, transparent 65%)",
            "#EEF3FA",
          ].join(", ")
        }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} className="mb-16">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full text-slate-500" style={G.pill}>
              Jak zacząć
            </span>
            <h2 className="text-4xl font-bold text-slate-900" style={{ letterSpacing: "-0.03em" }}>
              Zacznij w trzy kroki.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
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

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <div className="grad-sep" />
      <section className="py-28 px-6" style={{ background: BG.features }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} className="mb-16">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full text-slate-500" style={G.pill}>
              Funkcje
            </span>
            <h2 className="text-4xl font-bold text-slate-900" style={{ letterSpacing: "-0.03em" }}>
              Wszystko w jednym miejscu.
            </h2>
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              Bez żadnych integracji. Bez skomplikowanej konfiguracji. Jeden panel, który zastępuje pięć narzędzi.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.n}
                initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fade}
                whileHover={{ y: -4, scale: 1.008 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="relative p-6 rounded-3xl overflow-hidden glass-shimmer-wrap"
                style={G.panel}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 text-slate-500"
                    style={G.chip}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-bold mb-2 text-slate-800">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <div className="grad-sep" />
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
            {/* Specular top */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.98) 30%, rgba(255,255,255,0.98) 70%, transparent)" }} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, rgba(203,213,225,0.70))" }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#CBD5E1", boxShadow: "0 0 0 2px rgba(203,213,225,0.30)" }} />
                <span className="h-px w-12" style={{ background: "linear-gradient(90deg, rgba(203,213,225,0.70), transparent)" }} />
              </div>

              <h2 className="text-4xl font-bold mb-4 text-slate-900" style={{ letterSpacing: "-0.03em" }}>
                Gotowy na więcej klientów?
              </h2>
              <p className="mb-10 max-w-sm mx-auto text-base text-slate-500">
                Zarejestruj salon w 5 minut i zacznij przyjmować rezerwacje online — bez karty kredytowej.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
                    Zarejestruj salon — za darmo
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.978 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl text-slate-600"
                    style={G.innerBtn}
                  >
                    Przeglądaj salony →
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
