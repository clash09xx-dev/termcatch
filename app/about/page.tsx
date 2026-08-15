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
    "radial-gradient(ellipse 70% 55% at 8% 0%, rgba(255,255,255,0.92) 0%, transparent 60%)",
    "radial-gradient(ellipse 90% 70% at 92% 8%, rgba(186,203,224,0.42) 0%, transparent 58%)",
    "radial-gradient(ellipse 60% 50% at 40% 100%, rgba(203,213,225,0.30) 0%, transparent 62%)",
    "linear-gradient(172deg, #EDF2F9 0%, #F5F8FC 46%, #E7EEF7 100%)",
  ].join(", "),
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
          <div className="rail mb-7 justify-center">
            <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
              {T.eyebrow}
            </span>
          </div>
          <h1 className="type-display mb-7" style={{ color: "#0F172A" }}>
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
          <p className="type-lede max-w-[52ch] mx-auto" style={{ color: "#55637A" }}>
            {T.lede}
          </p>
        </div>
      </div>

      {/* Stats — the page's ink band. Four numbers, full bleed, nothing else. */}
      <div className="band-ink px-6 py-16 md:py-20 mb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-10">
          {STATS.map((s) => (
            <div key={s.value} className="text-center px-4">
              <div className="type-numeral on-ink-primary">{s.value}</div>
              <div className="text-[12px] font-medium uppercase track-overline on-ink-muted mt-3">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission + audience — a spread, not two icon cards. */}
      <div className="px-6 mb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-x-16 gap-y-12">
          {[
            { title: T.missionTitle, body: T.missionBody },
            { title: T.audienceTitle, body: T.audienceBody },
          ].map((block) => (
            <div key={block.title} className="pt-8" style={{ borderTop: "1px solid var(--hairline)" }}>
              <h2 className="text-[22px] font-semibold mb-4 track-title" style={{ color: "#0F172A" }}>
                {block.title}
              </h2>
              <p className="text-[15px] leading-[1.7] max-w-[46ch]" style={{ color: "#55637A" }}>
                {block.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Values — three entries on a rule, indexed by numeral. */}
      <div className="px-6 mb-24">
        <div className="max-w-5xl mx-auto">
          <div className="rail mb-10">
            <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
              {T.valuesTitle}
            </span>
          </div>
            <div className="grid md:grid-cols-3 gap-x-12 gap-y-10">
              {VALUES.map((v, i) => (
                <div
                  key={v.title}
                  className="pt-6"
                  style={{ borderTop: "1px solid var(--hairline-soft)" }}
                >
                  <div className="type-numeral text-muted-glass mb-4 select-none">
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

      {/* CTA */}
      <div className="px-6 pt-8 pb-32 md:pb-40 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="type-section mb-5" style={{ color: "#0F172A" }}>
            {T.contactTitle}
          </h2>
          <p className="type-lede mb-10" style={{ color: "#55637A" }}>
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
