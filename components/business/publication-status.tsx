import Link from "next/link";
import type { PublicationFacts, PublicationState } from "@/lib/publication";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Owner-facing publication state.
//
// The card renders `PublicationFacts` — the single server-resolved truth shared
// with search, the public profile route and the booking gate — and never
// re-derives publication from `status` alone. That re-derivation is what let it
// say "Opublikowany · widoczny w wyszukiwarce" about a salon that search
// excluded and whose /b/[slug] returned not-found.
//
// Two rules hold here:
//   1. "In search" and "Online bookings" are shown as separate facts, because
//      they genuinely differ (a hidden-category salon is bookable by link but
//      never listed). One vague sentence cannot state both honestly.
//   2. "View profile" is rendered ONLY when `profilePath` is non-null, so the
//      button can never point at a route that would 404. When there is no
//      public profile, the reason is shown instead.

type Tone = { bg: string; border: string; dot: string; text: string };

const GREEN: Tone = { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.30)", dot: "#10B981", text: "#047857" };
const AMBER: Tone = { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.30)", dot: "#F59E0B", text: "#B45309" };
const SLATE: Tone = { bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.32)", dot: "#94A3B8", text: "#475569" };
const ROSE: Tone = { bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.28)", dot: "#F43F5E", text: "#BE123C" };

const TONE_BY_STATE: Record<PublicationState, Tone> = {
  PUBLISHED: GREEN,
  NOT_LISTED: AMBER,
  READY: AMBER,
  DRAFT: AMBER,
  HIDDEN: SLATE,
  SUSPENDED: ROSE,
  CLOSED: ROSE,
};

export function PublicationStatus({
  facts,
  t,
}: {
  /** Resolved server-side by lib/publication.resolvePublication. */
  facts: PublicationFacts;
  /** Localized publication copy, resolved by the server page. */
  t: Dictionary["publication"];
}) {
  const { state, missing, profilePath, discoverable, bookable } = facts;
  const tone = TONE_BY_STATE[state];

  const label = t.state[state];
  const body = t.body[state];

  return (
    <div className="rounded-2xl p-5 fade-rise" style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: tone.dot }} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: tone.text }}>
              {t.statusLabel}: {label}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">{body}</p>
          </div>
        </div>
        {profilePath ? (
          <Link
            href={profilePath}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200 text-slate-700 hover:bg-white transition-colors flex-shrink-0"
          >
            {t.viewProfile}
          </Link>
        ) : (
          // No reachable public profile → no link at all, and the reason is
          // stated rather than left for the owner to discover via a 404.
          <span className="text-[11px] text-slate-500 flex-shrink-0 max-w-[9rem] text-right leading-snug">
            {t.viewProfileUnavailable}
          </span>
        )}
      </div>

      {/* The two facts the owner actually needs, stated separately. */}
      <div className="flex flex-wrap gap-2 mt-3.5">
        <Fact label={t.factSearch} ok={discoverable} yes={t.yes} no={t.no} />
        <Fact label={t.factBooking} ok={bookable} yes={t.yes} no={t.no} />
      </div>

      {missing.length > 0 && !facts.publiclyVisible && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            {t.toComplete.replace("{n}", String(missing.length))}
          </p>
          <ul className="space-y-1.5">
            {missing.map((r) => (
              <li key={r.key} className="flex items-center gap-2 text-sm text-slate-700">
                <span
                  className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface)", border: "1px solid rgba(148,163,184,0.5)" }}
                  aria-hidden="true"
                />
                {t.req[r.key as keyof typeof t.req] ?? r.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Fact({ label, ok, yes, no }: { label: string; ok: boolean; yes: string; no: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hairline)",
        color: ok ? "#047857" : "#64748B",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: ok ? "#10B981" : "#94A3B8" }}
        aria-hidden="true"
      />
      {label}: {ok ? yes : no}
    </span>
  );
}
