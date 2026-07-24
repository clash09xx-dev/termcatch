import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

export const metadata: Metadata = {
  title: "RODO — ochrona danych osobowych",
  description:
    "Jak TermCatch chroni Twoje dane osobowe i jak skorzystać z praw wynikających z RODO. Pełne informacje w Polityce prywatności.",
  alternates: { canonical: "/gdpr" },
};

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.55)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.45), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.09), inset 0 1px 0 rgba(255,255,255,0.95)",
  borderRadius: "1.25rem",
};

// Standard GDPR/RODO data-subject rights. Points to the (real) Privacy Policy
// for the full description and to the contact address for exercising them —
// no fabricated legal claims.
const RIGHTS: { title: string; body: string }[] = [
  { title: "Prawo dostępu", body: "Możesz uzyskać informację, jakie dane na Twój temat przetwarzamy, i otrzymać ich kopię." },
  { title: "Prawo do sprostowania", body: "Możesz poprawić nieprawidłowe lub uzupełnić niekompletne dane." },
  { title: "Prawo do usunięcia", body: "Możesz zażądać usunięcia swoich danych, jeśli nie ma podstaw do ich dalszego przetwarzania." },
  { title: "Prawo do ograniczenia", body: "Możesz ograniczyć przetwarzanie swoich danych w określonych sytuacjach." },
  { title: "Prawo do przenoszenia", body: "Możesz otrzymać swoje dane w ustrukturyzowanym formacie i przenieść je do innego administratora." },
  { title: "Prawo do sprzeciwu", body: "Możesz wnieść sprzeciw wobec przetwarzania danych, w tym do celów marketingu bezpośredniego." },
];

export default function GdprPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{ background: "rgba(203,213,225,0.28)", border: "1px solid rgba(203,213,225,0.50)", color: "#64748B" }}
            >
              RODO
            </div>
            <h1 className="text-4xl font-bold mb-3" style={{ letterSpacing: "-0.04em", color: "#0F172A" }}>
              Ochrona danych osobowych
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#64748B" }}>
              Administratorem danych jest TermCatch z siedzibą w Krakowie. Szczegółowy opis
              tego, jakie dane zbieramy, w jakim celu i na jakiej podstawie, znajdziesz w{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:no-underline" style={{ color: "#334155" }}>
                Polityce prywatności
              </Link>
              .
            </p>
          </div>

          <div className="p-6 mb-6" style={card}>
            <h2 className="font-semibold mb-4 text-sm" style={{ color: "#0F172A" }}>
              Twoje prawa
            </h2>
            <div className="space-y-4">
              {RIGHTS.map((r) => (
                <div key={r.title}>
                  <p className="text-sm font-semibold" style={{ color: "#334155" }}>{r.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>{r.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6" style={card}>
            <h2 className="font-semibold mb-2 text-sm" style={{ color: "#0F172A" }}>
              Jak skorzystać z tych praw
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Aby zrealizować dowolne z powyższych praw lub zadać pytanie dotyczące danych,
              napisz na{" "}
              <a href="mailto:hello@termcatch.com" className="underline underline-offset-2 hover:no-underline" style={{ color: "#334155" }}>
                hello@termcatch.com
              </a>
              . Odpowiemy bez zbędnej zwłoki. Masz również prawo wniesienia skargi do
              Prezesa Urzędu Ochrony Danych Osobowych (UODO).
            </p>
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
