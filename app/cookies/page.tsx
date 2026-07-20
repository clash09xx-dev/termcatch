import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import CookieSettingsButton from "./cookie-settings-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka cookies — TermCatch",
  description:
    "Jakich plików cookie używa TermCatch, do czego służą i jak zarządzać swoimi preferencjami.",
  alternates: { canonical: "/cookies" },
};

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

const cardStyle = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.55)",
  borderRadius: "1.125rem",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.40), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
};

const SECTIONS = [
  {
    title: "Cookie niezbędne",
    badge: "Zawsze aktywne",
    badgeStyle: {
      background: "rgba(203,213,225,0.30)",
      border: "1px solid rgba(203,213,225,0.45)",
      color: "#64748B",
    },
    body: "Bez nich TermCatch nie działa. Obsługują logowanie i sesję użytkownika (Supabase Auth), zapamiętują Twoje preferencje zgody oraz chronią przed nadużyciami. Podstawą prawną jest niezbędność do świadczenia usługi (art. 6 ust. 1 lit. b RODO) — nie wymagają zgody.",
    examples: "sb-*-auth-token (sesja logowania), tc_consent (Twoje preferencje cookie)",
  },
  {
    title: "Cookie analityczne",
    badge: "Wymagają zgody",
    badgeStyle: {
      background: "rgba(226,232,240,0.50)",
      border: "1px solid rgba(203,213,225,0.40)",
      color: "#64748B",
    },
    body: "Pomagają nam zrozumieć, jak używasz TermCatch — które strony odwiedzasz i skąd do nas trafiasz. Używamy własnego, anonimowego systemu statystyk: identyfikator odwiedzającego jest losowy, nie łączymy go z Twoim imieniem, nazwiskiem ani adresem e-mail.",
    examples: "tc_vid (losowy identyfikator odwiedzającego), tc_sid (identyfikator sesji, wygasa po 30 min)",
  },
  {
    title: "Cookie marketingowe",
    badge: "Obecnie nieużywane",
    badgeStyle: {
      background: "rgba(241,245,249,0.80)",
      border: "1px solid rgba(226,232,240,0.60)",
      color: "#94A3B8",
    },
    body: "TermCatch nie używa obecnie żadnych cookie marketingowych ani reklamowych. Jeśli to się zmieni, zapytamy Cię o osobną zgodę zanim jakikolwiek skrypt marketingowy zostanie załadowany.",
    examples: "brak",
  },
];

export default function CookiesPage() {
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
              Polityka cookies
            </div>
            <h1
              className="text-4xl font-bold mb-5"
              style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
            >
              Pliki cookie w TermCatch
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Poniżej znajdziesz pełną listę kategorii plików cookie, których używamy,
              wraz z wyjaśnieniem do czego służą. Skrypty analityczne i marketingowe
              nie są ładowane, dopóki nie wyrazisz na nie zgody.
            </p>
          </div>

          <div className="space-y-3 mb-10">
            {SECTIONS.map((s) => (
              <section
                key={s.title}
                className="p-6 glass-shimmer-wrap"
                style={cardStyle}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2
                    className="text-base font-semibold"
                    style={{ color: "#0F172A", letterSpacing: "-0.02em" }}
                  >
                    {s.title}
                  </h2>
                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={s.badgeStyle}
                  >
                    {s.badge}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "#64748B" }}>
                  {s.body}
                </p>
                <p className="text-xs" style={{ color: "#94A3B8" }}>
                  <span className="font-semibold" style={{ color: "#64748B" }}>Przykłady:</span>{" "}
                  {s.examples}
                </p>
              </section>
            ))}
          </div>

          <section
            className="p-6 mb-10"
            style={{
              background: "rgba(241,246,251,0.85)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(203,213,225,0.50)",
              borderRadius: "1.125rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,1)",
            }}
          >
            <h2
              className="text-base font-semibold mb-3"
              style={{ color: "#0F172A", letterSpacing: "-0.02em" }}
            >
              Twoje wybory
            </h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "#64748B" }}>
              Przy pierwszej wizycie pytamy Cię o zgodę na cookie analityczne i marketingowe.
              Możesz zaakceptować wszystkie, zostawić tylko niezbędne albo dostosować wybór.
              Preferencje przechowujemy przez 12 miesięcy.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Pytania dotyczące prywatności? Napisz na{" "}
              <a href="mailto:hello@termcatch.com" className="underline underline-offset-2 hover:opacity-70" style={{ color: "#475569" }}>
                hello@termcatch.com
              </a>
              {". "}
              Więcej o przetwarzaniu danych znajdziesz w{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:opacity-70" style={{ color: "#475569" }}>
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
