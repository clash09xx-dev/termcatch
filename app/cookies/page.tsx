import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import CookieSettingsButton from "./cookie-settings-button";

export const metadata: Metadata = {
  title: "Polityka Cookies TermCatch",
  description:
    "Polityka cookies TermCatch: jakich plików cookie i podobnych technologii używamy, w jakim celu, przez jaki czas oraz jak zarządzać zgodą.",
};

const E = LEGAL.CONTACT_EMAIL;

const th = "text-left font-semibold text-slate-700 px-3 py-2";
const td = "px-3 py-2 align-top text-slate-600";

const COOKIES: { name: string; provider: string; purpose: string; cat: string; ttl: string; necessary: string }[] = [
  { name: "tc_consent", provider: "TermCatch", purpose: "Zapis Twojego wyboru dotyczącego cookie", cat: "Niezbędny", ttl: "12 miesięcy", necessary: "Tak" },
  { name: "sb-…-auth-token (i pokrewne)", provider: "Supabase / TermCatch", purpose: "Logowanie i utrzymanie sesji", cat: "Niezbędny", ttl: "Czas trwania sesji / ważności tokenu", necessary: "Tak" },
  { name: "tc_otp_sent_at", provider: "TermCatch", purpose: "Limit ponownej wysyłki kodu (ochrona przed nadużyciem)", cat: "Niezbędny", ttl: "2 minuty", necessary: "Tak" },
  { name: "tc_vid", provider: "TermCatch", purpose: "Anonimowy identyfikator odwiedzającego (statystyka)", cat: "Analityczny", ttl: "12 miesięcy", necessary: "Nie — tylko po zgodzie" },
  { name: "tc_sid", provider: "TermCatch", purpose: "Sesja statystyczna (deduplikacja odsłon)", cat: "Analityczny", ttl: "30 minut", necessary: "Nie — tylko po zgodzie" },
];

