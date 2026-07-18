import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cennik — tańsza alternatywa dla salonów",
  description:
    "Przejrzysty cennik Termcatch: cztery plany od 99 zł/mies. Pierwsze 100 salonów — 3 miesiące bez opłat.",
  alternates: { canonical: "/pricing" },
};

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.55)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.45), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.09), 0 20px 48px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(203,213,225,0.10)",
  borderRadius: "1.25rem",
};

const cardHighlight: React.CSSProperties = {
  background: "rgba(241,246,251,0.92)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1.5px solid rgba(148,163,184,0.60)",
  boxShadow:
    "0 0 0 0.5px rgba(148,163,184,0.50), 0 2px 4px rgba(0,0,0,0.05), 0 12px 36px rgba(100,116,139,0.14), 0 40px 80px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(203,213,225,0.15)",
  borderRadius: "1.5rem",
  transform: "scale(1.025)",
};

const inkBtn: React.CSSProperties = {
  background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
  color: "#F8FAFC",
  boxShadow:
    "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
  border: "1px solid #0F172A",
  borderRadius: "0.75rem",
  padding: "0.75rem 0",
  width: "100%",
  textAlign: "center" as const,
  fontSize: "0.875rem",
  fontWeight: 600,
  display: "block",
  transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
};

const ghostBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.70)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(203,213,225,0.55)",
  borderRadius: "0.75rem",
  padding: "0.75rem 0",
  width: "100%",
  textAlign: "center" as const,
  color: "#0F172A",
  fontSize: "0.875rem",
  fontWeight: 600,
  display: "block",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)",
  transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
};

const divider: React.CSSProperties = {
  height: "1px",
  background:
    "linear-gradient(90deg, transparent 0%, rgba(203,213,225,0.55) 20%, rgba(203,213,225,0.55) 80%, transparent 100%)",
};

import React from "react";

const PLANS = [
  {
    name: "Solo",
    oldPrice: "139 zł",
    price: "99 zł",
    period: "miesiąc",
    desc: "Dla specjalisty prowadzącego jednoosobowy salon.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=solo",
    highlight: false,
    features: [
      "Dla jednoosobowej działalności",
      "1 specjalista",
      "1 lokalizacja",
      "Podstawowe funkcje rezerwacji",
      "Kalendarz i zarządzanie wizytami",
      "Profil salonu w TermCatch",
      "20% od pierwszej wizyty",
    ],
  },
  {
    name: "Zespół",
    oldPrice: "249 zł",
    price: "199 zł",
    period: "miesiąc",
    desc: "Dla małych zespołów w jednej lokalizacji.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=team",
    highlight: false,
    features: [
      "Wszystko, co w planie Solo",
      "Maksymalnie 4 specjalistów",
      "1 lokalizacja",
      "Comiesięczne raporty",
      "Zarządzanie zespołem",
      "20% od pierwszej wizyty",
    ],
  },
  {
    name: "Salon Pro",
    oldPrice: "439 zł",
    price: "369 zł",
    period: "miesiąc",
    desc: "Dla rozwijających się salonów z większym zespołem.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=pro",
    highlight: true,
    features: [
      "Wszystko, co w planie Zespół",
      "Do 15 specjalistów",
      "Do 2 lokalizacji",
      "Podstawowy Asystent AI",
      "Priorytetowa pomoc w nagłych sytuacjach",
      "20% od pierwszej wizyty",
    ],
  },
  {
    name: "Ultimate",
    oldPrice: "799 zł",
    price: "499 zł",
    period: "miesiąc",
    desc: "Dla sieci salonów i zespołów bez limitów.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=ultimate",
    highlight: false,
    features: [
      "Wszystko, co w planie Salon Pro",
      "Nielimitowana liczba specjalistów",
      "Nielimitowana liczba lokalizacji",
      "Asystent AI bez limitu",
      "Priorytetowa pomoc w nagłych sytuacjach",
      "20% od pierwszej wizyty",
    ],
  },
];

const FAQ = [
  {
    q: "Na czym polega oferta startowa?",
    a: "Pierwsze 100 salonów, które zarejestrują się w Termcatch, korzysta z pełnego planu przez 3 miesiące całkowicie bez opłat — bez karty, bez zobowiązań.",
  },
  {
    q: "Dlaczego Termcatch?",
    a: "Płacisz jedną przewidywalną stawkę za plan. Nie pobieramy opłat za pozyskanie klienta, którego już masz, a wszystkie najważniejsze narzędzia salonu są w jednym miejscu.",
  },
  {
    q: "Czy jest ukryta opłata za instalację?",
    a: "Nie. Rejestracja i konfiguracja są bezpłatne. Płacisz tylko za wybrany plan — i tylko wtedy, kiedy chcesz.",
  },
  {
    q: "Czy mogę zmienić plan w dowolnym momencie?",
    a: "Tak. Upgrade działa natychmiast, downgrade — od następnego okresu rozliczeniowego. Możesz też zrezygnować w każdej chwili, bez okresu wypowiedzenia.",
  },
  {
    q: "Jak działają płatności online?",
    a: "Integrujemy się ze Stripe. Pieniądze za wizyty trafiają bezpośrednio na Twoje konto. Opłata 20% dotyczy wyłącznie pierwszej wizyty nowego klienta pozyskanego przez TermCatch.",
  },
];

