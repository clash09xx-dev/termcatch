import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Polityka prywatności" };

const sections = [
  {
    title: "1. Administrator danych",
    body: `Administratorem danych osobowych jest Termcatch Sp. z o.o. z siedzibą w Krakowie. Kontakt: hello@termcatch.com`,
  },
  {
    title: "2. Jakie dane zbieramy",
    body: `Zbieramy następujące dane: imię i nazwisko, adres e-mail, numer telefonu (opcjonalnie), historię rezerwacji, dane rozliczeniowe (przy płatnościach online). Dane są zbierane tylko w zakresie niezbędnym do świadczenia usług.`,
  },
  {
    title: "3. W jaki sposób używamy danych",
    body: `Dane używamy do: realizacji rezerwacji i komunikacji z użytkownikiem, wysyłania potwierdzeń i przypomnień SMS/e-mail, ulepszania Platformy i personalizacji doświadczeń, obsługi płatności i fakturowania, spełnienia wymogów prawnych.`,
  },
  {
    title: "4. Podstawy prawne",
    body: `Przetwarzamy dane na podstawie: wykonania umowy (art. 6 ust. 1 lit. b RODO), prawnie uzasadnionego interesu (art. 6 ust. 1 lit. f RODO), zgody użytkownika (art. 6 ust. 1 lit. a RODO) dla komunikacji marketingowej.`,
  },
  {
    title: "5. Udostępnianie danych",
    body: `Dane nie są sprzedawane stronom trzecim. Udostępniamy je wyłącznie: Salonowi, u którego dokonano rezerwacji, dostawcom usług technicznych (Supabase, Stripe), organom państwowym gdy wymagają tego przepisy prawa.`,
  },
  {
    title: "6. Prawa użytkownika",
    body: `Masz prawo do: dostępu do danych, poprawienia danych, usunięcia danych ("prawo do bycia zapomnianym"), przenoszenia danych, ograniczenia przetwarzania, wniesienia sprzeciwu. Aby skorzystać z tych praw, napisz na: hello@termcatch.com`,
  },
  {
    title: "7. Cookies",
    body: `Używamy plików cookie do: utrzymania sesji użytkownika, analizy ruchu (anonimowe dane), preferencji językowych. Możesz zarządzać cookies w ustawieniach przeglądarki.`,
  },
  {
    title: "8. Bezpieczeństwo",
    body: `Stosujemy szyfrowanie SSL/TLS, bezpieczne przechowywanie haseł (bcrypt), regularne audyty bezpieczeństwa i ograniczony dostęp do danych tylko dla uprawnionych pracowników.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />
      <div className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-3">Polityka prywatności</h1>
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