const sections: LegalSection[] = [
  { id: "c1", title: "1. Czym są pliki cookies", body:
    `Pliki cookie to niewielkie pliki tekstowe zapisywane na Twoim urządzeniu podczas korzystania z Platformy. Używamy też podobnych technologii, takich jak localStorage i sessionStorage.` },
  { id: "c2", title: "2. Podstawa korzystania", body:
    `Cookie niezbędne stosujemy w oparciu o prawnie uzasadniony interes i konieczność świadczenia usługi. Cookie inne niż niezbędne (np. analityczne) stosujemy wyłącznie po wyrażeniu przez Ciebie zgody w bannerze.` },
  { id: "c-table", title: "Wykaz stosowanych plików cookie", toc: "Wykaz plików cookie", body: (
    <>
      <div className="my-3 overflow-x-auto rounded-xl border" style={{ borderColor: "rgba(203,213,225,0.6)" }}>
        <table className="w-full text-[13px] border-collapse min-w-[640px]">
          <thead style={{ background: "var(--selected)" }}>
            <tr>
              <th className={th}>Nazwa</th>
              <th className={th}>Dostawca</th>
              <th className={th}>Cel</th>
              <th className={th}>Kategoria</th>
              <th className={th}>Czas</th>
              <th className={th}>Niezbędny</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((c) => (
              <tr key={c.name} className="border-t" style={{ borderColor: "rgba(203,213,225,0.5)" }}>
                <td className={`${td} font-mono text-slate-800 whitespace-nowrap`}>{c.name}</td>
                <td className={td}>{c.provider}</td>
                <td className={td}>{c.purpose}</td>
                <td className={td}>{c.cat}</td>
                <td className={td}>{c.ttl}</td>
                <td className={td}>{c.necessary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        Dodatkowo w pamięci przeglądarki (localStorage) zapisujemy: <span className="font-mono text-slate-800">tc-consent</span> (Twój wybór cookie),
        <span className="font-mono text-slate-800"> theme</span> (jasny/ciemny motyw) oraz techniczny stan interfejsu — do czasu wyczyszczenia przez Ciebie.
        W sessionStorage zapisujemy <span className="font-mono text-slate-800">tc_pending_otp</span> (adres oczekujący na weryfikację) — do zamknięcia karty lub zakończenia rejestracji.
      </p>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        Obecnie nie stosujemy cookie marketingowych ani zewnętrznych narzędzi analityki (np. Google Analytics). Nasza statystyka jest realizowana jako pierwszej strony.
      </p>
    </>
  )},
  { id: "c3", title: "3. Cookies konieczne", body:
    `Niezbędne do działania Platformy — logowanie, sesja, bezpieczeństwo, zapamiętanie zgody. Nie można ich wyłączyć bez utraty podstawowych funkcji.` },
  { id: "c4", title: "4. Cookies bezpieczeństwa", body:
    `Wspierają bezpieczeństwo i integralność sesji oraz ochronę przed nadużyciami (np. limit ponownej wysyłki kodu).` },
  { id: "c5", title: "5. Cookies sesyjne", body:
    `Utrzymują stan sesji użytkownika; część z nich wygasa po zakończeniu sesji lub w krótkim czasie.` },
  { id: "c6", title: "6. Cookies uwierzytelniające", body:
    `Umożliwiają rozpoznanie zalogowanego użytkownika (obsługiwane m.in. przez mechanizm sesji Supabase na naszej domenie).` },
  { id: "c7", title: "7. Cookies preferencji", body:
    `Zapamiętują ustawienia, np. wybór motywu czy Twoją decyzję dotyczącą cookie.` },
  { id: "c8", title: "8. Cookies analityczne", body:
    `Służą do anonimowej statystyki odwiedzin i ulepszania Platformy. Uruchamiamy je dopiero po wyrażeniu zgody; przed zgodą nie są zapisywane.` },
  { id: "c9", title: "9. Cookies marketingowe", body:
    `Obecnie nie używamy cookie marketingowych. Kategoria pozostaje w ustawieniach na przyszłość i pozostaje wyłączona do czasu ewentualnej zgody.` },
  { id: "c10", title: "10. LocalStorage", body:
    `Wykorzystujemy localStorage do zapisu zgody cookie (tc-consent), motywu (theme) oraz technicznego stanu interfejsu. Dane te pozostają do czasu ich wyczyszczenia.` },
  { id: "c11", title: "11. SessionStorage", body:
    `Wykorzystujemy sessionStorage w procesie rejestracji (tc_pending_otp — adres oczekujący na weryfikację). Dane są usuwane po zamknięciu karty lub zakończeniu rejestracji.` },
  { id: "c12", title: "12. Inne technologie śledzące", body:
    `Poza powyższymi nie stosujemy pikseli reklamowych, fingerprintingu ani zewnętrznych skryptów śledzących.` },
  { id: "c13", title: "13. Dostawcy zewnętrzni", body:
    `Niektóre funkcje realizują dostawcy zewnętrzni, którzy mogą używać własnych cookie na swoich domenach (np. podczas płatności lub logowania Google).` },
  { id: "c14", title: "14. Google", body:
    `Jeśli korzystasz z logowania Google (OAuth), Google może stosować własne cookie na swoich stronach w procesie uwierzytelniania. Nie używamy Google Analytics.` },
  { id: "c15", title: "15. Stripe", body:
    `Podczas płatności/rozliczeń Stripe może stosować własne cookie (m.in. w celu bezpieczeństwa i przeciwdziałania oszustwom) na stronach Stripe.` },
  { id: "c16", title: "16. Supabase", body:
    `Mechanizm uwierzytelniania Supabase zapisuje cookie sesyjne na naszej domenie (first-party), niezbędne do utrzymania logowania.` },
  { id: "c17", title: "17. Inne technologie wykryte w aplikacji", body:
    `Na podstawie audytu kodu: statystyka pierwszej strony (tc_vid, tc_sid) uruchamiana po zgodzie, cookie zgody (tc_consent) oraz techniczny cookie ochrony przed nadużyciem (tc_otp_sent_at). Nie wykryto zewnętrznych narzędzi analityczno-marketingowych.` },
  { id: "c18", title: "18. Czas przechowywania", body:
    `Czasy przechowywania wskazano w tabeli powyżej. Cookie sesyjne wygasają wraz z sesją; cookie trwałe po upływie wskazanego okresu lub po ich wyczyszczeniu.` },
  { id: "c19", title: "19. Cookies własne (first-party)", body:
    `Cookie first-party (tc_consent, tc_otp_sent_at, tc_vid, tc_sid oraz sesja Supabase) są ustawiane w domenie ${LEGAL.DOMAIN}.` },
  { id: "c20", title: "20. Cookies podmiotów trzecich (third-party)", body:
    `Cookie podmiotów trzecich mogą pojawić się wyłącznie w kontekście usług zewnętrznych (np. strony Stripe, logowanie Google) i podlegają politykom tych podmiotów.` },
  { id: "c21", title: "21. Zgoda", body:
    `Przy pierwszej wizycie wyświetlamy banner umożliwiający: „Akceptuję”, „Tylko niezbędne” oraz szczegółowe „Ustawienia” z osobnym wyborem kategorii opcjonalnych. Do czasu zgody nie uruchamiamy cookie innych niż niezbędne.` },
  { id: "c22", title: "22. Wycofanie zgody", body:
    `Zgodę możesz w każdej chwili zmienić lub wycofać — użyj przycisku poniżej albo wyczyść dane witryny w przeglądarce. Wycofanie nie wpływa na zgodność z prawem wcześniejszego przetwarzania.` },
  { id: "c23", title: "23. Ustawienia cookies", body: (
    <>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        Swoje preferencje możesz zmienić w dowolnym momencie:
      </p>
      <div className="my-3"><CookieSettingsButton /></div>
    </>
  )},
  { id: "c24", title: "24. Ustawienia przeglądarki", body:
    `Możesz też zarządzać cookie w ustawieniach przeglądarki — blokować je lub usuwać. Sposób różni się w zależności od przeglądarki.` },
  { id: "c25", title: "25. Skutki blokowania cookies niezbędnych", body:
    `Zablokowanie cookie niezbędnych może uniemożliwić logowanie, utrzymanie sesji i korzystanie z kluczowych funkcji Platformy.` },
  { id: "c26", title: "26. Zmiany", body:
    `Politykę Cookies możemy aktualizować; data ostatniej aktualizacji jest wskazana na górze dokumentu.` },
  { id: "c27", title: "27. Kontakt", body:
    `Pytania dotyczące cookie: ${E}.` },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Polityka Cookies TermCatch"
      subtitle="Zarządzaj plikami cookie i dowiedz się, jak ich używamy"
      showOperator={false}
      intro={
        <p>
          Poniżej wyjaśniamy, jakich plików cookie i podobnych technologii używamy w {LEGAL.BRAND}, w jakim celu oraz jak
          możesz zarządzać swoją zgodą. Cookie inne niż niezbędne uruchamiamy dopiero po wyrażeniu zgody.
        </p>
      }
      sections={sections}
    />
  );
}
