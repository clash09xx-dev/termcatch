import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Polityka prywatności — TermCatch" };

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

const sections = [
  {
    title: "1. Administrator danych",
    body: `Administratorem danych osobowych jest TermCatch z siedzibą w Krakowie. Kontakt: hello@termcatch.com`,
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
    body: `Dane nie są sprzedawane stronom trzecim. Udostępniamy je wyłącznie: Salonowi, u którego dokonano rezerwacji, dostawcom usług technicznych działającym jako podmioty przetwarzające (m.in. Supabase — baza danych i uwierzytelnianie, Stripe — płatności, Twilio — powiadomienia SMS, Resend — powiadomienia e-mail, dostawcy hostingu), oraz organom państwowym gdy wymagają tego przepisy prawa.`,
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
    body: `Połączenie z serwisem jest szyfrowane (SSL/TLS). Uwierzytelnianie i przechowywanie haseł obsługuje nasz dostawca tożsamości (Supabase Auth) — nie przechowujemy haseł w postaci jawnej. Dostęp do danych jest ograniczony do osób uprawnionych. Pracujemy nad dalszym podnoszeniem poziomu bezpieczeństwa.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />
      <div className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "rgba(203,213,225,0.28)",
                border: "1px solid rgba(203,213,225,0.50)",
                color: "#64748B",
              }}
            >
              Prywatność
            </div>
            <h1
              className="text-4xl font-bold mb-3"
              style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
            >
              Polityka prywatności
            </h1>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Ostatnia aktualizacja: 1 lipca 2025
            </p>
          </div>

          <div
            className="p-8"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(203,213,225,0.55)",
              borderRadius: "1.25rem",
              boxShadow:
                "0 0 0 0.5px rgba(203,213,225,0.45), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.09), inset 0 1px 0 rgba(255,255,255,0.95)",
            }}
          >
            <div className="space-y-8">
              {sections.map((s, i) => (
                <div key={s.title}>
                  {i > 0 && (
                    <div
                      className="mb-8"
                      style={{
                        height: "1px",
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(203,213,225,0.45) 30%, rgba(203,213,225,0.45) 70%, transparent 100%)",
                      }}
                    />
                  )}
                  <h2
                    className="text-sm font-semibold mb-3"
                    style={{ color: "#0F172A", letterSpacing: "-0.01em" }}
                  >
                    {s.title}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
