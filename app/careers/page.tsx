import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { INK_BTN } from "@/components/ui/glass/tokens";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.careers;
  return { title: T.seoTitle, description: T.seoDescription, alternates: { canonical: "/careers" } };
}

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

export default async function CareersPage() {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.careers;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />
      <div className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-md mx-auto">
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
            className="text-4xl font-bold mb-4"
            style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}
          >
            {T.title}
          </h1>
          <p className="mb-10 leading-relaxed text-sm" style={{ color: "#64748B" }}>
            {T.lede}
          </p>
          <div
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl mb-10 text-sm"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              boxShadow: "var(--e2)",
              color: "#475569",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: "linear-gradient(135deg, #94A3B8, #CBD5E1)",
                boxShadow: "var(--e1)",
              }}
            />
            {T.openingsSoon}
          </div>
          <div className="mt-6">
            <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
              {T.contactPrompt}
            </p>
            <Link
              href="/contact"
              className="btn-spring px-6 py-2.5 text-sm font-semibold"
              data-on-ink
              style={{ ...INK_BTN, display: "inline-flex", borderRadius: "10px" }}
            >
              {T.contactCta}
            </Link>
          </div>
        </div>
      </div>

      {/* Affiliate / referral — target of the "Zaproś i zarób" nav CTA */}
      <section id="zaros-i-zarob" className="px-6 pb-24 scroll-mt-28">
        <div
          className="max-w-2xl mx-auto rounded-3xl p-8 sm:p-10 text-center"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--hairline)",
            boxShadow: "var(--e2)",
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--selected)", border: "1px solid var(--hairline)", color: "#64748B" }}
          >
            {T.referralEyebrow}
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}>
            {T.referralTitle}
          </h2>
          <p className="mb-7 leading-relaxed text-sm max-w-lg mx-auto" style={{ color: "#64748B" }}>
            {T.referralBody}
          </p>
          <Link
            href="/contact"
            className="btn-spring inline-flex items-center px-6 py-2.5 text-sm font-semibold rounded-xl text-white"
            style={{
              background: "var(--ink-raised)",
              border: "1px solid #0F172A",
              boxShadow: "0 1px 2px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {T.referralCta}
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