function CheckIcon({ highlight }: { highlight: boolean }) {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke={highlight ? "#64748B" : "#94A3B8"}
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "rgba(203,213,225,0.28)",
                border: "1px solid rgba(203,213,225,0.50)",
                color: "#64748B",
              }}
            >
              Cennik
            </div>
            <h1
              className="text-5xl font-bold mb-4"
              style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
            >
              Tańsza alternatywa{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                dla salonów.
              </span>
            </h1>
            <p className="text-lg" style={{ color: "#64748B" }}>
              Jedna przewidywalna stawka. Bez ukrytych opłat.
            </p>
          </div>

          {/* Launch offer banner */}
          <div className="max-w-3xl mx-auto mb-16">
            <div
              className="px-6 py-5 sm:px-8 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left glass-shimmer-wrap"
              style={{
                background: "rgba(241,246,251,0.90)",
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                border: "1px solid rgba(148,163,184,0.45)",
                borderRadius: "1.25rem",
                boxShadow:
                  "0 0 0 0.5px rgba(148,163,184,0.35), 0 4px 16px rgba(100,116,139,0.10), inset 0 1px 0 rgba(255,255,255,1)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "rgba(203,213,225,0.45)", border: "1px solid rgba(203,213,225,0.55)" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-base" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
                  Oferta startowa: pierwsze 100 salonów — 3 miesiące bez opłat
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                  Pełny plan, zero kosztów, bez karty. Wystarczy rejestracja salonu.
                </p>
              </div>
              <Link
                href="/register?role=business"
                className="btn-spring glass-shimmer-wrap whitespace-nowrap px-5 py-2.5 text-sm font-semibold"
                style={{
                  background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
                  color: "#F8FAFC",
                  border: "1px solid #0F172A",
                  borderRadius: "0.75rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                Odbierz ofertę
              </Link>
            </div>
          </div>

          {/* Plans — 1 col mobile, 2×2 tablet, 4 in a row on wide desktop */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-4 mb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="p-8 xl:p-6 flex flex-col glass-shimmer-wrap"
                style={plan.highlight ? cardHighlight : card}
              >
                {plan.highlight && (
                  <div
                    className="inline-flex items-center self-start px-2.5 py-1 rounded-lg text-xs font-semibold mb-5"
                    style={{
                      background: "rgba(148,163,184,0.20)",
                      border: "1px solid rgba(148,163,184,0.35)",
                      color: "#475569",
                    }}
                  >
                    Najczęściej wybierany
                  </div>
                )}

                <div className="mb-6">
                  <h2
                    className="text-lg font-bold mb-2"
                    style={{ letterSpacing: "-0.02em", color: "#0F172A" }}
                  >
                    {plan.name}
                  </h2>
                  <p
                    className="text-sm font-medium tabular-nums"
                    style={{ color: "#94A3B8", textDecoration: "line-through", textDecorationColor: "rgba(148,163,184,0.7)" }}
                    aria-label={`Cena regularna ${plan.oldPrice}`}
                  >
                    {plan.oldPrice}
                  </p>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span
                      className="text-4xl font-bold"
                      style={{
                        letterSpacing: "-0.04em",
                        background: plan.highlight
                          ? "linear-gradient(135deg, #475569 0%, #94A3B8 100%)"
                          : "none",
                        WebkitBackgroundClip: plan.highlight ? "text" : "unset",
                        WebkitTextFillColor: plan.highlight ? "transparent" : "#0F172A",
                        backgroundClip: plan.highlight ? "text" : "unset",
                        color: plan.highlight ? "transparent" : "#0F172A",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm" style={{ color: "#94A3B8" }}>
                      / {plan.period}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                    {plan.desc}
                  </p>
                </div>

                <div className="divider mb-6" style={divider} />

                <div className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5"><CheckIcon highlight={plan.highlight} /></span>
                      <span style={{ color: plan.highlight ? "#0F172A" : "#475569" }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={plan.href}
                  className="btn-spring glass-shimmer-wrap"
                  style={plan.highlight ? inkBtn : ghostBtn}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Commission note */}
          <p className="text-center text-sm mb-6" style={{ color: "#94A3B8" }}>
            Opłata dotyczy pierwszej wizyty nowego klienta pozyskanego przez TermCatch.
          </p>

          <div style={{ ...divider, margin: "4rem 0" }} />

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2
              className="text-2xl font-bold mb-8 text-center"
              style={{ letterSpacing: "-0.03em", color: "#0F172A" }}
            >
              Najczęstsze pytania
            </h2>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="p-6 glass-shimmer-wrap"
                  style={card}
                >
                  <p
                    className="font-semibold mb-2 text-sm"
                    style={{ color: "#0F172A", letterSpacing: "-0.01em" }}
                  >
                    {item.q}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
                Masz pytania? Odpiszemy w ciągu godziny.
              </p>
              <Link
                href="/contact"
                className="text-sm font-semibold btn-spring"
                style={{ color: "#475569" }}
              >
                Napisz do nas →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
