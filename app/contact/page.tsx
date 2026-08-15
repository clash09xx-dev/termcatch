import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import ContactForm from "./contact-form";
import { getServerI18n } from "@/lib/i18n/server";
import { LEGAL } from "@/lib/legal";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.contact;
  return { title: T.seoTitle, description: T.seoDescription };
}

const BG = [
  "radial-gradient(ellipse 70% 55% at 8% 0%, rgba(255,255,255,0.92) 0%, transparent 60%)",
  "radial-gradient(ellipse 90% 70% at 92% 8%, rgba(186,203,224,0.42) 0%, transparent 58%)",
  "radial-gradient(ellipse 60% 50% at 40% 100%, rgba(203,213,225,0.30) 0%, transparent 62%)",
  "linear-gradient(172deg, #EDF2F9 0%, #F5F8FC 46%, #E7EEF7 100%)",
].join(", ");

export default async function ContactPage() {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.contact;
  const EMAIL = LEGAL.CONTACT_EMAIL;
  const CONTACTS = [
    { label: T.channelEmail, value: EMAIL, href: `mailto:${EMAIL}` },
    { label: T.channelSupport, value: EMAIL, href: `mailto:${EMAIL}` },
    { label: T.channelSales, value: EMAIL, href: `mailto:${EMAIL}` },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">

            {/* Left */}
            <div>
              <div className="rail mb-7">
                <span className="text-[11px] font-semibold uppercase track-overline text-slate-500 flex-shrink-0">
                  {T.eyebrow}
                </span>
              </div>
              <h1 className="type-display mb-6" style={{ color: "#0F172A" }}>
                {T.title}
              </h1>
              <p className="type-lede mb-12 max-w-[44ch]" style={{ color: "#55637A" }}>
                {T.lede}
              </p>

              {/* Three rows on one rule, not three separate boxes holding
                  the same address three times. */}
              <div>
                {CONTACTS.map((c) => (
                  <div
                    key={c.label}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
                    style={{ borderTop: "1px solid var(--hairline-soft)" }}
                  >
                    <p className="text-[11px] font-semibold uppercase track-overline" style={{ color: "#8593A8" }}>
                      {c.label}
                    </p>
                    <a
                      href={c.href}
                      className="text-[14px] font-semibold underline underline-offset-[3px] decoration-slate-300 hover:decoration-slate-900 transition-colors"
                      style={{ color: "#0F172A" }}
                    >
                      {c.value}
                    </a>
                  </div>
                ))}
                <div className="rule" />
              </div>
            </div>

            {/* Right — form */}
            <ContactForm />
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
