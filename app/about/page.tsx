import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O nas — Termcatch",
  description: "Poznaj historię i misję Termcatch — platformy rezerwacji online dla polskiego rynku beauty.",
};

const G = {
  bg: [
    "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
    "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
    "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
  ].join(", "),
  card: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)" as string,
    border: "1px solid rgba(203,213,225,0.55)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.45), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.09), 0 20px 48px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(203,213,225,0.10)",
    borderRadius: "1.25rem",
  } as React.CSSProperties,
  panel: {
    background: "rgba(241,246,251,0.85)",
    backdropFilter: "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)" as string,
    border: "1px solid rgba(203,213,225,0.50)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.40), 0 2px 4px rgba(0,0,0,0.04), 0 12px 36px rgba(100,116,139,0.10), inset 0 1px 0 rgba(255,255,255,1)",
    borderRadius: "1.5rem",
  } as React.CSSProperties,
  btn: {
    background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
    color: "#0F172A",
    boxShadow:
      "0 0 0 0.5px rgba(148,163,184,0.45), 0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
    border: "1px solid rgba(148,163,184,0.45)",
    borderRadius: "0.75rem",
    padding: "0.75rem 1.75rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
  } as React.CSSProperties,
  divider: {
    height: "1px",
    background:
      "linear-gradient(90deg, transparent 0%, rgba(203,213,225,0.55) 20%, rgba(203,213,225,0.55) 80%, transparent 100%)",
    margin: "4rem 0",
  } as React.CSSProperties,
};

import React from "react";

const VALUES = [
  {
    title: "Prostota",
    desc: "Instalacja w 5 minut. Bez IT, bez szkoleń, bez komplikacji. Twój salon online tego samego dnia.",
  },
  {
    title: "Polskie wsparcie",
    desc: "Odbieramy telefon. Rozumiemy lokalny rynek i specyfikę polskich salonów beauty.",
  },
  {
    title: "Fair pricing",
    desc: "Zaczynasz za darmo. Płacisz tylko gdy Twój biznes rośnie razem z nami. 0% prowizji od wizyt.",
  },
];

const STATS = [
  { value: "24/7", label: "Rezerwacje online" },
  { value: "0%", label: "Prowizji od wizyt" },
  { value: "5 min", label: "Czas konfiguracji" },
  { value: "100%", label: "Polskie wsparcie" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: G.bg }}>
      <LandingNav />

      {/* Hero */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(203,213,225,0.28)",
              border: "1px solid rgba(203,213,225,0.50)",
              color: "#64748B",
            }}
          >
            O nas
          </div>
          <h1
            className="text-5xl sm:text-6xl font-bold leading-[1.05] mb-6"
            style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
          >
            Rezerwacje bez telefonu.
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #94A3B8 0%, #64748B 50%, #94A3B8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Budujemy to dla Polski.
            </span>
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: "#64748B" }}>
            Termcatch powstał z prostej obserwacji: właściciele salonów tracą godziny dziennie
            na odbieranie telefonów, a klienci frustrują się brakiem dostępności online.
            Postanowiliśmy to zmienić.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 mb-20">
        <div className="max-w-4xl mx-auto">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-px"
            style={{
              background: "rgba(203,213,225,0.35)",
              border: "1px solid rgba(203,213,225,0.45)",
              borderRadius: "1.25rem",
              overflow: "hidden",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.value}
                className="px-6 py-6 text-center"
                style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(40px)" }}
              >
                <div
                  className="text-3xl font-bold mb-1"
                  style={{
                    letterSpacing: "-0.03em",
                    background: "linear-gradient(135deg, #475569 0%, #94A3B8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-xs font-medium" style={{ color: "#94A3B8" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={G.divider} className="max-w-4xl mx-auto" />

      {/* Mission + For whom */}
      <div className="px-6 mb-20">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div style={G.card} className="p-8 glass-shimmer-wrap">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "rgba(203,213,225,0.35)", border: "1px solid rgba(203,213,225,0.50)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 3.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ letterSpacing: "-0.03em", color: "#0F172A" }}>
              Nasza misja
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Chcemy sprawić, żeby każdy salon w Polsce — niezależnie od wielkości — miał dostęp
              do profesjonalnego systemu rezerwacji online. Bez skomplikowanej konfiguracji,
              bez drogich abonamentów, bez pośredników.
            </p>
          </div>

          <div style={G.card} className="p-8 glass-shimmer-wrap">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "rgba(203,213,225,0.35)", border: "1px solid rgba(203,213,225,0.50)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ letterSpacing: "-0.03em", color: "#0F172A" }}>
              Dla kogo
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Budujemy dla fryzjerów, barberów, kosmetyczek, masażystów, tatuatorów
              i wszystkich specjalistów, którzy chcą skupić się na pracy,
              a nie na administracji.
            </p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="px-6 mb-20">
        <div className="max-w-4xl mx-auto">
          <div style={G.panel} className="p-10">
            <h2
              className="text-2xl font-bold mb-8 text-center"
              style={{ letterSpacing: "-0.03em", color: "#0F172A" }}
            >
              Co nas wyróżnia
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {VALUES.map((v, i) => (
                <div
                  key={v.title}
                  className="p-5 glass-shimmer-wrap"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(203,213,225,0.45)",
                    borderRadius: "1rem",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.90)",
                  }}
                >
                  <div
                    className="text-xs font-bold mb-3 uppercase tracking-widest"
                    style={{ color: "#94A3B8" }}
                  >
                    0{i + 1}
                  </div>
                  <h3
                    className="font-bold mb-2"
                    style={{ letterSpacing: "-0.02em", color: "#0F172A" }}
                  >
                    {v.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={G.divider} className="max-w-4xl mx-auto" />

      {/* CTA */}
      <div className="px-6 pb-28 text-center">
        <div className="max-w-xl mx-auto">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ letterSpacing: "-0.03em", color: "#0F172A" }}
          >
            Masz pytania?
          </h2>
          <p className="mb-8 text-sm" style={{ color: "#64748B" }}>
            Napisz do nas — odpiszemy w ciągu kilku godzin.
          </p>
          <a
            href="mailto:hello@termcatch.com"
            className="btn-spring glass-shimmer-wrap"
            style={G.btn}
          >
            hello@termcatch.com
          </a>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
