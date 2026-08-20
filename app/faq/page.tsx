import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { getServerI18n } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/dictionaries";
import { LEGAL } from "@/lib/legal";
import { jsonLdScript } from "@/lib/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.faq;
  return { title: T.seoTitle, description: T.seoDescription, alternates: { canonical: "/faq" } };
}

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

// Answers live in the dictionary (publicPages.faq.items) and describe ONLY
// functionality that is implemented today, or explicitly label a capability as
// "being prepared" (multi-location, online payments).
export default async function FaqPage() {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.faq;
  const FAQ = T.items.map((item) => ({
    q: item.q,
    a: interpolate(item.a, { email: LEGAL.CONTACT_EMAIL }),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-14">
            <div className="rail mb-7">
              <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                {T.eyebrow}
              </span>
            </div>
            <h1 className="type-display mb-5" style={{ color: "#0F172A" }}>
              {T.title}
            </h1>
            <p className="type-lede max-w-[48ch]" style={{ color: "#55637A" }}>
              {T.lede}
            </p>
          </div>

          {/* A reading column, not ten boxes. Question and answer sit in two
              columns on desktop so the eye can scan the questions alone. */}
          <div>
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] gap-x-10 gap-y-2 py-7"
                style={{ borderTop: "1px solid var(--hairline-soft)" }}
              >
                <h2 className="text-[15px] font-semibold track-heading" style={{ color: "#0F172A" }}>
                  {item.q}
                </h2>
                <p className="text-[14.5px] leading-[1.65]" style={{ color: "#55637A" }}>
                  {item.a}
                </p>
              </div>
            ))}
            <div className="rule" />
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm mb-4" style={{ color: "#8593A8" }}>
              {T.notFound}
            </p>
            <Link href="/contact" className="text-sm font-semibold btn-spring" style={{ color: "#475569" }}>
              {T.contactCta}
            </Link>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
