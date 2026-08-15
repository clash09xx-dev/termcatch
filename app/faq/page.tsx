import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

export const metadata: Metadata = {
  title: "Pomoc i FAQ — najczęstsze pytania",
  description:
    "Jak działa TermCatch, jak klienci rezerwują wizyty, jak działa okres próbny i płatności oraz co dzieje się z danymi po anulowaniu planu.",
  alternates: { canonical: "/faq" },
};

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e2)",
  borderRadius: "1.25rem",
};

// Answers describe ONLY functionality that is implemented today, or explicitly
// label a capability as "being prepared" (multi-location, online payments).
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Jak działa TermCatch?",
    a: "Zakładasz konto salonu, dodajesz usługi i pracowników, ustawiasz godziny pracy i dostajesz jeden link do rezerwacji. Klienci rezerwują online, a Ty zarządzasz wszystkim w kalendarzu.",
  },
  {
    q: "Jak klienci rezerwują wizyty?",
    a: "Klient otwiera profil Twojego salonu, wybiera usługę, pracownika i wolny termin, podaje dane i potwierdza. Potwierdzenie wysyłamy e-mailem. Powiadomienia SMS uruchamiamy — do tego czasu działa kanał e-mail.",
  },
  {
    q: "Czy mogę dodać pracowników?",
    a: "Tak. W panelu (Zespół) dodajesz specjalistów wraz ze zdjęciem, stanowiskiem, opisem, przypisanymi usługami i widocznością w rezerwacji online. Osoby ukryte nie pojawiają się przy nowych rezerwacjach, a istniejące wizyty pozostają nienaruszone.",
  },
  {
    q: "Czy mogę mieć kilka lokalizacji?",
    a: "Obsługę wielu lokalizacji przygotowujemy. Obecnie salon działa jako jedna lokalizacja. Gdy funkcja będzie gotowa, włączymy ją bez utraty danych.",
  },
  {
    q: "Jak działają płatności?",
    a: "Subskrypcję TermCatch oraz płatności online obsługujemy przez Stripe. Uruchamiamy je, a do tego czasu salon działa w pełni i rozliczenia włączymy, gdy płatności będą gotowe. Nigdy nie pobieramy opłaty bez Twojej zgody.",
  },
  {
    q: "Czy mogę anulować subskrypcję?",
    a: "Tak, w każdej chwili z poziomu panelu Płatności (portal rozliczeń). Anulowanie nie usuwa danych salonu.",
  },
  {
    q: "Jak działa okres próbny?",
    a: "Nowy salon zaczyna od 7 dni za darmo. Metodę płatności podajesz przy zakładaniu subskrypcji, ale obciążamy Cię dopiero po zakończeniu okresu próbnego — chyba że anulujesz wcześniej.",
  },
  {
    q: "Czy TermCatch pobiera opłatę za pierwszą wizytę?",
    a: "Prowizję 20% pobieramy wyłącznie od pierwszej wizyty nowego klienta pozyskanego przez TermCatch. Od klientów, których już masz, nie pobieramy prowizji.",
  },
  {
    q: "Co się stanie z danymi po anulowaniu planu?",
    a: "Twoje dane pozostają: klienci, historia wizyt, usługi i pracownicy. Niczego nie usuwamy. Ponowny pełny dostęp do panelu wymaga aktywnej subskrypcji.",
  },
  {
    q: "Jak skontaktować się ze wsparciem?",
    a: (
      <>
        Napisz na{" "}
        <a href="mailto:hello@termcatch.com" className="underline underline-offset-2 hover:no-underline" style={{ color: "#334155" }}>
          hello@termcatch.com
        </a>
        . Odpowiadamy po polsku, tak szybko, jak to możliwe.
      </>
    ),
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: typeof item.a === "string" ? item.a : "Napisz na hello@termcatch.com." },
    })),
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{ background: "var(--selected)", border: "1px solid var(--hairline)", color: "#64748B" }}
            >
              Pomoc
            </div>
            <h1 className="text-4xl font-bold mb-3" style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}>
              Najczęstsze pytania
            </h1>
            <p className="text-lg" style={{ color: "#64748B" }}>
              Krótkie, szczere odpowiedzi. Jeśli czegoś brakuje, napisz do nas.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="p-6" style={card}>
                <h2 className="font-semibold mb-2 text-sm" style={{ color: "#0F172A", letterSpacing: "var(--track-heading)" }}>
                  {item.q}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
              Nie znalazłeś odpowiedzi?
            </p>
            <Link href="/contact" className="text-sm font-semibold btn-spring" style={{ color: "#475569" }}>
              Skontaktuj się z nami →
            </Link>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
