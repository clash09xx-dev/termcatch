import type { ReactNode } from "react";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { LEGAL, LEGAL_OPERATOR_FIELDS } from "@/lib/legal";

// ─── Shared shell for all legal documents ────────────────────────────────────
// Server-rendered (public, no login, SEO-indexable, printable). The table of
// contents is pure anchors + a native <details> on mobile, so it needs no JS.
// Machined Silver: white/silver, restrained glass, generous legible typography,
// selectable text, no distracting animation.

export type LegalSection = {
  /** Anchor id (kebab-case). */
  id: string;
  /** Heading incl. its own numbering, e.g. "§1 Postanowienia ogólne" or "1. …". */
  title: string;
  /** Short label for the table of contents (defaults to `title`). */
  toc?: string;
  /** string → one paragraph; string[] → several paragraphs; ReactNode → verbatim. */
  body: string | string[] | ReactNode;
};

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

const CARD: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e1)",
};

function SectionBody({ body }: { body: LegalSection["body"] }) {
  if (typeof body === "string") {
    return <p className="my-3 leading-relaxed text-[15px] text-slate-600">{body}</p>;
  }
  if (Array.isArray(body) && body.every((b) => typeof b === "string")) {
    return (
      <>
        {(body as string[]).map((p, i) => (
          <p key={i} className="my-3 leading-relaxed text-[15px] text-slate-600">
            {p}
          </p>
        ))}
      </>
    );
  }
  return <>{body}</>;
}

export function LegalPage({
  title,
  subtitle,
  intro,
  sections,
  showOperator = true,
  operatorHeading = "Operator platformy",
}: {
  title: string;
  subtitle?: string;
  intro?: ReactNode;
  sections: LegalSection[];
  showOperator?: boolean;
  operatorHeading?: string;
}) {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="print:hidden">
        <LandingNav />
      </div>

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-28 pb-12 sm:pb-16">
        {/* Header */}
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight" style={{ letterSpacing: "var(--track-title)" }}>
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          <p className="mt-1 text-xs text-slate-400">
            Data ostatniej aktualizacji: <span className="font-medium text-slate-500">{LEGAL.LAST_UPDATED}</span>
          </p>
          {intro && <div className="mt-5 text-[15px] leading-relaxed text-slate-600 max-w-[72ch] space-y-3">{intro}</div>}

          {showOperator && (
            <section aria-label={operatorHeading} className="mt-6 rounded-2xl p-4 sm:p-5 max-w-[72ch]" style={CARD}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">{operatorHeading}</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {LEGAL_OPERATOR_FIELDS.map((f) => (
                  <div key={f.label} className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3 py-0.5">
                    <dt className="text-[13px] text-slate-500">{f.label}</dt>
                    <dd className="text-[13px] font-medium text-slate-800 break-all">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[12px] text-slate-400 leading-relaxed">
                Wartości w nawiasach kwadratowych zostaną uzupełnione po formalnej rejestracji podmiotu prowadzącego
                {" "}{LEGAL.BRAND}. Do tego czasu kontakt prawny i w sprawie danych: {LEGAL.CONTACT_EMAIL}.
              </p>
            </section>
          )}
        </header>

        <div className="grid lg:grid-cols-[248px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
          {/* TOC — sticky on desktop, collapsible on mobile */}
          <nav aria-label="Spis treści" className="print:hidden">
            <div className="lg:hidden">
              <details className="rounded-2xl p-4" style={CARD}>
                <summary className="text-sm font-semibold text-slate-800 cursor-pointer select-none">Spis treści</summary>
                <TocList sections={sections} className="mt-3" />
              </details>
            </div>
            <div className="hidden lg:block sticky top-24 self-start max-h-[calc(100dvh-7rem)] overflow-auto rounded-2xl p-4" style={CARD}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">Spis treści</p>
              <TocList sections={sections} />
            </div>
          </nav>

          {/* Document body */}
          <article className="min-w-0 max-w-[74ch]">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 py-4 border-t first:border-t-0" style={{ borderColor: "rgba(203,213,225,0.5)" }}>
                <h2 className="text-[17px] sm:text-lg font-semibold text-slate-900 tracking-tight">{s.title}</h2>
                <SectionBody body={s.body} />
              </section>
            ))}

            <p className="mt-10 pt-6 text-xs text-slate-400 leading-relaxed" style={{ borderTop: "1px solid var(--hairline)" }}>
              Dokument dotyczy platformy {LEGAL.BRAND} ({LEGAL.DOMAIN}). W razie rozbieżności językowych wiążąca jest
              wersja polska. Kontakt: {LEGAL.CONTACT_EMAIL}.
            </p>
          </article>
        </div>
      </main>

      <div className="print:hidden">
        <LandingFooter />
      </div>
    </div>
  );
}

function TocList({ sections, className = "" }: { sections: LegalSection[]; className?: string }) {
  return (
    <ol className={`space-y-1.5 text-[13px] leading-snug ${className}`}>
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="block text-slate-500 hover:text-slate-900 transition-colors">
            {s.toc ?? s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}
