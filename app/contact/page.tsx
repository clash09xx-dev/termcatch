import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
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
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Napisz do nas</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Imię</label>
                    <input
                      type="text"
                      placeholder="Jan"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nazwisko</label>
                    <input
                      type="text"
                      placeholder="Kowalski"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    placeholder="twoj@email.pl"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Temat</label>
                  <select className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-gray-400 transition-colors">
                    <option>Pytanie ogólne</option>
                    <option>Wsparcie techniczne</option>
                    <option>Enterprise / sieć salonów</option>
                    <option>Partnerstwo</option>
                    <option>Inne</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Wiadomość</label>
                  <textarea
                    rows={4}
                    placeholder="Opisz swoje pytanie lub projekt..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Wyślij wiadomość
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
