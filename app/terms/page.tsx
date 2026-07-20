import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Regulamin — TermCatch" };

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

const sections = [
  {
    title: "1. Postanowienia ogólne",
    body: `Niniejszy Regulamin określa zasady korzystania z platformy TermCatch, dostępnej pod adresem termcatch.com, świadczącej usługi pośrednictwa w rezerwacjach online między klientami a usługodawcami z branży beauty i wellness.`,
  },
  {
    title: "2. Definicje",
    body: `Platforma — serwis internetowy TermCatch dostępny pod adresem termcatch.com. Użytkownik — osoba fizyczna korzystająca z Platformy w celu dokonania rezerwacji. Salon / Specjalista — podmiot świadczący usługi zarejestrowany na Platformie. Rezerwacja — potwierdzenie terminu usługi dokonane za pośrednictwem Platformy.`,
  },
  {
    title: "3. Warunki korzystania",
    body: `Korzystanie z Platformy jest bezpłatne dla Użytkowników. Rejestracja wymaga podania prawdziwych danych osobowych. Użytkownik ponosi odpowiedzialność za zachowanie poufności danych dostępowych do konta. TermCatch zastrzega sobie prawo do usunięcia konta naruszającego niniejszy Regulamin.`,
  },
  {
    title: "4. Rezerwacje",
    body: `Rezerwacja dokonana przez Platformę jest wiążąca po potwierdzeniu przez Salon. Użytkownik zobowiązuje się do przybycia na umówioną wizytę lub odwołania jej z co najmniej 24-godzinnym wyprzedzeniem. Salon ma prawo nałożyć opłatę za brak obecności zgodnie z własną polityką anulowania.`,
  },
  {
    title: "5. Płatności",
    body: `Opłaty za usługi są pobierane przez Salon według własnego cennika. TermCatch może pobierać prowizję od transakcji online zgodnie z obowiązującym cennikiem. Płatności online są obsługiwane przez operatora płatności Stripe.`,
  },
  {
    title: "6. Odpowiedzialność",
    body: `TermCatch nie ponosi odpowiedzialności za jakość usług świadczonych przez Salony. Platforma pełni wyłącznie rolę pośrednika w procesie rezerwacji. Wszelkie reklamacje dotyczące usług należy kierować bezpośrednio do Salonu.`,
  },
  {
    title: "7. Postanowienia końcowe",
    body: `TermCatch zastrzega sobie prawo do zmiany niniejszego Regulaminu z 14-dniowym wyprzedzeniem. W sprawach nieregulowanych niniejszym Regulaminem stosuje się przepisy prawa polskiego. Wszelkie spory rozstrzyga właściwy sąd powszechny.`,
  },
];

export default function TermsPage() {
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
              Regulamin
            </div>
            <h1
              className="text-4xl font-bold mb-3"
              style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
            >
              Regulamin korzystania
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
