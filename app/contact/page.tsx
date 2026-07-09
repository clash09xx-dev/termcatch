import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import ContactForm from "./contact-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt — Termcatch",
  description: "Skontaktuj się z Termcatch — jesteśmy tu, żeby pomóc.",
};

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

const CONTACTS = [
  { label: "E-mail", value: "hello@termcatch.com", href: "mailto:hello@termcatch.com" },
  { label: "Wsparcie techniczne", value: "hello@termcatch.com", href: "mailto:hello@termcatch.com" },
  { label: "Sprzedaż i Enterprise", value: "hello@termcatch.com", href: "mailto:hello@termcatch.com" },
];

export default function ContactPage() {
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
                  background: "rgba(203,213,225,0.28)",
                  border: "1px solid rgba(203,213,225,0.50)",
                  color: "#64748B",
                }}
              >
                Kontakt
              </div>
              <h1
                className="text-4xl font-bold mb-5"
                style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
              >
                Jesteśmy tutaj.
              </h1>
              <p className="leading-relaxed mb-10 text-sm" style={{ color: "#64748B" }}>
                Masz pytanie o Termcatch? Chcesz omówić wdrożenie dla sieci salonów?
                Piszesz do nas — odpiszemy w ciągu kilku godzin.
              </p>

              <div className="space-y-4">
                {CONTACTS.map((c) => (
                  <div
                    key={c.label}
                    className="px-5 py-4 glass-shimmer-wrap"
                    style={{
                      background: "rgba(255,255,255,0.72)",
                      backdropFilter: "blur(40px) saturate(200%)",
                      WebkitBackdropFilter: "blur(40px) saturate(200%)",
                      border: "1px solid rgba(203,213,225,0.55)",
                      borderRadius: "0.875rem",
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(100,116,139,0.07), inset 0 1px 0 rgba(255,255,255,0.95)",
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
