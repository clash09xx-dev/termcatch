import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cennik",
  description: "Przejrzysty cennik Termcatch — zacznij za darmo, płać tylko gdy rośniesz.",
};

const PLANS = [
  {
    name: "Starter",
    price: "0 zł",
    period: "na zawsze",
    desc: "Idealne na start. Bez limitu czasu, bez karty kredytowej.",
    cta: "Zacznij za darmo",
    href: "/register?role=business",
    highlight: false,
    features: [
      "1 pracownik",
      "Do 30 rezerwacji miesięcznie",
      "Publiczny profil z linkiem",
      "Przypomnienia e-mail",
      "Panel klienta",
    ],
    missing: [
      "Przypomnienia SMS",
      "Płatności online",
      "Analityka i raporty",
      "Priorytetowe wsparcie",
    ],
  },
  {
    name: "Pro",
    price: "99 zł",
    period: "miesięcznie",
    desc: "Dla aktywnych salonów. Nieograniczone rezerwacje, SMS i płatności.",
    cta: "Zacznij bezpłatnie przez 14 dni",
    href: "/register?role=business&plan=pro",
    highlight: true,
    features: [
      "Do 5 pracowników",
      "Nieograniczone rezerwacje",
      "Przypomnienia SMS i e-mail",
      "Płatności i depozyty online",
      "Analityka i raporty",
      "CRM i historia klientów",
      "Wsparcie w 24h",
    ],
    missing: [],
  },
  {
    name: "Business",
    price: "Indywidualnie",
    period: "kontakt z nami",
    desc: "Dla sieci salonów i franczyz. Dedykowane wdrożenie i umowa SLA.",
    cta: "Skontaktuj się",
    href: "/contact",
    highlight: false,
    features: [
      "Nieograniczona liczba pracowników",
      "Wiele lokalizacji",
      "Integracje API",
      "Dedykowany opiekun",
      "Umowa SLA",
      "Onboarding i szkolenie",
    ],
    missing: [],
  },
];

const FAQ = [
  {
    q: "Czy jest ukryta opłata za instalację?",
    a: "Nie. Rejestracja i konfiguracja są bezpłatne. Płacisz tylko za wybrany plan — i tylko wtedy, kiedy chcesz.",
  },
  {
    q: "Co się stanie po skończeniu okresu próbnego?",
    a: "Plan Pro przechodzi na plan Starter automatycznie, jeśli nie wybierzesz subskrypcji. Nie straciasz danych.",
  },
  {
    q: "Czy mogę zmienić plan w dowolnym momencie?",
    a: "Tak. Upgrade działa natychmiast, downgrade — od następnego okresu rozliczeniowego.",
  },
  {
    q: "Jak działają płatności online?",
    a: "Integrujemy się ze Stripe. Pieniądze trafiają bezpośrednio na Twoje konto — Termcatch pobiera prowizję tylko w planie Pro.",
  },
];

function Check() {
  return (
    <svg className="w-4 h-4 text-gray-900 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

function Cross() {
  return (
    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-16">
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight mb-4">
              Przejrzysty cennik.
            </h1>
            <p className="text-gray-500 text-lg">
              Zacznij za darmo. Płać tylko gdy rośniesz. Bez ukrytych opłat.
            </p>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border flex flex-col ${
                  plan.highlight
                    ? "bg-gray-900 border-gray-800 text-white"
                    : "bg-white border-gray-200"
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block self-start px-2.5 py-1 bg-white/10 text-white text-xs font-semibold rounded-lg mb-5 border border-white/10">
                    Najpopularniejszy
                  </span>
                )}

                <div className="mb-6">
                  <h2 className={`text-lg font-bold mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.highlight ? "text-white/50" : "text-gray-400"}`}>
                      / {plan.period}
                    </span>
                  </div>
                  <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? "text-white/60" : "text-gray-500"}`}>
                    {plan.desc}
                  </p>
                </div>

                <div className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      {plan.highlight ? (
                        <svg className="w-4 h-4 text-white/60 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                        </svg>
                      ) : (
                        <Check />
                      )}
                      <span className={plan.highlight ? "text-white/80" : "text-gray-600"}>{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <Cross />
                      <span className="text-gray-300">{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={plan.href}
                  className={`flex items-center justify-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-white text-gray-900 hover:bg-gray-100"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Najczęstsze pytania</h2>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <div key={item.q} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="font-semibold text-gray-900 mb-2 text-sm">{item.q}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-gray-400 mb-4">Masz pytania? Odpiszemy w ciągu godziny.</p>
              <Link href="/contact" className="text-sm font-semibold text-gray-900 hover:underline underline-offset-4">
                Napisz do nas →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
