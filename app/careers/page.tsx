import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { INK_BTN, ON_INK_BTN } from "@/components/ui/glass/tokens";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.careers;
  return { title: T.seoTitle, description: T.seoDescription, alternates: { canonical: "/careers" } };
}

const BG = [
  "radial-gradient(ellipse 70% 55% at 8% 0%, rgba(255,255,255,0.92) 0%, transparent 60%)",
  "radial-gradient(ellipse 90% 70% at 92% 8%, rgba(186,203,224,0.42) 0%, transparent 58%)",
  "radial-gradient(ellipse 60% 50% at 40% 100%, rgba(203,213,225,0.30) 0%, transparent 62%)",
  "linear-gradient(172deg, #EDF2F9 0%, #F5F8FC 46%, #E7EEF7 100%)",
].join(", ");

export default async function CareersPage() {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.careers;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />
      <div className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="rail mb-7 justify-center">
            <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
              {T.eyebrow}
            </span>
          </div>
          <h1 className="type-display mb-6" style={{ color: "#0F172A" }}>
            {T.title}
          </h1>
          <p className="type-lede mb-12 max-w-[46ch] mx-auto" style={{ color: "#55637A" }}>
            {T.lede}
          </p>
          <div
            className="inline-flex items-center gap-2.5 px-5 py-3 mb-12 text-[13px] font-medium"
            style={{ borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", color: "#475569" }}
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
      <section id="zaros-i-zarob" className="band-ink px-6 py-24 md:py-32 scroll-mt-28">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rail mb-6 justify-center">
            <span className="text-[11px] font-semibold uppercase track-overline on-ink-muted flex-shrink-0">
              {T.referralEyebrow}
            </span>
          </div>
          <h2 className="type-section mb-4 on-ink-primary">
            {T.referralTitle}
          </h2>
          <p className="type-lede mb-10 max-w-[52ch] mx-auto on-ink-secondary">
            {T.referralBody}
          </p>
          <Link
            href="/contact"
            className="btn-spring inline-flex items-center px-6 py-3 min-h-[44px] text-sm font-semibold rounded-[11px]"
            style={ON_INK_BTN}
          >
            {T.referralCta}
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
