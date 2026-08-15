import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.pricing;
  return { title: T.seoTitle, description: T.seoDescription, alternates: { canonical: "/pricing" } };
}

const BG = [
  "radial-gradient(ellipse 70% 55% at 8% 0%, rgba(255,255,255,0.92) 0%, transparent 60%)",
  "radial-gradient(ellipse 90% 70% at 92% 8%, rgba(186,203,224,0.42) 0%, transparent 58%)",
  "radial-gradient(ellipse 60% 50% at 40% 100%, rgba(203,213,225,0.30) 0%, transparent 62%)",
  "linear-gradient(172deg, #EDF2F9 0%, #F5F8FC 46%, #E7EEF7 100%)",
].join(", ");

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e3)",
  borderRadius: "1.25rem",
};

/** The recommended plan is the page's ink anchor, not a 2.5% bigger box. */
const cardHighlight: React.CSSProperties = {
  background: "linear-gradient(168deg, #16202F 0%, #0F172A 55%, #131C2B 100%)",
  border: "1px solid #0F172A",
  boxShadow: "0 2px 8px rgba(15,23,42,0.16), 0 32px 64px -24px rgba(15,23,42,0.42)",
  borderRadius: "1.25rem",
  color: "#E8EEF6",
};

/** The recommended plan's CTA: silver on ink, so it still reads as primary. */
const onInkBtn: React.CSSProperties = {
  background: "#F1F5F9",
  color: "#0F172A",
  border: "1px solid #F1F5F9",
  boxShadow: "0 1px 2px rgba(0,0,0,0.28), 0 8px 20px -8px rgba(0,0,0,0.45)",
  borderRadius: "0.75rem",
  padding: "0.75rem 0",
  width: "100%",
  textAlign: "center" as const,
  fontSize: "0.875rem",
  fontWeight: 600,
  display: "block",
};

const ghostBtn: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: "0.75rem",
  padding: "0.75rem 0",
  width: "100%",
  textAlign: "center" as const,
  color: "#0F172A",
  fontSize: "0.875rem",
  fontWeight: 600,
  display: "block",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)",
  };

const divider: React.CSSProperties = {
  height: "1px",
  background:
    "linear-gradient(90deg, transparent 0%, rgba(203,213,225,0.55) 20%, rgba(203,213,225,0.55) 80%, transparent 100%)",
};

import React from "react";

/** Prices, links and the highlight flag are product data, not copy. */
const PLAN_DATA = [
  { name: "Solo", oldPrice: "139 zł", price: "99 zł", href: "/register?role=business&plan=solo", highlight: false },
  { name: "Team", oldPrice: "249 zł", price: "199 zł", href: "/register?role=business&plan=team", highlight: false },
  { name: "Professional", oldPrice: "439 zł", price: "369 zł", href: "/register?role=business&plan=pro", highlight: true },
  { name: "Ultimate", oldPrice: "799 zł", price: "499 zł", href: "/register?role=business&plan=ultimate", highlight: false },
] as const;

