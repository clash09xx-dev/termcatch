import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cennik — o połowę taniej niż Booksy",
  description:
    "Przejrzysty cennik Termcatch: plany od 39 zł/mies., 0% prowizji od wizyt. Pierwsze 100 salonów — 3 miesiące bez opłat.",
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

const silverBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
  color: "#0F172A",
  boxShadow:
    "0 0 0 0.5px rgba(148,163,184,0.45), 0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
  border: "1px solid rgba(148,163,184,0.45)",
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
    price: "39 zł",
    period: "miesięcznie",
    desc: "Dla niezależnych specjalistów — fryzjer, barber, kosmetolog, masażysta pracujący na własny rachunek.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=solo",
    highlight: false,
    features: [
      "1 specjalista",
      "Nieograniczone rezerwacje",
      "Publiczny profil salonu",
      "Powiadomienia e-mail dla klientów",
      "Kalendarz i zarządzanie grafikiem",
      "CRM i historia klientów",
      "0% prowizji od wizyt",
    ],
    missing: ["Zespół i wiele stanowisk", "Płatności i zaliczki online", "Pełna analityka"],
  },
  {
    name: "Zespół",
    price: "89 zł",
    period: "miesięcznie",
    desc: "Dla małych salonów. Do 5 stanowisk, płatności online i pełne przypomnienia.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=team",
    highlight: true,
    features: [
      "Do 5 specjalistów",
      "Wszystko z planu Solo",
      "Płatności i zaliczki online (Stripe)",
      "Analityka i raporty",
      "Kupony i promocje",
      "Ochrona przed no-show",
      "Wsparcie priorytetowe",
    ],
    missing: [],
  },
  {
    name: "Salon Pro",
    price: "149 zł",
    period: "miesięcznie",
    desc: "Dla większych salonów i sieci. Bez limitu stanowisk, AI i dedykowana opieka.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=pro",
    highlight: false,
    features: [
      "Nieograniczona liczba specjalistów",
      "Wszystko z planu Zespół",
      "AI Asystent (analiza obłożenia)",
      "Wiele lokalizacji",
      "Faktury i eksporty księgowe",
      "Dedykowany opiekun i onboarding",
    ],
    missing: [],
  },
];

const FAQ = [
  {
    q: "Na czym polega oferta startowa?",
    a: "Pierwsze 100 salonów, które zarejestrują się w Termcatch, korzysta z pełnego planu przez 3 miesiące całkowicie bez opłat — bez karty, bez zobowiązań.",
  },
  {
    q: "Czym różnicie się od Booksy?",
    a: "Nasze plany są około o połowę tańsze, nie pobieramy prowizji od wizyt ani opłat za pozyskanie klienta, którego już masz.",
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
    a: "Integrujemy się ze Stripe. Pieniądze za wizyty trafiają bezpośrednio na Twoje konto — Termcatch nie pobiera od nich żadnej prowizji.",
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

function CrossIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(148,163,184,0.40)"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
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
              O połowę taniej niż{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #94A3B8 0%, #64748B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Booksy.
              </span>
            </h1>
            <p className="text-lg" style={{ color: "#64748B" }}>
              Jedna przewidywalna stawka. 0% prowizji od wizyt. Bez ukrytych opłat.
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
                  background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
                  color: "#0F172A",
                  border: "1px solid rgba(148,163,184,0.45)",
                  borderRadius: "0.75rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
                }}
              >
                Odbierz ofertę
              </Link>
            </div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6 mb-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="p-8 flex flex-col glass-shimmer-wrap"
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
                    Najpopularniejszy
                  </div>
                )}

                <div className="mb-6">
                  <h2
                    className="text-lg font-bold mb-2"
                    style={{ letterSpacing: "-0.02em", color: "#0F172A" }}
                  >
                    {plan.name}
                  </h2>
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
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckIcon highlight={plan.highlight} />
                      <span style={{ color: plan.highlight ? "#0F172A" : "#475569" }}>{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <CrossIcon />
                      <span style={{ color: "#CBD5E1" }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={plan.href}
                  className="btn-spring glass-shimmer-wrap"
                  style={plan.highlight ? silverBtn : ghostBtn}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

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
