import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Twoje prawa dotyczące danych osobowych — RODO | TermCatch",
  description:
    "Prosto o Twoich prawach z RODO w TermCatch: dostęp, kopia, sprostowanie, usunięcie, ograniczenie, sprzeciw, przenoszenie i cofnięcie zgody — oraz jak je zrealizować.",
};

const E = LEGAL.CONTACT_EMAIL;

const sections: LegalSection[] = [
  { id: "r1", title: "1. Kto odpowiada za Twoje dane", body:
    `To, kto jest administratorem Twoich danych, zależy od sytuacji. Czasem jest to ${LEGAL.BRAND}, a czasem salon/usługodawca, z którego usług korzystasz. Poniżej wyjaśniamy, kiedy jest tak, a kiedy inaczej.` },
  { id: "r2", title: "2. Administrator a salon", body:
    `${LEGAL.BRAND} dostarcza technologię (wyszukiwanie, rezerwacje, narzędzia dla firm). Salon świadczy realną usługę. Dlatego odpowiedzialność za dane bywa podzielona.` },
  { id: "r3", title: "3. Kiedy TermCatch jest administratorem", body:
    `Gdy chodzi o Twoje konto ${LEGAL.BRAND}, abonament, bezpieczeństwo i działanie Platformy, marketing własny ${LEGAL.BRAND} oraz obsługę marketplace — administratorem jest ${LEGAL.BRAND}.` },
  { id: "r4", title: "4. Kiedy salon jest administratorem", body:
    `Gdy salon prowadzi własną bazę klientów (CRM), własną komunikację i obsługę wizyt w swoich celach — administratorem tych danych jest zwykle salon.` },
  { id: "r5", title: "5. Kiedy TermCatch działa jako podmiot przetwarzający", body:
    `W zakresie danych, które salon wprowadza do narzędzi ${LEGAL.BRAND} (np. CRM), ${LEGAL.BRAND} przetwarza je w imieniu salonu jako podmiot przetwarzający — na podstawie umowy powierzenia (DPA).` },
  { id: "r6", title: "6. Prawo dostępu", body:
    `Masz prawo dowiedzieć się, czy i jakie Twoje dane przetwarzamy oraz w jakim celu.` },
  { id: "r7", title: "7. Prawo do kopii danych", body:
    `Możesz poprosić o kopię swoich danych, które przetwarzamy.` },
  { id: "r8", title: "8. Prawo sprostowania", body:
    `Jeśli Twoje dane są nieprawidłowe lub niekompletne, możesz je poprawić — część danych zmienisz samodzielnie w ustawieniach konta.` },
  { id: "r9", title: "9. Prawo usunięcia", body:
    `Możesz poprosić o usunięcie danych, gdy nie są już potrzebne lub gdy cofniesz zgodę, a nie ma innej podstawy przetwarzania.` },
  { id: "r10", title: "10. Prawo do bycia zapomnianym", body:
    `To rozszerzenie prawa do usunięcia — w uzasadnionych przypadkach usuniemy dane także tam, gdzie zostały przez nas udostępnione, w granicach prawa.` },
  { id: "r11", title: "11. Prawo ograniczenia", body:
    `Możesz żądać ograniczenia przetwarzania, np. gdy kwestionujesz prawidłowość danych — do czasu wyjaśnienia.` },
  { id: "r12", title: "12. Prawo sprzeciwu", body:
    `Możesz sprzeciwić się przetwarzaniu opartemu na naszym prawnie uzasadnionym interesie oraz w każdej chwili sprzeciwić się marketingowi bezpośredniemu.` },
  { id: "r13", title: "13. Prawo przenoszenia", body:
    `Dane przetwarzane na podstawie zgody lub umowy w sposób zautomatyzowany możesz otrzymać w formacie nadającym się do przeniesienia.` },
  { id: "r14", title: "14. Cofnięcie zgody", body:
    `Zgodę (np. na cookie analityczne lub marketing) możesz wycofać w każdej chwili — bez wpływu na zgodność z prawem wcześniejszego przetwarzania.` },
  { id: "r15", title: "15. Profilowanie", body:
    `Stosujemy jedynie ograniczone profilowanie (np. ranking, statystyka, zapobieganie nadużyciom). Możesz zapytać nas o szczegóły.` },
  { id: "r16", title: "16. Automatyczne podejmowanie decyzji", body:
    `Nie podejmujemy wobec Ciebie w pełni automatycznych decyzji wywołujących skutki prawne bez odpowiedniej podstawy i zabezpieczeń.` },
  { id: "r17", title: "17. Skarga do Prezesa UODO", body:
    `Jeśli uważasz, że przetwarzamy dane niezgodnie z prawem, możesz złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).` },
  { id: "r18", title: "18. Jak zgłosić żądanie", body:
    `Najprościej napisz na ${E}, opisując, czego dotyczy Twoje żądanie. Część spraw (np. edycja profilu, usunięcie konta) załatwisz samodzielnie w aplikacji.` },
  { id: "r19", title: "19. Weryfikacja tożsamości", body:
    `Aby chronić Twoje dane, przed realizacją żądania możemy poprosić o potwierdzenie tożsamości (np. z adresu e-mail powiązanego z kontem).` },
  { id: "r20", title: "20. Termin odpowiedzi", body:
    `Odpowiadamy bez zbędnej zwłoki, co do zasady w ciągu miesiąca. W złożonych sprawach termin może zostać przedłużony, o czym poinformujemy.` },
  { id: "r21", title: "21. Kiedy możemy odmówić", body:
    `Możemy odmówić realizacji żądania, gdy przepisy na to pozwalają lub tego wymagają (np. obowiązek przechowywania faktur, ochrona praw innych osób, dochodzenie roszczeń). Odmowę uzasadnimy.` },
  { id: "r22", title: "22. Dane, których nie możemy natychmiast usunąć", body:
    `Niektóre dane musimy zachować przez wymagany prawem czas (np. dokumenty rozliczeniowe) lub dla obrony roszczeń — po tym okresie zostaną usunięte lub zanonimizowane.` },
  { id: "r23", title: "23. Jak usunąć konto", body:
    `Konto usuniesz w ustawieniach (strefa „danger”), potwierdzając operację kodem wysłanym e-mailem. Usunięcie kaskadowo usuwa powiązane dane, z wyjątkami wskazanymi wyżej.` },
  { id: "r24", title: "24. Jak pobrać dane", body:
    `Aby otrzymać kopię lub eksport danych, napisz na ${E} — przygotujemy je w rozsądnym terminie.` },
  { id: "r25", title: "25. Kontakt", body:
    `W sprawach danych osobowych pisz na ${E}. Gdy administratorem danych z CRM/obsługi klienta jest salon, część żądań dotyczących tych zapisów może wymagać kontaktu bezpośrednio z tym salonem — pomożemy Ci ustalić właściwego adresata.` },
];

export default function GdprPage() {
  return (
    <LegalPage
      title="Twoje prawa dotyczące danych osobowych"
      subtitle="RODO w praktyce — prosto i przejrzyście"
      showOperator={false}
      intro={
        <p>
          Na tej stronie wyjaśniamy w prosty sposób, jakie prawa przysługują Ci na podstawie RODO i jak możesz je
          zrealizować w {LEGAL.BRAND}. Pełne informacje znajdziesz w{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-slate-800">Polityce Prywatności</a>.
        </p>
      }
      sections={sections}
    />
  );
}
