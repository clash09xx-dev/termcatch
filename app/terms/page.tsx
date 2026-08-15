import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Regulamin Platformy TermCatch",
  description:
    "Regulamin platformy TermCatch, technologicznego pośrednika umożliwiającego wyszukiwanie usługodawców, rezerwacje online i zarządzanie działalnością usługową.",
};

const E = LEGAL.CONTACT_EMAIL;

const sections: LegalSection[] = [
  { id: "s1", title: "§1 Postanowienia ogólne", body: [
    `Niniejszy Regulamin określa zasady korzystania z platformy ${LEGAL.BRAND}, dostępnej pod adresem ${LEGAL.DOMAIN} oraz w powiązanych aplikacjach i interfejsach (dalej „Platforma”).`,
    `Operatorem Platformy jest ${LEGAL.COMPANY_NAME} (${LEGAL.LEGAL_FORM}), z siedzibą pod adresem ${LEGAL.REGISTERED_ADDRESS}, NIP ${LEGAL.NIP}, REGON ${LEGAL.REGON}, KRS ${LEGAL.KRS} (dalej „${LEGAL.BRAND}”, „Operator”, „my”).`,
    `Kontakt z Operatorem jest możliwy pod adresem ${E}.`,
    `Regulamin jest udostępniany nieodpłatnie w sposób umożliwiający jego pozyskanie, odtworzenie i utrwalenie.`,
  ]},
  { id: "s2", title: "§2 Definicje", body: [
    `Platforma — usługa cyfrowa ${LEGAL.BRAND} obejmująca wyszukiwarkę, profile Usługodawców, kalendarze, system rezerwacji, powiadomienia oraz narzędzia SaaS do zarządzania działalnością.`,
    `Klient — osoba korzystająca z Platformy w celu znalezienia Usługodawcy i dokonania Rezerwacji.`,
    `Usługodawca — niezależny przedsiębiorca (np. fryzjer, barber, kosmetolog, masażysta, fizjoterapeuta, tatuażysta, groomer, mechanik lub inny usługodawca) prezentujący ofertę i przyjmujący Rezerwacje za pośrednictwem Platformy.`,
    `Konto Biznesowe — konto Usługodawcy; Konto Klienta — konto osoby rezerwującej.`,
    `Rezerwacja — zgłoszenie i potwierdzenie terminu Usługi Usługodawcy dokonane w Platformie.`,
    `Usługa Usługodawcy — usługa świadczona przez Usługodawcę na rzecz Klienta, której ${LEGAL.BRAND} nie wykonuje.`,
    `Abonament — odpłatny plan SaaS udostępniany Usługodawcom. Cennik — aktualny cennik Platformy.`,
  ]},
  { id: "s3", title: "§3 Zakres usług TermCatch", body: [
    `${LEGAL.BRAND} udostępnia infrastrukturę technologiczną: wyszukiwanie i odkrywanie Usługodawców, profile, kalendarze i dostępność, obsługę Rezerwacji, powiadomienia e-mail/SMS, narzędzia CRM i zarządzania działalnością oraz płatne plany abonamentowe.`,
    `${LEGAL.BRAND} świadczy usługę drogą elektroniczną polegającą na umożliwieniu kontaktu i umówienia terminu pomiędzy Klientem a Usługodawcą oraz na dostarczaniu narzędzi SaaS Usługodawcom.`,
  ]},
  { id: "s4", title: "§4 Charakter TermCatch jako pośrednika", body: (
    <>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        {LEGAL.BRAND} jest platformą technologiczną i pośrednikiem internetowym. {LEGAL.BRAND} nie jest stroną umowy o wykonanie
        Usługi Usługodawcy i nie świadczy usług fryzjerskich, kosmetycznych, medycznych, fizjoterapeutycznych ani żadnych innych
        usług oferowanych przez Usługodawców, chyba że przy konkretnej funkcji wyraźnie wskazano inaczej.
      </p>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        Umowa dotycząca wykonania konkretnej Usługi jest zawierana bezpośrednio pomiędzy Klientem a niezależnym Usługodawcą.
        Umożliwienie komunikacji lub przekazywanie powiadomień nie czyni {LEGAL.BRAND} stroną tej umowy.
      </p>
    </>
  )},
  { id: "s5", title: "§5 Wymagania techniczne", body:
    `Do korzystania z Platformy wymagane są: urządzenie z dostępem do Internetu, aktualna przeglądarka obsługująca HTTPS, JavaScript i pliki cookie niezbędne oraz aktywny adres e-mail. Niektóre funkcje wymagają włączonych powiadomień lub numeru telefonu.` },
  { id: "s6", title: "§6 Rejestracja Konta Klienta", body:
    `Założenie Konta Klienta wymaga podania prawdziwych danych i potwierdzenia adresu e-mail kodem weryfikacyjnym (6- lub 8-cyfrowym) wysyłanym e-mailem. Klient odpowiada za prawdziwość podanych danych oraz za ich aktualizację.` },
  { id: "s7", title: "§7 Rejestracja Konta Biznesowego", body:
    `Konto Biznesowe zakłada Usługodawca lub osoba upoważniona do jego reprezentowania, oświadczając, że jest uprawniona do prowadzenia działalności i publikowania ofert. Rejestracja Konta Biznesowego wymaga akceptacji Regulaminu i prowadzi do procesu onboardingu (dane działalności, usługi, godziny, plan).` },
  { id: "s8", title: "§8 Weryfikacja danych", body:
    `${LEGAL.BRAND} może weryfikować poprawność i kompletność danych oraz stosować środki przeciwdziałające nadużyciom. ${LEGAL.BRAND} nie weryfikuje jednak i nie gwarantuje kwalifikacji zawodowych, uprawnień, certyfikatów ani legalności działalności Usługodawcy — odpowiedzialność w tym zakresie ponosi Usługodawca (§15).` },
  { id: "s9", title: "§9 Profil Usługodawcy", body:
    `Usługodawca tworzy profil zawierający m.in. nazwę, opis, adres, dane kontaktowe, zdjęcia, usługi, ceny i godziny. Treści profilu pochodzą od Usługodawcy i to on odpowiada za ich zgodność ze stanem faktycznym i prawem.` },
  { id: "s10", title: "§10 Pracownicy i zespoły", body:
    `Usługodawca może dodawać pracowników/specjalistów oraz przypisywać im dostępność. Usługodawca odpowiada za posiadanie podstawy prawnej do przetwarzania danych swoich pracowników oraz za ich uprawnienia zawodowe.` },
  { id: "s11", title: "§11 Usługi publikowane przez Usługodawcę", body:
    `Usługodawca samodzielnie definiuje zakres usług, czas trwania, ceny i ewentualne dodatki. Opisy usług muszą być rzetelne i nie mogą wprowadzać w błąd.` },
  { id: "s12", title: "§12 Rezerwacje", body:
    `Klient dokonuje Rezerwacji, wybierając usługę, termin i — opcjonalnie — konkretnego specjalistę albo opcję „Dowolny specjalista”. Rezerwacje są co do zasady potwierdzane automatycznie, chyba że dana funkcja wymaga potwierdzenia przez Usługodawcę. System stosuje transakcyjne zabezpieczenie przed podwójną rezerwacją tego samego terminu.` },
  { id: "s13", title: "§13 Zawarcie umowy pomiędzy Klientem i Usługodawcą", body: (
    <>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        Dokonanie i potwierdzenie Rezerwacji prowadzi do zawarcia umowy o wykonanie Usługi wyłącznie pomiędzy Klientem
        a Usługodawcą. {LEGAL.BRAND} nie jest stroną tej umowy i nie odpowiada za jej wykonanie.
      </p>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        Za należyte wykonanie Usługi, jej jakość, bezpieczeństwo i zgodność z opisem odpowiada wyłącznie Usługodawca.
      </p>
    </>
  )},
  { id: "s14", title: "§14 Obowiązki Klienta", body:
    `Klient zobowiązuje się podawać prawdziwe dane, stawiać się na umówione wizyty lub odwoływać/przekładać je zgodnie z polityką Usługodawcy, korzystać z Platformy zgodnie z prawem i Regulaminem oraz nie nadużywać funkcji (np. fikcyjne rezerwacje, manipulowanie opiniami).` },
  { id: "s15", title: "§15 Obowiązki Usługodawcy", body: [
    `Usługodawca ponosi wyłączną odpowiedzialność za: jakość i wykonanie usług, kwalifikacje i uprawnienia pracowników, posiadane licencje/zezwolenia, skutki zdrowotne i ewentualne szkody, rzetelność opisów, cen, dostępności i godzin, obsługę reklamacji dotyczących usług, rozliczenia podatkowe oraz legalność własnej działalności.`,
    `Usługodawca zobowiązuje się utrzymywać aktualne i prawdziwe dane profilu, cennik, dostępność i informacje o kwalifikacjach.`,
  ]},
  { id: "s16", title: "§16 Ceny usług Usługodawców", body:
    `Ceny Usług ustala i pobiera Usługodawca według własnego cennika. Ceny prezentowane w profilu pochodzą od Usługodawcy; ${LEGAL.BRAND} nie ustala cen usług i nie jest ich sprzedawcą.` },
  { id: "s17", title: "§17 Zmiany i anulowanie Rezerwacji", body:
    `Klient może zmienić lub anulować Rezerwację nie później niż na liczbę godzin przed terminem ustaloną przez Usługodawcę w polityce anulowania (domyślnie 24 godziny), o ile prawo bezwzględnie obowiązujące nie stanowi inaczej. Po tym czasie zmiana może wymagać kontaktu z Usługodawcą.` },
  { id: "s18", title: "§18 Nieobecność Klienta / No-show", body:
    `Usługodawca może oznaczyć nieobecność Klienta (no-show) oraz stosować własną politykę wobec nieodwołanych wizyt. Ewentualne opłaty za no-show są należnością Usługodawcy, nie ${LEGAL.BRAND}.` },
  { id: "s19", title: "§19 Odwołanie wizyty przez Usługodawcę", body:
    `Odwołanie wizyty przez Usługodawcę wymaga podania powodu, który jest zapisywany i przekazywany Klientowi (e-mail/w aplikacji) wraz z możliwością ponownej rezerwacji. ${LEGAL.BRAND} nie odpowiada za odwołania i opóźnienia po stronie Usługodawcy.` },
  { id: "s20", title: "§20 Powiadomienia e-mail i SMS", body:
    `${LEGAL.BRAND} może wysyłać powiadomienia transakcyjne (potwierdzenia, przypomnienia, zmiany, prośby o opinię). Powiadomienia SMS wysyłane są wyłącznie po włączeniu odpowiednich ustawień i mogą zależeć od dostępności operatora. Nadawca alfanumeryczny SMS może być jednokierunkowy — nie należy odpowiadać na takie wiadomości.` },
  { id: "s21", title: "§21 Opinie", body:
    `Opinie mogą wystawiać Klienci w związku ze zrealizowaną wizytą. Opinie muszą być rzetelne i zgodne z doświadczeniem; zabronione są opinie fałszywe, opłacane lub wprowadzające w błąd.` },
  { id: "s22", title: "§22 Weryfikacja opinii", body:
    `${LEGAL.BRAND} podejmuje uzasadnione środki, aby opinie pochodziły od osób korzystających z Usług (np. powiązanie opinii ze zrealizowaną wizytą). ${LEGAL.BRAND} może usuwać opinie naruszające Regulamin lub prawo.` },
  { id: "s23", title: "§23 Ranking wyników wyszukiwania", body: (
    <>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">Kolejność wyników wyszukiwania może uwzględniać w szczególności:</p>
      <ul className="my-2 ml-5 list-disc space-y-1 text-[15px] leading-relaxed text-slate-600">
        <li>trafność zapytania i dopasowanie usługi,</li>
        <li>lokalizację i odległość,</li>
        <li>dostępność terminów,</li>
        <li>ocenę oraz liczbę i jakość opinii,</li>
        <li>kompletność profilu,</li>
        <li>popularność i zachowanie użytkowników,</li>
        <li>konwersję rezerwacji,</li>
        <li>sygnały dotyczące anulowań i nieobecności,</li>
        <li>płatną promocję — o ile jest wyraźnie oznaczona.</li>
      </ul>
    </>
  )},
  { id: "s24", title: "§24 Płatna promocja / Boost", body:
    `Jeżeli funkcja płatnej promocji jest udostępniona, Usługodawca może zwiększać widoczność swojego profilu odpłatnie zgodnie z Cennikiem. Miejsca płatne są prezentowane w sposób umożliwiający ich rozpoznanie jako promowane/sponsorowane.` },
  { id: "s25", title: "§25 Profile sponsorowane", body:
    `Profile lub pozycje sponsorowane, jeżeli występują, są oznaczane jako „sponsorowane” lub „promowane”. Oznaczenie płatnego charakteru nie wpływa na obowiązek rzetelności prezentowanych treści.` },
  { id: "s26", title: "§26 Plany abonamentowe TermCatch", body:
    `${LEGAL.BRAND} udostępnia Usługodawcom plany abonamentowe (obecnie m.in. Darmowy, Solo, Team, Professional, Ultimate) o zakresie i cenie wskazanych w Cenniku. Aktualne ceny i limity prezentowane są na stronie cennika przed zawarciem umowy.` },
  { id: "s27", title: "§27 Okres próbny", body:
    `Nowy Usługodawca może skorzystać z bezpłatnego okresu próbnego (obecnie 7 dni). Metoda płatności może być pobierana już przy rozpoczęciu okresu próbnego, aby po jego zakończeniu abonament mógł być kontynuowany. Powtórne korzystanie z okresu próbnego może być ograniczone.` },
  { id: "s28", title: "§28 Płatności Stripe", body:
    `Płatności abonamentowe obsługuje operator Stripe. ${LEGAL.BRAND} nie przechowuje pełnych danych kart płatniczych — są one przetwarzane przez Stripe zgodnie ze standardami branżowymi.` },
  { id: "s29", title: "§29 Automatyczne odnawianie abonamentu", body:
    `Abonament odnawia się automatycznie na kolejny okres rozliczeniowy, chyba że zostanie wypowiedziany przed końcem bieżącego okresu. Informacja o odnowieniu i najbliższym obciążeniu jest dostępna w panelu rozliczeń.` },
  { id: "s30", title: "§30 Zmiana planu", body:
    `Usługodawca może zmienić plan w panelu; skutki (proporcjonalne rozliczenia, dostępność funkcji) wynikają z ustawień operatora płatności i Cennika.` },
  { id: "s31", title: "§31 Limity planów", body:
    `Plany różnią się limitami zasobów, w szczególności liczbą aktywnych specjalistów i lokalizacji. Aktualne limity określa Cennik; przekroczenie limitu może wymagać wyższego planu.` },
  { id: "s32", title: "§32 Limit pracowników", body:
    `Liczba aktywnych pracowników jest ograniczona zależnie od planu (przykładowo: Solo — 1, Team — 4, Professional — 15, Ultimate — bez limitu). Wartości mogą być aktualizowane w Cenniku.` },
  { id: "s33", title: "§33 Limit lokalizacji", body:
    `Liczba aktywnych lokalizacji jest ograniczona zależnie od planu (przykładowo: Solo/Team — 1, Professional — 2, Ultimate — bez limitu). Wartości mogą być aktualizowane w Cenniku.` },
  { id: "s34", title: "§34 Upgrade planu", body:
    `Podniesienie planu udostępnia wyższe limity i funkcje. Rozliczenie następuje zgodnie z zasadami operatora płatności.` },
  { id: "s35", title: "§35 Downgrade planu", body:
    `Obniżenie planu może wymagać wcześniejszego dostosowania liczby aktywnych zasobów do niższego limitu. ${LEGAL.BRAND} nie usuwa danych wyłącznie z powodu obniżenia planu, lecz część funkcji może stać się niedostępna.` },
  { id: "s36", title: "§36 Rezygnacja z subskrypcji", body:
    `Usługodawca może zrezygnować z abonamentu w panelu rozliczeń (Customer Portal Stripe). Rezygnacja odnosi skutek na koniec opłaconego okresu, o ile nie wskazano inaczej.` },
  { id: "s37", title: "§37 Nieudana płatność", body:
    `W razie nieudanej płatności ${LEGAL.BRAND} może poinformować Usługodawcę i wyznaczyć czas na aktualizację metody płatności. Do czasu uregulowania należności dostęp do funkcji płatnych może zostać ograniczony.` },
  { id: "s38", title: "§38 Zawieszenie funkcji płatnych", body:
    `Brak ważnej płatności może skutkować zawieszeniem funkcji płatnych. Dane Usługodawcy nie są z tego powodu usuwane; po uregulowaniu należności dostęp jest przywracany.` },
  { id: "s39", title: "§39 Prowizja od klienta pozyskanego przez TermCatch", body:
    `Jeżeli zgodnie z aktualnym Cennikiem dany model rozliczenia przewiduje prowizję, ${LEGAL.BRAND} może pobierać prowizję w wysokości wskazanej przed zawarciem umowy, w szczególności 20% wartości pierwszej kwalifikowanej, zrealizowanej wizyty nowego Klienta pozyskanego za pośrednictwem ${LEGAL.BRAND}. Prowizja nie dotyczy każdej wizyty, a wyłącznie pierwszej kwalifikowanej, zrealizowanej wizyty Klienta faktycznie pozyskanego przez Platformę.` },
  { id: "s40", title: "§40 Definicja nowego klienta", body:
    `Nowym Klientem pozyskanym przez ${LEGAL.BRAND} jest osoba, która trafiła do danego Usługodawcy za pośrednictwem Platformy i nie była wcześniej jego klientem. Kwalifikacja opiera się na danych dostępnych w Platformie (m.in. e-mail, numer telefonu, historia rezerwacji, dane CRM).` },
  { id: "s41", title: "§41 Zapobieganie obchodzeniu prowizji", body:
    `W celu zapewnienia prawidłowego naliczania ${LEGAL.BRAND} może wykorzystywać e-mail, numer telefonu, historię rezerwacji i dane CRM do zapobiegania podwójnemu liczeniu oraz do wykrywania prób obejścia rozliczeń. Usługodawca może zakwestionować błędne przypisanie, a ${LEGAL.BRAND} rozpatrzy taki wniosek w oparciu o dostępne dane.` },
  { id: "s42", title: "§42 Faktury", body:
    `Za abonament ${LEGAL.BRAND} wystawiane są dokumenty rozliczeniowe zgodnie z obowiązującymi przepisami. Za rozliczenia i dokumenty dotyczące Usług świadczonych Klientom odpowiada Usługodawca.` },
  { id: "s43", title: "§43 Integracje zewnętrzne", body:
    `Platforma korzysta z usług podmiotów zewnętrznych wskazanych poniżej. Korzystanie z tych usług podlega także ich własnym regulaminom i politykom.` },
  { id: "s44", title: "§44 Stripe", body: `Stripe — obsługa płatności i rozliczeń abonamentowych oraz (o ile aktywne) płatności online.` },
  { id: "s45", title: "§45 Twilio", body: `Twilio — wysyłka wiadomości SMS (i opcjonalnie innych kanałów), o ile funkcja SMS jest włączona.` },
  { id: "s46", title: "§46 Resend", body: `Resend — dostarczanie transakcyjnych wiadomości e-mail.` },
  { id: "s47", title: "§47 Supabase", body: `Supabase — uwierzytelnianie użytkowników oraz hostowana baza danych.` },
  { id: "s48", title: "§48 Fakturownia", body: `Fakturownia — usługa fakturowania; może zostać uruchomiona w przyszłości. Do czasu jej aktywacji integracja nie jest wykorzystywana.` },
  { id: "s49", title: "§49 Treści użytkowników", body:
    `Użytkownicy (Klienci i Usługodawcy) mogą zamieszczać treści (opisy, zdjęcia, opinie, odpowiedzi). Zamieszczający oświadcza, że posiada prawa do treści i że nie naruszają one praw osób trzecich ani przepisów.` },
  { id: "s50", title: "§50 Licencja na treści", body:
    `Zamieszczając treści, użytkownik udziela ${LEGAL.BRAND} niewyłącznej, nieodpłatnej licencji na ich wykorzystanie w zakresie niezbędnym do świadczenia i promocji Platformy (np. wyświetlanie profilu w wynikach). Licencja wygasa w zakresie danej treści po jej usunięciu, z wyjątkiem kopii wymaganych prawem lub uzasadnionych technicznie (kopie zapasowe).` },
  { id: "s51", title: "§51 Zdjęcia i materiały salonów", body:
    `Usługodawca odpowiada za posiadanie praw do zamieszczanych zdjęć i materiałów oraz za zgody osób widocznych na zdjęciach.` },
  { id: "s52", title: "§52 Zabronione treści", body: (
    <>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">Zabronione jest zamieszczanie treści w szczególności:</p>
      <ul className="my-2 ml-5 list-disc space-y-1 text-[15px] leading-relaxed text-slate-600">
        <li>bezprawnych, naruszających dobra osobiste lub prawa własności intelektualnej,</li>
        <li>wprowadzających w błąd co do usług, cen lub kwalifikacji,</li>
        <li>obraźliwych, dyskryminujących, nawołujących do przemocy,</li>
        <li>zawierających dane osobowe osób trzecich bez podstawy,</li>
        <li>o charakterze spamu lub złośliwego oprogramowania.</li>
      </ul>
    </>
  )},
  { id: "s53", title: "§53 Zabronione zachowania", body:
    `Zabronione jest korzystanie z Platformy w sposób naruszający prawo, zakłócający jej działanie, obchodzący zabezpieczenia, limity planów lub rozliczenia, a także podszywanie się pod inne osoby.` },
  { id: "s54", title: "§54 Spam i automatyzacja", body:
    `Zabronione jest masowe, niezamówione komunikowanie się oraz nieautoryzowane zautomatyzowane pozyskiwanie danych (scraping) czy generowanie ruchu.` },
  { id: "s55", title: "§55 Nadużycia", body:
    `${LEGAL.BRAND} może stosować środki wykrywania i ograniczania nadużyć (limity, weryfikacja, ograniczenie funkcji), z poszanowaniem praw użytkowników.` },
  { id: "s56", title: "§56 Manipulowanie opiniami", body:
    `Zabronione jest wystawianie, zamawianie lub wymuszanie fałszywych opinii oraz manipulowanie ocenami. Naruszenia mogą skutkować usunięciem opinii i sankcjami wobec konta.` },
  { id: "s57", title: "§57 Obchodzenie limitów planu", body:
    `Zabronione jest obchodzenie limitów planu (np. sztuczne dzielenie kont). ${LEGAL.BRAND} może egzekwować limity i weryfikować rzeczywiste wykorzystanie.` },
  { id: "s58", title: "§58 Bezpieczeństwo konta", body:
    `Użytkownik odpowiada za poufność danych logowania i za działania podejmowane w ramach konta. O nieautoryzowanym dostępie należy niezwłocznie powiadomić ${LEGAL.BRAND}.` },
  { id: "s59", title: "§59 Dostęp do konta", body:
    `Uwierzytelnianie odbywa się m.in. za pomocą hasła, kodu e-mail lub logowania Google. ${LEGAL.BRAND} może stosować dodatkowe mechanizmy bezpieczeństwa.` },
  { id: "s60", title: "§60 Zgłaszanie naruszeń", body:
    `Naruszenia Regulaminu lub prawa (w tym treści bezprawne) można zgłaszać pod adresem ${E}. Zgłoszenie powinno umożliwiać identyfikację treści i podstawę zgłoszenia.` },
  { id: "s61", title: "§61 Moderacja treści", body:
    `${LEGAL.BRAND} może moderować treści, w tym ograniczać ich widoczność lub je usuwać, w przypadku naruszenia Regulaminu lub prawa, działając w sposób proporcjonalny i niearbitralny.` },
  { id: "s62", title: "§62 DSA — zgłoszenia dotyczące nielegalnych treści", body:
    `Zgodnie z rozporządzeniem (UE) 2022/2065 (Akt o usługach cyfrowych, „DSA”) ${LEGAL.BRAND} udostępnia mechanizm zgłaszania treści potencjalnie nielegalnych pod adresem ${E}. Zgłaszający otrzymuje potwierdzenie, a decyzje moderacyjne są uzasadniane w zakresie wymaganym przez DSA, z możliwością odwołania.` },
  { id: "s63", title: "§63 Ograniczenie widoczności treści", body:
    `Zamiast usunięcia ${LEGAL.BRAND} może ograniczyć widoczność treści (np. depozycjonowanie, ukrycie), informując o tym w zakresie wymaganym prawem.` },
  { id: "s64", title: "§64 Zawieszenie konta", body:
    `${LEGAL.BRAND} może czasowo zawiesić konto w razie istotnego naruszenia, ryzyka bezpieczeństwa lub obowiązku prawnego, z poszanowaniem zasady proporcjonalności.` },
  { id: "s65", title: "§65 Usunięcie konta", body:
    `Użytkownik może usunąć konto; usunięcie potwierdzane jest kodem e-mail i powoduje kaskadowe usunięcie powiązanych danych, z wyjątkiem danych, które musimy zachować na podstawie prawa (np. rozliczenia) lub dla dochodzenia/obrony roszczeń.` },
  { id: "s66", title: "§66 Uzasadnianie decyzji wobec kont biznesowych", body:
    `Decyzje o ograniczeniu, zawieszeniu lub zakończeniu świadczenia usług wobec Konta Biznesowego są uzasadniane zgodnie z rozporządzeniem (UE) 2019/1150 (P2B) i DSA, wraz z informacją o dostępnych środkach odwoławczych.` },
  { id: "s67", title: "§67 Reklamacje dotyczące Platformy", body:
    `Reklamacje dotyczące działania Platformy (np. funkcji, rozliczeń abonamentu, powiadomień) należy kierować do ${LEGAL.BRAND} na adres ${E}. Rozpatrzymy je w rozsądnym terminie, nie dłuższym niż wymagany prawem.` },
  { id: "s68", title: "§68 Reklamacje dotyczące usług salonu", body:
    `Reklamacje dotyczące wykonania, jakości lub przebiegu Usługi świadczonej przez Usługodawcę należy co do zasady kierować bezpośrednio do Usługodawcy, który jest stroną umowy o wykonanie Usługi. ${LEGAL.BRAND} może pomóc w kontakcie, ale nie staje się przez to stroną tej umowy.` },
  { id: "s69", title: "§69 Rozdzielenie odpowiedzialności TermCatch i Usługodawcy", body: (
    <>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        W najszerszym zakresie dozwolonym przez prawo {LEGAL.BRAND} nie odpowiada za sprawy leżące po stronie Usługodawcy, w szczególności za:
      </p>
      <ul className="my-2 ml-5 list-disc space-y-1 text-[15px] leading-relaxed text-slate-600">
        <li>jakość i wykonanie usług oraz ich skutki zdrowotne i ewentualne szkody/obrażenia,</li>
        <li>kwalifikacje, licencje, zezwolenia i uprawnienia pracowników Usługodawcy,</li>
        <li>opisy usług, ceny, dostępność i godziny wprowadzone przez Usługodawcę,</li>
        <li>odwołania, opóźnienia i zachowanie Usługodawcy,</li>
        <li>obowiązki podatkowe i legalność działalności Usługodawcy,</li>
        <li>obsługę reklamacji Usług oraz spory dotyczące ich wykonania,</li>
        <li>treści tworzone przez Usługodawcę.</li>
      </ul>
      <p className="my-3 leading-relaxed text-[15px] text-slate-600">
        Za wszystkie powyższe kwestie odpowiada Usługodawca. Powyższe nie wyłącza ani nie ogranicza odpowiedzialności,
        której zgodnie z prawem wyłączyć lub ograniczyć nie można, ani praw konsumenta wynikających z przepisów bezwzględnie obowiązujących.
      </p>
    </>
  )},
  { id: "s70", title: "§70 Odpowiedzialność TermCatch", body: [
    `${LEGAL.BRAND} odpowiada za własne obowiązki w zakresie wymaganym przez prawo bezwzględnie obowiązujące, w szczególności za: działanie własnej usługi cyfrowej, rozliczenia abonamentu ${LEGAL.BRAND}, przetwarzanie danych, za które ${LEGAL.BRAND} jest administratorem, oraz obowiązki nałożone bezpośrednio na pośrednika/platformę.`,
    `Nie wyłącza się odpowiedzialności za winę umyślną oraz innej odpowiedzialności, której nie można wyłączyć zgodnie z prawem. Wobec konsumentów stosuje się zasady odpowiedzialności wynikające z przepisów o ochronie konsumentów.`,
  ]},
  { id: "s71", title: "§71 Odpowiedzialność Usługodawcy", body:
    `Usługodawca ponosi pełną odpowiedzialność wobec Klienta za zawarcie i wykonanie umowy o Usługę oraz za zgodność swojej działalności z prawem, a także zwalnia ${LEGAL.BRAND} z roszczeń osób trzecich wynikających z naruszenia tych obowiązków — w zakresie dozwolonym przez prawo.` },
  { id: "s72", title: "§72 Siła wyższa", body:
    `${LEGAL.BRAND} nie odpowiada za niewykonanie lub nienależyte wykonanie obowiązków spowodowane siłą wyższą (zdarzenia nadzwyczajne, niezależne i niemożliwe do przewidzenia).` },
  { id: "s73", title: "§73 Awaria usług zewnętrznych", body:
    `${LEGAL.BRAND} nie odpowiada za przerwy wynikające z awarii dostawców zewnętrznych (m.in. Stripe, Twilio, Resend, Supabase, hosting), dokładając jednak starań, by minimalizować ich skutki.` },
  { id: "s74", title: "§74 Dostępność Platformy", body:
    `${LEGAL.BRAND} dąży do zapewnienia wysokiej dostępności Platformy, lecz nie gwarantuje nieprzerwanego działania. Możliwe są przerwy techniczne i konserwacyjne.` },
  { id: "s75", title: "§75 Aktualizacje", body:
    `${LEGAL.BRAND} może aktualizować i rozwijać Platformę, w tym zmieniać lub wycofywać funkcje, z poszanowaniem praw nabytych i wymogów dotyczących usług cyfrowych.` },
  { id: "s76", title: "§76 Funkcje beta", body:
    `Funkcje oznaczone jako beta/eksperymentalne mogą działać niestabilnie i są udostępniane „tak jak są”, w zakresie dozwolonym prawem.` },
  { id: "s77", title: "§77 Funkcje AI", body:
    `Niektóre funkcje mogą wykorzystywać automatyzację lub sztuczną inteligencję (np. podpowiedzi, obserwacje analityczne). Mają one charakter pomocniczy i nie stanowią porady zawodowej, prawnej ani medycznej.` },
  { id: "s78", title: "§78 Odpowiedzialność za treści wygenerowane przez AI", body:
    `Treści generowane automatycznie mogą być niedokładne. Użytkownik powinien je weryfikować przed wykorzystaniem; ${LEGAL.BRAND} nie gwarantuje ich poprawności w zakresie dozwolonym prawem.` },
  { id: "s79", title: "§79 Własność intelektualna TermCatch", body:
    `Platforma, jej oprogramowanie, interfejsy, znaki towarowe i materiały ${LEGAL.BRAND} są chronione prawem. Korzystanie z nich poza zakresem dozwolonego użytku wymaga zgody ${LEGAL.BRAND}.` },
  { id: "s80", title: "§80 Własność intelektualna Usługodawcy", body:
    `Prawa do treści zamieszczonych przez Usługodawcę pozostają przy nim (z zastrzeżeniem licencji z §50). Usługodawca odpowiada za zgodność tych treści z prawem.` },
  { id: "s81", title: "§81 Ochrona marki TermCatch", body:
    `Zabronione jest korzystanie ze znaków, nazwy i identyfikacji wizualnej ${LEGAL.BRAND} w sposób wprowadzający w błąd lub sugerujący nieistniejące powiązanie.` },
  { id: "s82", title: "§82 Prawo odstąpienia", body:
    `Konsumentowi przysługuje prawo odstąpienia od umowy z ${LEGAL.BRAND} na zasadach wynikających z przepisów, chyba że zachodzi wyjątek ustawowy (np. pełne wykonanie usługi cyfrowej za wyraźną zgodą i po przyjęciu do wiadomości utraty prawa odstąpienia). Odstąpienie od umowy o Usługę zawartej z Usługodawcą podlega odrębnym zasadom po stronie Usługodawcy.` },
  { id: "s83", title: "§83 Konsumenci", body:
    `Postanowienia Regulaminu nie ograniczają praw konsumenta wynikających z bezwzględnie obowiązujących przepisów. W razie sprzeczności pierwszeństwo mają przepisy o ochronie konsumentów.` },
  { id: "s84", title: "§84 Przedsiębiorcy", body:
    `Wobec Usługodawców będących przedsiębiorcami odpowiedzialność ${LEGAL.BRAND} jest ograniczona w najszerszym zakresie dozwolonym prawem, z zastrzeżeniem winy umyślnej i przepisów bezwzględnie obowiązujących.` },
  { id: "s85", title: "§85 Przedsiębiorcy na prawach konsumenta", body:
    `Osobie fizycznej zawierającej umowę bezpośrednio związaną z jej działalnością, gdy nie ma ona dla niej charakteru zawodowego, przysługują wybrane uprawnienia konsumenckie zgodnie z przepisami.` },
  { id: "s86", title: "§86 P2B — użytkownicy biznesowi", body:
    `Wobec Usługodawców (użytkowników biznesowych) ${LEGAL.BRAND} stosuje wymogi rozporządzenia (UE) 2019/1150 (P2B), w tym przejrzystość warunków, informowanie o zmianach, uzasadnianie ograniczeń/zawieszeń oraz wewnętrzny tryb rozpatrywania skarg.` },
  { id: "s87", title: "§87 Główne parametry rankingu", body:
    `Zgodnie z P2B głównymi parametrami wpływającymi na ranking są czynniki wskazane w §23 (m.in. trafność, lokalizacja, dostępność, oceny i opinie, kompletność profilu, popularność i konwersja, sygnały anulowań/no-show oraz — oznaczona — płatna promocja). Płatna promocja jest ujawniana.` },
  { id: "s88", title: "§88 Zmiany Regulaminu", body:
    `${LEGAL.BRAND} może zmienić Regulamin z ważnych przyczyn (np. zmiany prawa, funkcji, bezpieczeństwa, modelu rozliczeń). Zmiany nie działają wstecz i nie naruszają praw nabytych.` },
  { id: "s89", title: "§89 Informowanie o zmianach", body:
    `O zmianach informujemy z wyprzedzeniem (np. e-mailem lub w Platformie). Wobec Usługodawców stosuje się terminy wynikające z P2B. Dalsze korzystanie po wejściu zmian w życie oznacza ich akceptację, z zastrzeżeniem prawa do wypowiedzenia.` },
  { id: "s90", title: "§90 Rozwiązanie umowy", body:
    `Umowa o korzystanie z Platformy może zostać rozwiązana przez użytkownika w każdym czasie (np. przez usunięcie konta lub rezygnację z abonamentu) oraz przez ${LEGAL.BRAND} w przypadkach wskazanych w Regulaminie lub prawie, z zachowaniem zasad P2B wobec Usługodawców.` },
  { id: "s91", title: "§91 Prawo właściwe", body:
    `Prawem właściwym jest prawo polskie, z zastrzeżeniem bezwzględnie obowiązujących przepisów ochrony konsumenta państwa jego zwykłego pobytu.` },
  { id: "s92", title: "§92 Rozwiązywanie sporów", body:
    `Spory będą rozwiązywane polubownie; konsument może skorzystać z pozasądowych sposobów rozpatrywania sporów, w tym platformy ODR (ec.europa.eu/consumers/odr). W braku porozumienia właściwy jest sąd powszechny zgodnie z przepisami.` },
  { id: "s93", title: "§93 Postanowienia końcowe", body:
    `W sprawach nieuregulowanych stosuje się przepisy prawa polskiego i UE. Jeżeli którekolwiek postanowienie okaże się nieważne, pozostałe zachowują moc. Regulamin obowiązuje od dnia ${LEGAL.EFFECTIVE_DATE}.` },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Regulamin Platformy TermCatch"
      subtitle={`Obowiązuje od: ${LEGAL.EFFECTIVE_DATE}`}
      intro={
        <p>
          {LEGAL.BRAND} jest platformą technologiczną umożliwiającą wyszukiwanie usługodawców, dokonywanie rezerwacji oraz
          zarządzanie działalnością usługową. {LEGAL.BRAND} nie jest stroną umowy dotyczącej wykonania konkretnej usługi
          oferowanej przez niezależnego Usługodawcę, chyba że przy danej funkcji wyraźnie wskazano inaczej.
        </p>
      }
      sections={sections}
    />
  );
}
