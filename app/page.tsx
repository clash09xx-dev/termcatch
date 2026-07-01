"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

// ─── Typewriter ───────────────────────────────────────────────────────────────

const PHRASES = [
  "Podkreśl swoje piękno",
  "Znajdź idealny salon",
  "Zarezerwuj masaż dziś",
  "Odkryj najlepszego barbera",
  "Zadbaj o siebie teraz",
];

function useTypewriter(phrases: string[]) {
  const [idx, setIdx] = useState(0);
  const [txt, setTxt] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[idx];
    if (!deleting && txt.length < phrase.length) {
      const t = setTimeout(() => setTxt(phrase.slice(0, txt.length + 1)), 72);
      return () => clearTimeout(t);
    }
    if (!deleting && txt.length === phrase.length) {
      const t = setTimeout(() => setDeleting(true), 2400);
      return () => clearTimeout(t);
    }
    if (deleting && txt.length > 0) {
      const t = setTimeout(() => setTxt(txt.slice(0, -1)), 36);
      return () => clearTimeout(t);
    }
    if (deleting && txt.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % phrases.length);
    }
  }, [txt, deleting, idx, phrases]);

  return txt;
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ to, suffix }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1600, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);

  return <span ref={ref}>{val.toLocaleString("pl")}{suffix}</span>;
}

function Stat({ to, suffix, label, i }: { to: number; suffix?: string; label: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: i * 0.1 }}
      className="text-center"
    >
      <p className="text-3xl font-bold text-gray-900 tabular-nums">
        {inView ? <Counter to={to} suffix={suffix} /> : `0${suffix ?? ""}`}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </motion.div>
  );
}

