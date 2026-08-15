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
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
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
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
                style={{
                  background: "var(--selected)",
                  border: "1px solid var(--hairline)",
                  color: "#64748B",
                }}
              >
                {T.eyebrow}
              </div>
              <h1
                className="text-4xl font-bold mb-5"
                style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}
              >
                {T.title}
              </h1>
              <p className="leading-relaxed mb-10 text-sm" style={{ color: "#64748B" }}>
                {T.lede}
              </p>

              <div className="space-y-4">
                {CONTACTS.map((c) => (
                  <div
                    key={c.label}
                    className="px-5 py-4"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--hairline)",
                      borderRadius: "0.875rem",
                      boxShadow: "var(--e1)",
                    }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                      style={{ color: "#94A3B8" }}
                    >
                      {c.label}
                    </p>
                    <a
                      href={c.href}
                      className="text-sm font-semibold transition-colors hover:opacity-70"
                      style={{ color: "#0F172A" }}
                    >
                      {c.value}
                    </a>
                  </div>
                ))}
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
