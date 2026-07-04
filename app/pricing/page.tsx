import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cennik — o połowę taniej niż Booksy",
  description:
    "Przejrzysty cennik Termcatch: plany od 39 zł/mies., 0% prowizji od wizyt. Pierwsze 100 salonów — 3 miesiące bez opłat.",
  alternates: { canonical: "/pricing" },
};

const PLANS = [
  {
    name: "Solo",
    price: "39 zł",
    period: "miesięcznie",
    desc: "Dla niezależnych specjalistów — fryzjer, barber, kosmetolog, masażysta pracujący na własny rachunek.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=solo",
    highlight: false,
    features: [
      "1 specjalista",
      "Nieograniczone rezerwacje",
      "Publiczny profil salonu i link do rezerwacji",
      "Powiadomienia e-mail dla klientów",
      "Kalendarz i zarządzanie grafikiem",
      "CRM i historia klientów",
      "0% prowizji od wizyt",
    ],
    missing: ["Zespół i wiele stanowisk", "Płatności i zaliczki online", "Pełna analityka"],
  },
  {
    name: "Zespół",
    price: "89 zł",
    period: "miesięcznie",
    desc: "Dla małych salonów. Do 5 stanowisk, płatności online i pełne przypomnienia.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=team",
    highlight: true,
    features: [
      "Do 5 specjalistów",
      "Wszystko z planu Solo",
      "Płatności i zaliczki online (Stripe)",
      "Analityka i raporty",
      "Kupony i promocje",
      "Ochrona przed no-show (zaliczki)",
      "Wsparcie priorytetowe",
    ],
    missing: [],
  },
  {
    name: "Salon Pro",
    price: "149 zł",
    period: "miesięcznie",
    desc: "Dla większych salonów i sieci. Bez limitu stanowisk, AI i dedykowana opieka.",
    cta: "Wypróbuj 14 dni za darmo",
    href: "/register?role=business&plan=pro",
    highlight: false,
    features: [
      "Nieograniczona liczba specjalistów",
      "Wszystko z planu Zespół",
      "AI Asystent (analiza obłożenia, sugestie cen)",
      "Wiele lokalizacji",
      "Faktury i eksporty księgowe",
      "Dedykowany opiekun i onboarding",
    ],
    missing: [],
  },
];

const FAQ = [
  {
    q: "Na czym polega oferta startowa?",
    a: "Pierwsze 100 salonów, które zarejestrują się w Termcatch, korzysta z pełnego planu przez 3 miesiące całkowicie bez opłat — bez karty, bez zobowiązań. Po tym okresie sam decydujesz, czy zostajesz na wybranym planie.",
  },
  {
    q: "Czym różnicie się od Booksy?",
    a: "Nasze plany są około o połowę tańsze, nie pobieramy prowizji od wizyt ani opłat za pozyskanie klienta, którego już masz. Płacisz jedną, przewidywalną stawkę miesięczną.",
  },
  {
    q: "Czy jest ukryta opłata za instalację?",
    a: "Nie. Rejestracja i konfiguracja są bezpłatne. Płacisz tylko za wybrany plan — i tylko wtedy, kiedy chcesz.",
  },
  {
    q: "Czy mogę zmienić plan w dowolnym momencie?",
    a: "Tak. Upgrade działa natychmiast, downgrade — od następnego okresu rozliczeniowego. Możesz też zrezygnować w każdej chwili, bez okresu wypowiedzenia.",
  },
  {
    q: "Jak działają płatności online?",
    a: "Integrujemy się ze Stripe. Pieniądze za wizyty trafiają bezpośrednio na Twoje konto — Termcatch nie pobiera od nich żadnej prowizji (obowiązuje wyłącznie standardowa opłata operatora Stripe).",
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
          <div className="text-center max-w-xl mx-auto mb-10">
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight mb-4">
              O połowę taniej niż Booksy.
            </h1>
            <p className="text-gray-500 text-lg">
              Jedna przewidywalna stawka. 0% prowizji od wizyt. Bez ukrytych opłat.
            </p>
          </div>

          {/* Launch offer */}
          <div className="max-w-3xl mx-auto mb-14">
            <div className="bg-gray-900 rounded-2xl px-6 py-5 sm:px-8 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex-1">
                <p className="text-white font-bold text-lg">
                  Oferta startowa: pierwsze 100 salonów — 3 miesiące bez opłat
                </p>
                <p className="text-white/60 text-sm mt-1">
                  Pełny plan, zero kosztów, bez karty. Wystarczy rejestracja salonu.
                </p>
              </div>
              <Link
                href="/register?role=business"
                className="px-6 py-3 bg-white text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                Odbierz ofertę
              </Link>
            </div>
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
