import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.about;
  return { title: T.seoTitle, description: T.seoDescription };
}

const G = {
  bg: [
    "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
    "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
    "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
  ].join(", "),
  card: {
    background: "var(--surface)",
    border: "1px solid var(--hairline)",
    boxShadow: "var(--e3)",
    borderRadius: "1.25rem",
  } as React.CSSProperties,
  panel: {
    background: "var(--surface-2)",
    border: "1px solid var(--hairline)",
    boxShadow: "var(--e2)",
    borderRadius: "1.5rem",
  } as React.CSSProperties,
  btn: {
    background: "var(--ink-raised)",
    color: "#F8FAFC",
    boxShadow:
      "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
    border: "1px solid #0F172A",
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

export default async function AboutPage() {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.about;

  const VALUES = [
    { title: T.value1Title, desc: T.value1Desc },
    { title: T.value2Title, desc: T.value2Desc },
    { title: T.value3Title, desc: T.value3Desc },
  ];

  const STATS = [
    { value: "24/7", label: T.statBookings },
    { value: "20%", label: T.statCommission },
    { value: "5 min", label: T.statSetup },
    { value: "100%", label: T.value2Title },
  ];

  return (
    <div className="min-h-screen" style={{ background: G.bg }}>
      <LandingNav />

      {/* Hero */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "var(--selected)",
              border: "1px solid var(--hairline)",
              color: "#64748B",
            }}
          >
            {T.eyebrow}
          </div>
          <h1
            className="text-5xl sm:text-6xl font-bold leading-[1.05] mb-6"
            style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}
          >
            {T.headlineTop}
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {T.headlineBottom}
            </span>
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: "#64748B" }}>
            {T.lede}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 mb-20">
        <div className="max-w-4xl mx-auto">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-px"
            style={{
              background: "var(--selected)",
              border: "1px solid var(--hairline)",
              borderRadius: "1.25rem",
              overflow: "hidden",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.value}
                className="px-6 py-6 text-center"
                style={{ background: "var(--surface)" }}
              >
                <div
                  className="text-3xl font-bold mb-1"
                  style={{
                    letterSpacing: "var(--track-display)",
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
          <div style={G.card} className="p-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "var(--selected)", border: "1px solid var(--hairline)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 3.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}>
              {T.missionTitle}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              {T.missionBody}
            </p>
          </div>

          <div style={G.card} className="p-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "var(--selected)", border: "1px solid var(--hairline)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}>
              {T.audienceTitle}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              {T.audienceBody}
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
              style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}
            >
              {T.valuesTitle}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {VALUES.map((v, i) => (
                <div
                  key={v.title}
                  className="p-5"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--hairline)",
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
                    style={{ letterSpacing: "var(--track-title)", color: "#0F172A" }}
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
            style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}
          >
            {T.contactTitle}
          </h2>
          <p className="mb-8 text-sm" style={{ color: "#64748B" }}>
            {T.contactBody}
          </p>
          <a
            href="mailto:hello@termcatch.com"
            className="btn-spring"
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
