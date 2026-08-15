import Link from "next/link";
import { BusinessStatus } from "@prisma/client";
import type { PublicationRequirement } from "@/lib/publication";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Owner-facing publication state: what status the salon is in, and — when it is
// not yet public — exactly what is still missing before it can be published.
export function PublicationStatus({
  status,
  slug,
  requirements,
  t,
}: {
  status: BusinessStatus;
  slug: string;
  requirements: PublicationRequirement[];
  /** Localized publication copy, resolved by the server page. */
  t: Dictionary["publication"];
}) {
  const missing = requirements.filter((r) => !r.ok);
  const isPublished = status === BusinessStatus.ACTIVE;
  const isPending = status === BusinessStatus.PENDING_VERIFICATION;

  const tone = isPublished
    ? { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.30)", dot: "#10B981", text: "#047857" }
    : isPending
    ? { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.30)", dot: "#F59E0B", text: "#B45309" }
    : { bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.28)", dot: "#F43F5E", text: "#BE123C" };

  return (
    <div className="rounded-2xl p-5 fade-rise" style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full" style={{ background: tone.dot }} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold" style={{ color: tone.text }}>
              {t.statusLabel}: {t[status] ?? status}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {isPublished
                ? t.publishedBody
                : isPending
                ? t.pendingBody
                : status === BusinessStatus.SUSPENDED
                ? t.suspendedBody
                : t.hiddenBody}
            </p>
          </div>
        </div>
        {isPublished && (
          <Link
            href={`/b/${slug}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200 text-slate-700 hover:bg-white transition-colors flex-shrink-0"
          >
            {t.viewProfile}
          </Link>
        )}
      </div>

      {!isPublished && missing.length > 0 && (
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

      {!isPublished && isPending && missing.length === 0 && (
        <p className="mt-3 text-sm text-slate-700">
          {t.allReady}
        </p>
      )}
    </div>
  );
}
