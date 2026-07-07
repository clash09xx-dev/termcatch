"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

// ── Dark glass style helpers ──────────────────────────────────────────────────

const G = {
  card: {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(32px) saturate(200%)",
    WebkitBackdropFilter: "blur(32px) saturate(200%)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.50), 0 8px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.13)",
  } as React.CSSProperties,
  panel: {
    background: "rgba(255,255,255,0.065)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.11)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)",
  } as React.CSSProperties,
  chip: {
    background: "rgba(255,255,255,0.10)",
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.17)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
  } as React.CSSProperties,
  pill: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
  } as React.CSSProperties,
  input: {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.90)",
  } as React.CSSProperties,
  innerBtn: {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.10)",
  } as React.CSSProperties,
  divider: { borderBottom: "1px solid rgba(255,255,255,0.09)" } as React.CSSProperties,
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
      {/* ── Main glass card ── */}
      <div className="relative rounded-3xl overflow-hidden" style={G.card}>
        {/* Prismatic top layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center gap-3 px-5 py-4" style={G.divider}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "rgba(212,160,23,0.20)", border: "1px solid rgba(212,160,23,0.28)", color: "#D4A017" }}
          >
            T
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.88)" }}>Twój salon</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>Tak klienci widzą Twój profil</p>
          </div>
          <span className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0" style={{ ...G.pill, color: "rgba(255,255,255,0.55)" }}>
            Podgląd
          </span>
        </div>

        <div className="relative px-5 pt-4 pb-5 space-y-4">
          {/* Services */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>Usługa</p>
            <div className="space-y-1.5">
              {SERVICES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSvc(i)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150"
                  style={svc === i
                    ? { background: "rgba(212,160,23,0.18)", border: "1px solid rgba(212,160,23,0.28)", color: "rgba(255,255,255,0.90)" }
                    : { ...G.innerBtn, color: "rgba(255,255,255,0.60)" }
                  }
                >
                  <span className="font-medium text-left">{s.name}</span>
                  <span className="text-xs flex-shrink-0 ml-2" style={{ color: svc === i ? "rgba(212,160,23,0.70)" : "rgba(255,255,255,0.30)" }}>
                    {s.dur} · <span className="font-semibold">{s.price}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>Termin</p>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { setDay(i); setSlot(null); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={day === i
                    ? { background: "rgba(212,160,23,0.18)", border: "1px solid rgba(212,160,23,0.28)", color: "#D4A017" }
                    : { ...G.innerBtn, color: "rgba(255,255,255,0.40)" }
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
                  ? { background: "rgba(212,160,23,0.18)", border: "1px solid rgba(212,160,23,0.28)", color: "#D4A017" }
                  : { ...G.innerBtn, color: "rgba(255,255,255,0.40)" }
                }
              >
                {s}
              </button>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/register"
            className="flex items-center justify-center w-full py-3 text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:scale-[1.01]"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 16px rgba(0,0,0,0.30)",
            }}
          >
            {slot !== null ? `Zarezerwuj na ${SLOTS[slot]}` : "Wybierz godzinę"}
          </Link>
        </div>
      </div>

      {/* ── Floating glass chips ── */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-5 -right-5 rounded-2xl px-4 py-3 hidden sm:block"
        style={G.chip}
      >
        <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>Nowa rezerwacja</p>
        <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.90)" }}>Dziś · 15:30</p>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-5 -left-5 rounded-2xl px-4 py-3 hidden sm:block"
        style={G.chip}
      >
        <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>Powiadomienie wysłane</p>
        <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.90)" }}>Wizyta potwierdzona</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Counter ─────────────────────────────────────────────────────────────────

function Counter({ to, suffix }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useState(() => { if (!inView) return; });
  if (typeof window !== "undefined" && inView && val === 0) {
    let start = 0;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1400, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
  return <span ref={ref}>{val.toLocaleString("pl")}{suffix}</span>;
}

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
};

