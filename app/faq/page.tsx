import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { getServerI18n } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/dictionaries";
import { LEGAL } from "@/lib/legal";

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

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e2)",
  borderRadius: "1.25rem",
};

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{ background: "var(--selected)", border: "1px solid var(--hairline)", color: "#64748B" }}
            >
              {T.eyebrow}
            </div>
            <h1 className="text-4xl font-bold mb-3" style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}>
              {T.title}
            </h1>
            <p className="text-lg" style={{ color: "#64748B" }}>
              {T.lede}
            </p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="p-6" style={card}>
                <h2 className="font-semibold mb-2 text-sm" style={{ color: "#0F172A", letterSpacing: "var(--track-heading)" }}>
                  {item.q}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
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