// ─── Fade animation ───────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const typed = useTypewriter(PHRASES);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <LandingNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
        {/* Subtle background mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(0,0,0,0.04),transparent)]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center pt-24 pb-16">
          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium mb-10 border border-gray-200"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Dostępne w Krakowie · Wkrótce w całej Polsce
          </motion.div>

          {/* Headline — typewriter */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-gray-900"
              style={{ minHeight: "1.25em" }}
            >
              {typed}
              <span
                className="inline-block w-[3px] h-[0.8em] bg-gray-900 ml-1 align-middle rounded-sm"
                style={{ animation: "cursor-blink 1s step-end infinite" }}
              />
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed"
          >
            Platforma rezerwacji dla salonów beauty, barberów, masażystów i specjalistów.
            Bez dzwonienia — terminy dostępne w czasie rzeczywistym.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 max-w-lg mx-auto"
          >
            <div className="flex bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-100/80 overflow-hidden">
              <div className="flex-1 flex items-center px-4 gap-3">
                <svg className="w-4.5 h-4.5 text-gray-400 flex-shrink-0 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  placeholder="Fryzjer, masaż, manicure..."
                  className="w-full py-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                />
              </div>
              <Link
                href="/search"
                className="px-5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Szukaj
              </Link>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/register?role=business" className="text-sm text-gray-500 hover:text-gray-900 transition-colors underline underline-offset-4">
              Mam salon — dodaj go za darmo →
            </Link>
          </motion.div>

          {/* Value props row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {[
              { icon: "✓", text: "Rezerwacja w 30 sekund" },
              { icon: "✓", text: "Potwierdzenie na SMS" },
              { icon: "✓", text: "Bez rejestracji klienta" },
            ].map((v) => (
              <span key={v.text} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-4 h-4 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {v.icon}
                </span>
                {v.text}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOR WHO ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-gray-900">Dla kogo jest Termcatch?</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* For clients */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Dla klientów</h3>
              <p className="text-gray-500 leading-relaxed mb-6">
                Znajdź specjalistę i zarezerwuj termin w kilka sekund — bez dzwonienia, bez czekania na odpisanie. Widzisz dostępność na dziś i teraz.
              </p>
              <ul className="space-y-2.5">
                {["Terminy dostępne w czasie rzeczywistym", "Potwierdzenie SMS i e-mail", "Przypomnienie przed wizytą", "Płatność online lub na miejscu"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <span className="w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/search" className="inline-flex items-center gap-1.5 mt-7 text-sm font-semibold text-gray-900 hover:underline underline-offset-4 transition-all">
                Znajdź specjalistę
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            </motion.div>

            {/* For salons */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Dla salonów i specjalistów</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Zarządzaj kalendarzem, pracownikami i płatnościami z jednego miejsca. Klienci rezerwują sami, Ty skupiasz się na pracy.
              </p>
              <ul className="space-y-2.5">
                {["Kalendarz online 24/7", "Zarządzanie pracownikami", "Płatności i depozyty online", "CRM i historia klientów", "AI — prognozy i automatyzacja"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register?role=business" className="inline-flex items-center gap-1.5 mt-7 text-sm font-semibold text-white hover:text-white/80 transition-colors">
                Zarejestruj salon za darmo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900">Jak to działa?</h2>
            <p className="mt-3 text-gray-500 max-w-sm mx-auto">Prosto, szybko, bez dzwonienia.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.7%+1rem)] right-[calc(16.7%+1rem)] h-px bg-gray-200" />

            {[
              {
                n: "01",
                title: "Wyszukaj",
                desc: "Wpisz usługę, kategorię lub nazwę. Widzisz dostępność na dziś i teraz — bez dzwonienia.",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
              },
              {
                n: "02",
                title: "Wybierz termin",
                desc: "Wolne sloty w czasie rzeczywistym. Filtruj po pracowniku, usłudze, dacie i cenie.",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                ),
              },
              {
                n: "03",
                title: "Potwierdź",
                desc: "Rezerwacja w kilka sekund. Potwierdzenie i przypomnienie automatycznie na SMS i e-mail.",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                custom={i} variants={fadeUp}
                className="text-center"
              >
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm text-gray-700 mb-5">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 border-t border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-4 block">Panel specjalisty</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-snug">
                Zarządzaj wszystkim<br />z jednego miejsca
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8 text-base">
                Kalendarz, klienci, płatności i analityka w jednym dashboardzie. Mniej czasu na administrację, więcej na pracę z klientem.
              </p>

              <div className="space-y-4 mb-9">
                {[
                  { title: "Kalendarz online 24/7", desc: "Klienci rezerwują sami, o każdej porze — Ty dostajesz powiadomienie." },
                  { title: "Zero no-show", desc: "Automatyczne przypomnienia SMS i e-mail przed każdą wizytą." },
                  { title: "Analityka i przychody", desc: "Raporty dzienne, tygodniowe i miesięczne. Zawsze wiesz, jak idzie." },
                ].map(f => (
                  <div key={f.title} className="flex gap-4">
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Link href="/register?role=business" className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors">
                  Zarejestruj salon
                </Link>
                <Link href="/for-business" className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 transition-colors">
                  Dowiedz się więcej →
                </Link>
              </div>
            </motion.div>

            {/* Dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 36 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-gray-200/60 overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-400 font-mono">termcatch.com/dashboard</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Panel salonu</p>
                      <p className="text-xs text-gray-400 mt-0.5">Poniedziałek, 30 Czerwca</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Na żywo
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: "Wizyty dziś", v: "—" },
                      { l: "Przychód", v: "—" },
                      { l: "No-show", v: "—" },
                      { l: "Ocena", v: "—" },
                    ].map(s => (
                      <div key={s.l} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-sm font-bold text-gray-300">{s.v}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Calendar placeholder */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">Harmonogram — Dziś</p>
                    <div className="space-y-1.5">
                      {[
                        { t: "09:00", c: "border-l-amber-300 bg-amber-50" },
                        { t: "11:00", c: "border-l-rose-300 bg-rose-50" },
                        { t: "14:30", c: "border-l-sky-300 bg-sky-50" },
                      ].map((a, i) => (
                        <div key={i} className={`flex gap-3 items-center px-3 py-2.5 rounded-lg border-l-2 ${a.c}`}>
                          <span className="text-xs font-mono text-gray-400 w-10">{a.t}</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded animate-pulse" />
                        </div>
                      ))}
                      <div className="flex items-center justify-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl mt-2">
                        Twoje wizyty pojawią się tutaj po aktywacji
                      </div>
                    </div>
                  </div>

                  {/* AI tip */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">AI Asystent</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">Aktywuj salon, żeby zobaczyć spersonalizowane sugestie dla Twojego biznesu.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating chips */}
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3"
              >
                <p className="text-[10px] text-gray-400">Nowa rezerwacja</p>
                <p className="text-sm font-bold text-gray-900">Dziś · 15:30</p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3"
              >
                <p className="text-[10px] text-gray-400">Przypomnienie wysłane</p>
                <p className="text-sm font-bold text-gray-900">SMS · 3 klientów</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── NUMBERS ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { to: 30, suffix: " sek", label: "Średni czas rezerwacji" },
            { to: 0, suffix: " zł", label: "Koszt rejestracji salonu" },
            { to: 24, suffix: "/7", label: "Dostępność kalendarza" },
            { to: 100, suffix: "%", label: "Polskie wsparcie techniczne" },
          ].map((s, i) => <Stat key={s.label} to={s.to} suffix={s.suffix} label={s.label} i={i} />)}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative bg-gray-900 rounded-3xl p-14 text-center overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }}
            />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">Zacznij dziś — za darmo</h2>
              <p className="text-gray-400 mb-10 max-w-md mx-auto text-base">
                Dodaj swój salon lub zarezerwuj wizytę. Bez kart kredytowych, bez ukrytych opłat.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/search" className="px-7 py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm rounded-xl transition-colors">
                  Znajdź specjalistę
                </Link>
                <Link href="/register?role=business" className="px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white font-medium text-sm rounded-xl border border-white/10 transition-colors">
                  Zarejestruj salon →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />

      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
