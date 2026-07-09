import { cn } from "@/lib/utils";

// ─── Branded silver-duotone placeholder cover ────────────────────────────────
// Replaces empty gray blocks on photo-less salons: soft chrome gradient,
// dot grid, and the salon's category glyph embossed in chrome.
// Server-safe (no hooks, no handlers).

const GLYPHS: Record<string, React.ReactNode> = {
  // Scissors — hair & barber
  SCISSORS: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </>
  ),
  // Sparkles — beauty, spa, makeup, tanning
  SPARKLES: (
    <>
      <path d="M12 3l1.9 5.6a2 2 0 0 0 1.3 1.3L21 12l-5.8 2.1a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.6a2 2 0 0 0-1.3-1.3L3 12l5.8-2.1a2 2 0 0 0 1.3-1.3L12 3z" />
      <path d="M19 3v4" />
      <path d="M17 5h4" />
    </>
  ),
  // Gem — nails
  GEM: (
    <>
      <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
      <path d="M11 3 8 9l4 12 4-12-3-6" />
      <path d="M2 9h20" />
    </>
  ),
  // Leaf — massage, yoga, pilates
  LEAF: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </>
  ),
  // Eye — brows & lashes
  EYE: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // Pen — tattoo, piercing
  PEN: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  // Activity — training, physio
  ACTIVITY: (
    <>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </>
  ),
  // Apple — nutrition
  APPLE: (
    <>
      <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
      <path d="M10 2c1 .5 2 2 2 5" />
    </>
  ),
  // Message — psychology
  MESSAGE: (
    <>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </>
  ),
  // Medical cross — physician, dentist
  CROSS: (
    <>
      <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
    </>
  ),
  // Storefront — default
  DEFAULT: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
    </>
  ),
};

const CATEGORY_GLYPH: Record<string, keyof typeof GLYPHS> = {
  HAIR_SALON: "SCISSORS",
  BARBER: "SCISSORS",
  NAIL_SALON: "GEM",
  MASSAGE: "LEAF",
  SPA: "SPARKLES",
  BEAUTY_CLINIC: "SPARKLES",
  EYEBROWS_LASHES: "EYE",
  MAKEUP: "SPARKLES",
  TATTOO: "PEN",
  PIERCING: "PEN",
  TANNING: "SPARKLES",
  PHYSIOTHERAPY: "ACTIVITY",
  PERSONAL_TRAINER: "ACTIVITY",
  YOGA: "LEAF",
  PILATES: "LEAF",
  NUTRITIONIST: "APPLE",
  PSYCHOLOGIST: "MESSAGE",
  GENERAL_PHYSICIAN: "CROSS",
  DENTIST: "CROSS",
};

export function PlaceholderCover({
  category,
  className,
  glyphClassName,
}: {
  category: string;
  className?: string;
  glyphClassName?: string;
}) {
  const glyph = GLYPHS[CATEGORY_GLYPH[category] ?? "DEFAULT"];

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden", className)}
      style={{ background: "linear-gradient(140deg, #E2E8F0 0%, #F1F5F9 45%, #DBE4EF 100%)" }}
      aria-hidden="true"
    >
      {/* Chrome dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.22) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse 80% 90% at 50% 50%, black 20%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 90% at 50% 50%, black 20%, transparent 100%)",
        }}
      />
      {/* Specular sheen */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(60% 90% at 70% 15%, rgba(255,255,255,0.70) 0%, transparent 60%)" }}
      />
      {/* Embossed category glyph */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className={cn("w-14 h-14 sm:w-16 sm:h-16", glyphClassName)}
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <linearGradient id="tc-chrome-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
          </defs>
          {/* White under-copy for the embossed catch-light */}
          <g stroke="rgba(255,255,255,0.90)" transform="translate(0 0.5)">{glyph}</g>
          <g stroke="url(#tc-chrome-stroke)">{glyph}</g>
        </svg>
      </div>
    </div>
  );
}
