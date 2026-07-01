import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Regulamin" };

const sections = [
  {
    title: "1. Postanowienia ogólne",
    body: `Niniejszy Regulamin określa zasady korzystania z platformy Termcatch, dostępnej pod adresem termcatch.com, świadczącej usługi pośrednictwa w rezerwacjach online między klientami a usługodawcami z branży beauty i wellness.`,
  },
  {
    title: "2. Definicje",
    body: `Platforma — serwis internetowy Termcatch dostępny pod adresem termcatch.com. Użytkownik — osoba fizyczna korzystająca z Platformy w celu dokonania rezerwacji. Salon / Specjalista — podmiot świadczący usługi zarejestrowany na Platformie. Rezerwacja — potwierdzenie terminu usługi dokonane za pośrednictwem Platformy.`,
  },
  {
    title: "3. Warunki korzystania",
    body: `Korzystanie z Platformy jest bezpłatne dla Użytkowników. Rejestracja wymaga podania prawdziwych danych osobowych. Użytkownik ponosi odpowiedzialność za zachowanie poufności danych dostępowych do konta. Termcatch zastrzega sobie prawo do usunięcia konta naruszającego niniejszy Regulamin.`,
  },
  {
    title: "4. Rezerwacje",
    body: `Rezerwacja dokonana przez Platformę jest wiążąca po potwierdzeniu przez Salon. Użytkownik zobowiązuje się do przybycia na umówioną wizytę lub odwołania jej z co najmniej 24-godzinnym wyprzedzeniem. Salon ma prawo nałożyć opłatę za brak obecności zgodnie z własną polityką anulowania.`,
  },
  {
    title: "5. Płatności",
    body: `Opłaty za usługi są pobierane przez Salon według własnego cennika. Termcatch może pobierać prowizję od transakcji online zgodnie z obowiązującym cennikiem. Płatności online są obsługiwane przez operatora płatności Stripe.`,
  },
  {
    title: "6. Odpowiedzialność",
    body: `Termcatch nie ponosi odpowiedzialności za jakość usług świadczonych przez Salony. Platforma pełni wyłącznie rolę pośrednika w procesie rezerwacji. Wszelkie reklamacje dotyczące usług należy kierować bezpośrednio do Salonu.`,
  },
  {
    title: "7. Postanowienia końcowe",
    body: `Termcatch zastrzega sobie prawo do zmiany niniejszego Regulaminu z 14-dniowym wyprzedzeniem. W sprawach nieregulowanych niniejszym Regulaminem stosuje się przepisy prawa polskiego. Wszelkie spory rozstrzyga właściwy sąd powszechny.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />
      <div className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-3">Regulamin</h1>
            <p className="text-sm text-gray-400">Ostatnia aktualizacja: 1 lipca 2025</p>
          </div>
          <div className="space-y-8">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-base font-semibold text-gray-900 mb-3">{s.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