function CheckIcon({ highlight }: { highlight: boolean }) {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke={highlight ? "#8FA3BC" : "#94A3B8"}
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

export default async function PricingPage() {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.pricing;

  // Product data joined with its copy, in the same order as before.
  const planCopy = [
    { desc: T.soloDesc, features: T.soloFeatures },
    { desc: T.teamDesc, features: T.teamFeatures },
    { desc: T.proDesc, features: T.proFeatures },
    { desc: T.ultimateDesc, features: T.ultimateFeatures },
  ];
  const PLANS = PLAN_DATA.map((p, i) => ({
    ...p,
    period: T.period,
    cta: T.planCta,
    desc: planCopy[i].desc,
    features: planCopy[i].features,
  }));
  const FAQ = T.faq;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-10">
            <div className="rail mb-7 justify-center">
              <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                {T.eyebrow}
              </span>
            </div>
            <h1 className="type-display mb-6" style={{ color: "#0F172A" }}>
              {T.headlineLead}{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {T.headlineAccent}
              </span>
            </h1>
            <p className="type-lede max-w-[48ch] mx-auto" style={{ color: "#55637A" }}>
              {T.lede}
            </p>
          </div>

          {/* Launch offer banner */}
          <div className="max-w-3xl mx-auto mb-16">
            <div
              className="py-6 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
              style={{ borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "rgba(203,213,225,0.45)", border: "1px solid var(--hairline)" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-base" style={{ color: "#0F172A", letterSpacing: "var(--track-title)" }}>
                  {T.offerTitle}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                  {T.offerBody}
                </p>
              </div>
              <Link
                href="/register?role=business"
                className="btn-spring whitespace-nowrap px-5 py-2.5 text-sm font-semibold"
                style={{
                  background: "var(--ink-raised)",
                  color: "#F8FAFC",
                  border: "1px solid #0F172A",
                  borderRadius: "0.75rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                {T.offerCta}
              </Link>
            </div>
          </div>

          {/* Plans — 1 col mobile, 2×2 tablet, 4 in a row on wide desktop */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-4 mb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="p-8 xl:p-6 flex flex-col"
                style={plan.highlight ? cardHighlight : card}
              >
                {plan.highlight && (
                  <div
                    className="inline-flex items-center self-start px-2.5 py-1 rounded-lg text-xs font-semibold mb-5"
                    style={{
                      background: "rgba(226,232,240,0.12)",
                      border: "1px solid rgba(226,232,240,0.22)",
                      color: "#CBD5E1",
                    }}
                  >
                    {T.mostPopular}
                  </div>
                )}

                <div className="mb-6">
                  <h2
                    className="text-lg font-bold mb-2 track-title"
                    style={{ color: plan.highlight ? "#F1F5F9" : "#0F172A" }}
                  >
                    {plan.name}
                  </h2>
                  <p
                    className="text-sm font-medium tabular-nums"
                    style={{ color: plan.highlight ? "#7C8CA3" : "#8593A8", textDecoration: "line-through", textDecorationColor: "rgba(148,163,184,0.7)" }}
                    aria-label={interpolate(T.regularPrice, { price: plan.oldPrice })}
                  >
                    {plan.oldPrice}
                  </p>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span
                      className="text-4xl font-bold"
                      style={{
                        letterSpacing: "var(--track-display)",
                        color: plan.highlight ? "#FFFFFF" : "#0F172A",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm" style={{ color: plan.highlight ? "#93A3B8" : "#8593A8" }}>
                      / {plan.period}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: plan.highlight ? "#9FB0C6" : "#55637A" }}>
                    {plan.desc}
                  </p>
                </div>

                <div
                  className="divider mb-6"
                  style={plan.highlight ? { height: "1px", background: "rgba(226,232,240,0.16)" } : divider}
                />

                <div className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5"><CheckIcon highlight={plan.highlight} /></span>
                      <span style={{ color: plan.highlight ? "#D5DFEC" : "#475569" }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={plan.href}
                  className="btn-spring"
                  style={plan.highlight ? onInkBtn : ghostBtn}
                >
                  {plan.cta}
                </Link>
                <p className="text-[11px] text-center mt-2.5" style={{ color: plan.highlight ? "#7C8CA3" : "#8593A8" }}>
                  {interpolate(T.trialThen, { price: plan.price, period: plan.period })}
                </p>
              </div>
            ))}
          </div>

          {/* Commission note */}
          <p className="text-center text-sm mb-6" style={{ color: "#94A3B8" }}>
            {T.commissionNote}
          </p>

          <div style={{ ...divider, margin: "4rem 0" }} />

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="type-section mb-10 text-center" style={{ color: "#0F172A" }}>
              {T.faqTitle}
            </h2>
            <div>
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="py-7"
                  style={{ borderTop: "1px solid var(--hairline-soft)" }}
                >
                  <p className="font-semibold mb-2 text-[15px] track-heading" style={{ color: "#0F172A" }}>
                    {item.q}
                  </p>
                  <p className="text-[14.5px] leading-[1.65]" style={{ color: "#55637A" }}>
                    {item.a}
                  </p>
                </div>
              ))}
              <div className="rule" />
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
                {T.contactPrompt}
              </p>
              <Link
                href="/contact"
                className="text-sm font-semibold btn-spring"
                style={{ color: "#475569" }}
              >
                {T.contactCta}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
