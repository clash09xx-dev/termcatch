import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Polityka Prywatności TermCatch",
  description:
    "Polityka prywatności TermCatch zgodna z RODO — jakie dane przetwarzamy, w jakich celach, komu je powierzamy, przez jaki czas i jakie masz prawa.",
};

const E = LEGAL.CONTACT_EMAIL;

const sections: LegalSection[] = [
  { id: "p1", title: "1. Administrator danych", body:
    `Administratorem danych w zakresie własnych operacji ${LEGAL.BRAND} (konta, abonamenty, bezpieczeństwo i działanie Platformy, marketing własny, obsługa marketplace) jest ${LEGAL.COMPANY_NAME} (${LEGAL.LEGAL_FORM}), ${LEGAL.REGISTERED_ADDRESS}, NIP ${LEGAL.NIP}, REGON ${LEGAL.REGON}, KRS ${LEGAL.KRS}. Rola ${LEGAL.BRAND} zależy jednak od kontekstu — patrz sekcje 2 oraz „Administrator a podmiot przetwarzający”.` },
  { id: "p2", title: "2. Jak się z nami skontaktować", body:
    `We wszystkich sprawach dotyczących danych osobowych możesz napisać na ${E}. Do czasu wyznaczenia inspektora ochrony danych (IOD) korespondencję obsługuje zespół ${LEGAL.BRAND} pod tym adresem.` },
  { id: "p3", title: "3. Zakres Polityki", body:
    `Polityka opisuje przetwarzanie danych w związku z korzystaniem z Platformy ${LEGAL.BRAND} (${LEGAL.DOMAIN}). Nie dotyczy przetwarzania prowadzonego samodzielnie przez Usługodawców we własnych celach ani przez inne serwisy, do których prowadzą odnośniki.` },
  { id: "p4", title: "4. Kategorie osób", body:
    `Przetwarzamy dane: Klientów, właścicieli/przedstawicieli salonów (Usługodawców), pracowników salonów, osób kontaktujących się z nami oraz potencjalnych klientów biznesowych.` },
  { id: "p5", title: "5. Dane Klientów", body:
    `Imię i nazwisko, adres e-mail, opcjonalnie numer telefonu, dane konta i uwierzytelniania, historia rezerwacji i preferencje, treści (opinie), dane techniczne.` },
  { id: "p6", title: "6. Dane właścicieli salonów", body:
    `Dane kontaktowe i identyfikacyjne, dane działalności, dane profilu i oferty, dane rozliczeniowe abonamentu, logi i dane techniczne.` },
  { id: "p7", title: "7. Dane pracowników salonów", body:
    `Imię, nazwisko, rola, dostępność i przypisania grafiku. Dane te wprowadza Usługodawca, który odpowiada za podstawę prawną ich przetwarzania (patrz sekcja o rolach).` },
  { id: "p8", title: "8. Dane osób kontaktujących się z TermCatch", body:
    `Dane podane w formularzu kontaktowym lub w wiadomości (imię, e-mail, treść), niezbędne do udzielenia odpowiedzi.` },
  { id: "p9", title: "9. Dane potencjalnych klientów biznesowych", body:
    `Dane niezbędne do przedstawienia oferty i kontaktu handlowego, przetwarzane na podstawie zgody lub prawnie uzasadnionego interesu.` },
  { id: "p10", title: "10. Dane techniczne", body:
    `Informacje o korzystaniu z Platformy, w tym zdarzenia analityczne (po wyrażeniu zgody), parametry sesji i bezpieczeństwa.` },
  { id: "p11", title: "11. Dane o urządzeniu", body:
    `Typ urządzenia i przeglądarki, ustawienia oraz zbliżone informacje techniczne przekazywane przez przeglądarkę.` },
  { id: "p12", title: "12. Adres IP", body:
    `Adres IP przetwarzamy dla bezpieczeństwa, zapobiegania nadużyciom i podstawowej diagnostyki. W statystykach dążymy do ograniczania danych i pseudonimizacji.` },
  { id: "p13", title: "13. Logi", body:
    `Logi techniczne i logi zdarzeń bezpieczeństwa przetwarzamy w celu zapewnienia poprawnego i bezpiecznego działania Platformy.` },
  { id: "p14", title: "14. Cookies i identyfikatory", body:
    `Wykorzystujemy pliki cookie i podobne technologie (m.in. localStorage) — szczegóły w Polityce Cookies. Cookie inne niż niezbędne stosujemy dopiero po wyrażeniu zgody.` },
  { id: "p15", title: "15. Dane rezerwacji", body:
    `Dane niezbędne do obsługi Rezerwacji: usługa, termin, specjalista, cena „snapshot”, status, notatki i powiązania z kontem Klienta i Usługodawcą.` },
  { id: "p16", title: "16. Historia wizyt", body:
    `Historia rezerwacji i wizyt służy realizacji umowy, obsłudze reklamacji, statystykom oraz — po stronie Usługodawcy — obsłudze klienta.` },
  { id: "p17", title: "17. Dane CRM", body:
    `W ramach narzędzi biznesowych Usługodawca może przetwarzać dane swoich klientów (CRM). W tym zakresie administratorem jest zwykle Usługodawca, a ${LEGAL.BRAND} działa jako podmiot przetwarzający (patrz sekcja o rolach).` },
  { id: "p18", title: "18. Dane płatnicze", body:
    `Płatności abonamentowe obsługuje Stripe. ${LEGAL.BRAND} nie przechowuje pełnych danych kart płatniczych — przetwarza je Stripe. ${LEGAL.BRAND} przechowuje dane rozliczeniowe (np. status subskrypcji, identyfikatory po stronie Stripe, daty i kwoty).` },
  { id: "p19", title: "19. Dane abonamentowe", body:
    `Informacje o planie, statusie subskrypcji, okresie próbnym, odnowieniach i płatnościach — na potrzeby świadczenia usługi SaaS i rozliczeń.` },
  { id: "p20", title: "20. Dane komunikacyjne", body:
    `Treść i metadane powiadomień (e-mail/SMS) oraz korespondencji z obsługą — w celu świadczenia usługi i obsługi zgłoszeń. Numery telefonów w logach są maskowane.` },
  { id: "p21", title: "21. Opinie", body:
    `Treść opinii, ocena i powiązanie ze zrealizowaną wizytą — w celu prezentacji opinii i utrzymania ich wiarygodności.` },
  { id: "p22", title: "22. Zdjęcia/profil", body:
    `Zdjęcia i materiały profilu przetwarzamy w celu prezentacji oferty. Za prawa do materiałów odpowiada podmiot, który je zamieścił.` },
  { id: "p23", title: "23. Cele przetwarzania", body:
    `Dane przetwarzamy w celach opisanych poniżej (sekcje 24–33), zawsze w oparciu o właściwą podstawę prawną (sekcje 34–38).` },
  { id: "p24", title: "24. Założenie konta", body: `Utworzenie i utrzymanie konta oraz uwierzytelnianie użytkownika.` },
  { id: "p25", title: "25. Realizacja umowy", body: `Świadczenie usług Platformy zgodnie z Regulaminem.` },
  { id: "p26", title: "26. Obsługa rezerwacji", body: `Umożliwienie dokonywania, zmiany i anulowania Rezerwacji oraz powiadomień z nimi związanych.` },
  { id: "p27", title: "27. Obsługa abonamentu", body: `Prowadzenie subskrypcji, rozliczeń i okresu próbnego.` },
  { id: "p28", title: "28. Bezpieczeństwo", body: `Zapewnienie bezpieczeństwa kont, danych i Platformy.` },
  { id: "p29", title: "29. Zapobieganie nadużyciom", body: `Wykrywanie i ograniczanie nadużyć, w tym prób obejścia limitów i rozliczeń.` },
  { id: "p30", title: "30. Reklamacje", body: `Rozpatrywanie reklamacji i zgłoszeń dotyczących Platformy.` },
  { id: "p31", title: "31. Marketing", body: `Marketing własny ${LEGAL.BRAND}, w granicach prawa i — gdy wymagane — za zgodą.` },
  { id: "p32", title: "32. Analityka", body: `Statystyka i ulepszanie Platformy. Analityka realizowana jest jako pierwszej strony i uruchamiana dopiero po zgodzie na cookie analityczne.` },
  { id: "p33", title: "33. Dochodzenie roszczeń", body: `Ustalenie, dochodzenie i obrona roszczeń.` },
  { id: "p34", title: "34. Podstawy prawne — art. 6 RODO", body:
    `Dane przetwarzamy na podstawie: art. 6 ust. 1 lit. b (umowa), lit. c (obowiązek prawny), lit. f (prawnie uzasadniony interes) oraz lit. a (zgoda) — zależnie od celu.` },
  { id: "p35", title: "35. Umowa", body: `Art. 6 ust. 1 lit. b RODO — przetwarzanie niezbędne do świadczenia usług Platformy i obsługi abonamentu.` },
  { id: "p36", title: "36. Obowiązek prawny", body: `Art. 6 ust. 1 lit. c RODO — m.in. obowiązki rozliczeniowo-podatkowe i wynikające z przepisów o usługach cyfrowych.` },
  { id: "p37", title: "37. Prawnie uzasadniony interes", body: `Art. 6 ust. 1 lit. f RODO — bezpieczeństwo, zapobieganie nadużyciom, marketing własny, dochodzenie roszczeń.` },
  { id: "p38", title: "38. Zgoda", body: `Art. 6 ust. 1 lit. a RODO — m.in. cookie analityczne/marketingowe oraz wybrane działania marketingowe. Zgodę można wycofać w każdej chwili.` },
  { id: "p39", title: "39. Odbiorcy danych", body:
    `Dane możemy powierzać zaufanym dostawcom działającym na nasze zlecenie (procesorom) oraz — w razie obowiązku — udostępniać uprawnionym organom. Poniżej wskazujemy głównych dostawców.` },
  { id: "p40", title: "40. Dostawcy hostingu/infrastruktury", body: `Dostawcy infrastruktury, hostingu i baz danych, którzy przetwarzają dane wyłącznie zgodnie z naszymi instrukcjami i umowami powierzenia.` },
  { id: "p41", title: "41. Supabase", body: `Supabase — uwierzytelnianie i hostowana baza danych.` },
  { id: "p42", title: "42. Stripe", body: `Stripe — obsługa płatności i abonamentów; przetwarza dane płatnicze (w tym dane kart, których ${LEGAL.BRAND} nie przechowuje).` },
  { id: "p43", title: "43. Twilio", body: `Twilio — wysyłka wiadomości SMS (gdy funkcja SMS jest włączona).` },
  { id: "p44", title: "44. Resend", body: `Resend — dostarczanie transakcyjnych wiadomości e-mail.` },
  { id: "p45", title: "45. Railway / hosting", body: `Railway — hosting aplikacji/uruchomienie środowiska produkcyjnego.` },
  { id: "p46", title: "46. Google OAuth", body: `Google — logowanie za pomocą konta Google (OAuth), jeśli użytkownik z niego korzysta.` },
  { id: "p47", title: "47. Fakturownia", body: `Fakturownia — usługa fakturowania; może zostać uruchomiona w przyszłości. Do czasu aktywacji dane nie są jej przekazywane.` },
  { id: "p48", title: "48. Organy publiczne", body: `Uprawnione organy — wyłącznie w zakresie i na podstawie obowiązujących przepisów.` },
  { id: "p49", title: "49. Inni odbiorcy", body: `Doradcy (np. prawni, księgowi) oraz — w razie reorganizacji — następcy prawni, z zachowaniem wymogów RODO.` },
  { id: "p50", title: "50. Transfer poza EOG", body:
    `Niektórzy dostawcy (m.in. Stripe, Twilio, Google, a także — zależnie od konfiguracji — hosting) mogą przetwarzać dane poza Europejskim Obszarem Gospodarczym. Nie oświadczamy, że dane nigdy nie opuszczają EOG.` },
  { id: "p51", title: "51. Mechanizmy transferu", body:
    `Transfery poza EOG odbywają się w oparciu o mechanizmy zgodne z rozdziałem V RODO, w szczególności standardowe klauzule umowne (SCC) oraz — gdy mają zastosowanie — decyzje o adekwatności (np. Data Privacy Framework), wraz z dodatkowymi zabezpieczeniami.` },
  { id: "p52", title: "52. Okres przechowywania", body: `Dane przechowujemy nie dłużej niż to konieczne dla danego celu lub wymagane prawem (sekcje 53–58).` },
  { id: "p53", title: "53. Konto", body: `Do czasu usunięcia konta i przez krótki, uzasadniony okres po nim (np. kopie zapasowe, obrona roszczeń).` },
  { id: "p54", title: "54. Rezerwacje", body: `Przez okres realizacji umowy i przedawnienia potencjalnych roszczeń.` },
  { id: "p55", title: "55. Faktury", body: `Przez okres wymagany przepisami podatkowo-rachunkowymi.` },
  { id: "p56", title: "56. Logi", body: `Przez okres niezbędny dla bezpieczeństwa i diagnostyki, następnie usuwane lub anonimizowane.` },
  { id: "p57", title: "57. Marketing", body: `Do czasu wniesienia sprzeciwu lub wycofania zgody.` },
  { id: "p58", title: "58. Roszczenia", body: `Do upływu terminów przedawnienia właściwych dla danego roszczenia.` },
  { id: "p59", title: "59. Prawa osoby", body: `Przysługują Ci prawa opisane w sekcjach 60–68. Szczegóły i sposób realizacji znajdziesz też na stronie „Twoje prawa — RODO”.` },
  { id: "p60", title: "60. Dostęp", body: `Prawo dostępu do danych i informacji o ich przetwarzaniu.` },
  { id: "p61", title: "61. Kopia", body: `Prawo do uzyskania kopii przetwarzanych danych.` },
  { id: "p62", title: "62. Sprostowanie", body: `Prawo do sprostowania nieprawidłowych lub uzupełnienia niekompletnych danych.` },
  { id: "p63", title: "63. Usunięcie", body: `Prawo do usunięcia danych („prawo do bycia zapomnianym”), z wyjątkami przewidzianymi prawem.` },
  { id: "p64", title: "64. Ograniczenie", body: `Prawo do ograniczenia przetwarzania w przypadkach określonych w RODO.` },
  { id: "p65", title: "65. Sprzeciw", body: `Prawo sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie oraz wobec marketingu bezpośredniego.` },
  { id: "p66", title: "66. Przenoszenie", body: `Prawo do przenoszenia danych przetwarzanych na podstawie zgody lub umowy w sposób zautomatyzowany.` },
  { id: "p67", title: "67. Cofnięcie zgody", body: `Prawo do wycofania zgody w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania sprzed wycofania.` },
  { id: "p68", title: "68. Skarga do Prezesa UODO", body:
    `Prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).` },
  { id: "p69", title: "69. Profilowanie", body:
    `Możemy stosować ograniczone profilowanie (np. na potrzeby rankingu, statystyk, zapobiegania nadużyciom). Nie prowadzi ono do decyzji wywołujących skutki prawne bez podstawy w RODO.` },
  { id: "p70", title: "70. Automatyczne decyzje", body:
    `Nie podejmujemy wobec Ciebie decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, wywołujących skutki prawne lub podobnie istotne, chyba że jest to dozwolone i z odpowiednimi zabezpieczeniami.` },
  { id: "p71", title: "71. AI", body:
    `Funkcje wykorzystujące automatyzację/AI mają charakter pomocniczy. Nie wykorzystujemy ich do w pełni zautomatyzowanego podejmowania decyzji o istotnych skutkach bez podstawy prawnej.` },
  { id: "p72", title: "72. Dane dzieci", body:
    `Platforma nie jest kierowana do dzieci. Nie zbieramy świadomie danych osób, które nie mogą samodzielnie zawrzeć umowy zgodnie z prawem.` },
  { id: "p73", title: "73. Bezpieczeństwo", body:
    `Stosujemy odpowiednie środki techniczne i organizacyjne (m.in. szyfrowanie transmisji, kontrola dostępu, maskowanie danych w logach), adekwatne do ryzyka.` },
  { id: "p74", title: "74. Naruszenia danych", body:
    `W razie naruszenia ochrony danych działamy zgodnie z RODO, w tym — gdy wymagane — zawiadamiamy organ nadzorczy i osoby, których dane dotyczą.` },
  { id: "p75", title: "75. Zmiany Polityki", body:
    `Polityka może być aktualizowana; o istotnych zmianach poinformujemy w Platformie lub e-mailem. Data ostatniej aktualizacji jest wskazana na górze dokumentu.` },
  { id: "p76", title: "76. Kontakt", body:
    `W sprawach danych osobowych: ${E}. Więcej o realizacji praw znajdziesz na stronie „Twoje prawa — RODO”.` },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Polityka Prywatności TermCatch"
      subtitle={`Obowiązuje od: ${LEGAL.EFFECTIVE_DATE}`}
      operatorHeading="Administrator danych"
      intro={
        <>
          <p>
            Niniejsza Polityka wyjaśnia, jakie dane osobowe przetwarzamy w związku z korzystaniem z {LEGAL.BRAND}, w jakich
            celach i na jakich podstawach, komu je powierzamy oraz jakie prawa Ci przysługują.
          </p>
          <p>
            <strong>Rola {LEGAL.BRAND} zależy od kontekstu.</strong> W zakresie własnych operacji (konto, abonament,
            bezpieczeństwo i działanie Platformy, marketing własny, rozliczenia, obsługa marketplace) {LEGAL.BRAND} jest
            administratorem. W zakresie danych klientów wprowadzanych do CRM przez Usługodawcę administratorem jest zwykle
            Usługodawca, a {LEGAL.BRAND} przetwarza te dane w jego imieniu jako podmiot przetwarzający — wówczas może mieć
            zastosowanie odrębna umowa powierzenia przetwarzania (DPA). Nie przypisujemy sobie jednej uniwersalnej roli.
          </p>
        </>
      }
      sections={sections}
    />
  );
}
