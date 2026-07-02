import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import ContactForm from "./contact-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Skontaktuj się z Termcatch — jesteśmy tu, żeby pomóc.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Left */}
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-4">Kontakt</span>
              <h1 className="text-4xl font-bold tracking-tight mb-6">Jesteśmy tutaj.</h1>
              <p className="text-gray-500 leading-relaxed mb-10">
                Masz pytanie o Termcatch? Chcesz omówić wdrożenie dla sieci salonów?
                Piszesz do nas — odpiszemy w ciągu kilku godzin.
              </p>

              <div className="space-y-5">
                {[
                  {
                    label: "E-mail",
                    value: "hello@termcatch.com",
                    href: "mailto:hello@termcatch.com",
                  },
                  {
                    label: "Wsparcie techniczne",
                    value: "hello@termcatch.com",
                    href: "mailto:hello@termcatch.com",
                  },
                  {
                    label: "Sprzedaż i Enterprise",
                    value: "hello@termcatch.com",
                    href: "mailto:hello@termcatch.com",
                  },
                ].map((c) => (
                  <div key={c.label}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{c.label}</p>
                    <a href={c.href} className="text-gray-900 font-medium hover:underline underline-offset-2 transition-all">
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