// ─── Hero Search ─────────────────────────────────────────────────────────────

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
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(255,255,255,0.30)" }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Fryzjer, masaż, manicure…"
          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all"
          style={{ ...G.input, "::placeholder": { color: "rgba(255,255,255,0.30)" } } as React.CSSProperties}
        />
      </div>
      <div className="relative sm:w-40">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(255,255,255,0.30)" }}>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
        <input
          type="text" value={city} onChange={(e) => setCity(e.target.value)}
          placeholder="Miasto"
          className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all"
          style={G.input}
        />
      </div>
      <button
        type="submit"
        className="px-6 py-3.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 flex-shrink-0 hover:scale-[1.02]"
        style={{
          background: "rgba(212,160,23,0.22)",
          border: "1px solid rgba(212,160,23,0.35)",
          color: "#E6BC43",
          boxShadow: "0 4px 20px rgba(212,160,23,0.15), inset 0 1px 0 rgba(212,160,23,0.25)",
        }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        Szukaj
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Fryzjer", slug: "hair_salon" },
  { label: "Barber", slug: "barbershop" },
  { label: "Masaż", slug: "massage" },
  { label: "Manicure", slug: "nail_salon" },
  { label: "Kosmetyczka", slug: "beauty_salon" },
  { label: "Tatuaż", slug: "tattoo" },
  { label: "Spa & wellness", slug: "spa" },
];

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "Termcatch", url: "https://termcatch.com", logo: "https://termcatch.com/opengraph-image", email: "hello@termcatch.com", description: "Polska platforma rezerwacji online dla salonów beauty i wellness.", areaServed: "PL" },
    { "@type": "WebSite", name: "Termcatch", url: "https://termcatch.com", inLanguage: "pl-PL", potentialAction: { "@type": "SearchAction", target: "https://termcatch.com/search?q={search_term_string}", "query-input": "required name=search_term_string" } },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#0b0d12", color: "rgba(255,255,255,0.88)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }} />
      <LandingNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden px-6 pt-16"
        style={{ background: "radial-gradient(ellipse 90% 70% at 75% -5%, rgba(212,160,23,0.18) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at -5% 75%, rgba(212,160,23,0.09) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 120%, rgba(212,160,23,0.05) 0%, transparent 50%), #0b0d12" }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-[1fr_480px] gap-14 xl:gap-20 items-center py-20">
          {/* Left */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-9"
              style={{ background: "rgba(212,160,23,0.14)", border: "1px solid rgba(212,160,23,0.28)", color: "#D4A017" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
              Wersja testowa · platforma w budowie — możesz już testować
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl sm:text-7xl xl:text-8xl font-bold leading-[1.0] tracking-tight"
              style={{ color: "rgba(255,255,255,0.94)" }}
            >
              Rezerwuj<br />
              bez<br />
              <span className="italic font-bold" style={{ color: "rgba(255,255,255,0.70)" }}>telefonu.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 text-lg max-w-md leading-relaxed"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Jeden link do salonu. Klienci wybierają termin sami — Ty dostajesz powiadomienie i gotowe.
            </motion.p>

            {/* Glass category pills */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-2 mt-8"
            >
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/search?category=${c.slug}`}
                  className="px-3.5 py-1.5 rounded-full text-sm transition-all duration-150 hover:scale-[1.03]"
                  style={{ ...G.pill, color: "rgba(255,255,255,0.60)" }}
                >
                  {c.label}
                </Link>
              ))}
            </motion.div>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-9"
            >
              <HeroSearch />
              <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>
                Lub{" "}
                <Link href="/register?role=business" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
                  dodaj salon za darmo →
                </Link>
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-xs"
              style={{ color: "rgba(255,255,255,0.22)" }}
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
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "rgba(255,255,255,0.20)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section
        className="py-28 px-6"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,160,23,0.07) 0%, transparent 65%), #0e1016" }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} className="mb-16">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
              style={{ ...G.pill, color: "rgba(255,255,255,0.45)" }}
            >
              Jak to działa
            </span>
            <h2 className="text-4xl font-bold" style={{ color: "rgba(255,255,255,0.90)" }}>Trzy kroki. Nic więcej.</h2>
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
                className="relative p-7 rounded-3xl overflow-hidden"
                style={G.panel}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold mb-5 relative" style={G.chip}>
                    <span style={{ color: "rgba(255,255,255,0.60)" }}>{step.n}</span>
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
                      style={{ background: "rgba(212,160,23,0.90)" }}>
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "rgba(255,255,255,0.88)" }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR BUSINESS ─────────────────────────────────────────── */}
      <section
        className="py-28 px-6"
        style={{ background: "radial-gradient(ellipse 80% 55% at 30% 50%, rgba(212,160,23,0.08) 0%, transparent 60%), #0c0f15" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Dark glass feature card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-3xl p-10 overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.09)",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.40), transparent)" }} />

              <div className="relative">
                <span className="text-xs font-semibold uppercase tracking-widest block mb-6" style={{ color: "rgba(255,255,255,0.28)" }}>Panel specjalisty</span>
                <h2 className="text-3xl font-bold leading-snug mb-5" style={{ color: "rgba(255,255,255,0.90)" }}>
                  Mniej administracji.<br />Więcej klientów.
                </h2>
                <p className="text-sm leading-relaxed mb-9" style={{ color: "rgba(255,255,255,0.40)" }}>
                  Kalendarz online, zarządzanie personelem, płatności i analityka — w jednym miejscu.
                </p>
                <div className="space-y-3 mb-10">
                  {["Kalendarz online 24/7", "Automatyczne przypomnienia SMS", "Zarządzanie pracownikami", "Płatności i depozyty", "CRM i historia klientów", "Analityka i raporty"].map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "#D4A017" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/register?role=business"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(212,160,23,0.18)",
                    border: "1px solid rgba(212,160,23,0.32)",
                    color: "#E6BC43",
                    boxShadow: "0 4px 20px rgba(212,160,23,0.12), inset 0 1px 0 rgba(212,160,23,0.20)",
                  }}
                >
                  Zarejestruj salon — za darmo
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                </Link>
              </div>
            </motion.div>

            {/* Glass feature cards */}
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} className="space-y-4 lg:pt-2">
              <h3 className="text-2xl font-bold mb-6" style={{ color: "rgba(255,255,255,0.88)" }}>Dlaczego Termcatch?</h3>
              {[
                { n: "01", title: "Zero no-show", desc: "Automatyczne przypomnienia SMS i e-mail przed każdą wizytą drastycznie redukują nieobecności." },
                { n: "02", title: "Rezerwacje o każdej porze", desc: "Klienci bookują o 2 w nocy, w weekend, w czasie pracy — bez Twojego udziału." },
                { n: "03", title: "Jeden link", desc: "Twoja strona rezerwacji gotowa od razu. Wystarczy wysłać link klientom lub dodać go do bio." },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fade}
                  className="relative flex gap-4 p-5 rounded-2xl overflow-hidden"
                  style={G.panel}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
                  <div className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={G.chip}>
                    <span style={{ color: "rgba(255,255,255,0.50)" }}>{f.n}</span>
                  </div>
                  <div className="relative">
                    <p className="text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>{f.title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
              <Link href="/for-business" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity mt-2" style={{ color: "rgba(255,255,255,0.50)" }}>
                Wszystkie funkcje dla salonów
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── NUMBERS ──────────────────────────────────────────────── */}
      <section
        className="py-20 px-6"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,160,23,0.06) 0%, transparent 60%), #0e1016" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { num: "30s", label: "Średni czas rezerwacji" },
            { num: "0 zł", label: "Koszt rejestracji" },
            { num: "24/7", label: "Dostępność kalendarza" },
            { num: "100%", label: "Polskie wsparcie" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fade}
              className="relative text-center p-6 rounded-2xl overflow-hidden"
              style={G.panel}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
              <p className="relative text-3xl font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.90)" }}>{s.num}</p>
              <p className="relative mt-1.5 text-xs leading-tight" style={{ color: "rgba(255,255,255,0.36)" }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: "#0b0d12" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl p-14 text-center overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.09)",
            }}
          >
            {/* Grid pattern */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            {/* Gold top glow */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.50), transparent)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-24 rounded-full blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(212,160,23,0.14) 0%, transparent 70%)" }} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="h-px w-10" style={{ background: "rgba(212,160,23,0.40)" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                <span className="h-px w-10" style={{ background: "rgba(212,160,23,0.40)" }} />
              </div>
              <h2 className="text-4xl font-bold mb-4" style={{ color: "rgba(255,255,255,0.90)" }}>Zacznij dziś — za darmo</h2>
              <p className="mb-10 max-w-sm mx-auto text-base" style={{ color: "rgba(255,255,255,0.38)" }}>
                Żadnych kart kredytowych. Żadnych ukrytych opłat.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "rgba(255,255,255,0.88)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 20px rgba(0,0,0,0.20)",
                  }}
                >
                  Znajdź specjalistę
                </Link>
                <Link
                  href="/register?role=business"
                  className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-sm rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(212,160,23,0.18)",
                    border: "1px solid rgba(212,160,23,0.32)",
                    color: "#E6BC43",
                    boxShadow: "0 4px 20px rgba(212,160,23,0.12), inset 0 1px 0 rgba(212,160,23,0.20)",
                  }}
                >
                  Zarejestruj salon →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
