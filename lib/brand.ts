/**
 * Brand constants — never localized.
 *
 * These are proper nouns of the product, in the same category as the wordmark
 * itself. They deliberately live OUTSIDE lib/i18n so there is no dictionary key
 * a translator could reach: the tagline reads "Book. Manage. Grow." in Polish,
 * German and Turkish exactly as it does in English, and any locale added later
 * inherits that automatically rather than opting in.
 *
 * The localized explanation of what TermCatch is belongs in the hero SUBTITLE
 * (`home.heroSubtitle`), which is translated — so a visitor who does not read
 * English still learns what the product does.
 */

export const BRAND_NAME = "TermCatch";

/** "Book. Manage. Grow." — set as three lines in the hero. */
export const BRAND_TAGLINE_LINES = ["Book.", "Manage.", "Grow."] as const;

export const BRAND_TAGLINE = BRAND_TAGLINE_LINES.join(" ");
