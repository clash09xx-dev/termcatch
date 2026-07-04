import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import CookieSettingsButton from "./cookie-settings-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka cookies",
  description:
    "Jakich plików cookie używa Termcatch, do czego służą i jak zarządzać swoimi preferencjami.",
  alternates: { canonical: "/cookies" },
};

const SECTIONS = [
  {
    title: "Cookie niezbędne",
    badge: "Zawsze aktywne",
    body: "Bez nich Termcatch nie działa. Obsługują logowanie i sesję użytkownika (Supabase Auth), zapamiętują Twoje preferencje zgody oraz chronią przed nadużyciami. Podstawą prawną jest niezbędność do świadczenia usługi (art. 6 ust. 1 lit. b RODO) — nie wymagają zgody.",
    examples: "sb-*-auth-token (sesja logowania), tc_consent (Twoje preferencje cookie)",
  },
  {
    title: "Cookie analityczne",
    badge: "Wymagają zgody",
    body: "Pomagają nam zrozumieć, jak używasz Termcatch — które strony odwiedzasz i skąd do nas trafiasz. Używamy własnego, anonimowego systemu statystyk: identyfikator odwiedzającego jest losowy, nie łączymy go z Twoim imieniem, nazwiskiem ani adresem e-mail, a adres IP zapisujemy wyłącznie w formie skróconej (hash). Nie przekazujemy tych danych żadnym zewnętrznym firmom reklamowym.",
    examples: "tc_vid (losowy identyfikator odwiedzającego), tc_sid (identyfikator sesji, wygasa po 30 min)",
  },
  {
    title: "Cookie marketingowe",
    badge: "Obecnie nieużywane",
    body: "Termcatch nie używa obecnie żadnych cookie marketingowych ani reklamowych. Jeśli to się zmieni (np. przy kampaniach remarketingowych), zapytamy Cię o osobną zgodę zanim jakikolwiek skrypt marketingowy zostanie załadowany.",
    examples: "brak",
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-4">
            Polityka cookies
          </span>
          <h1 className="text-4xl font-bold tracking-tight mb-6">Pliki cookie w Termcatch</h1>
          <p className="text-gray-500 leading-relaxed mb-10">
            Poniżej znajdziesz pełną listę kategorii plików cookie, których używamy,
            wraz z wyjaśnieniem do czego służą. Skrypty analityczne i marketingowe
            nie są ładowane, dopóki nie wyrazisz na nie zgody. Swój wybór możesz
            zmienić w każdej chwili przyciskiem na dole tej strony.
          </p>

          <div className="space-y-6 mb-12">
            {SECTIONS.map((s) => (
              <section
                key={s.title}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">{s.title}</h2>
                  <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {s.badge}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{s.body}</p>
                <p className="text-xs text-gray-400">
                  <span className="font-semibold text-gray-500">Przykłady:</span> {s.examples}
                </p>
              </section>
            ))}
          </div>

          <section className="bg-gray-50 rounded-2xl p-6 mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Twoje wybory</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Przy pierwszej wizycie pytamy Cię o zgodę na cookie analityczne i marketingowe.
              Możesz zaakceptować wszystkie, zostawić tylko niezbędne albo dostosować
              wybór w ustawieniach. Preferencje przechowujemy przez 12 miesięcy —
              potem zapytamy ponownie. Cookie możesz też usunąć samodzielnie
              w ustawieniach przeglądarki.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pytania dotyczące prywatności? Napisz na{" "}
              <a href="mailto:hello@termcatch.com" className="underline underline-offset-2 hover:text-gray-900">
                hello@termcatch.com
              </a>
              . Więcej o przetwarzaniu danych osobowych znajdziesz w naszej{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-gray-900">
                polityce prywatności
              </a>
              .
            </p>
          </section>

          <CookieSettingsButton />
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
