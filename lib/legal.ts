// ─── Legal document constants ────────────────────────────────────────────────
// Company registration details are PLACEHOLDERS until the real entity data is
// supplied. Fill the real values via server-side env vars in Railway (no code
// change needed) — until then the placeholder token renders verbatim, so it is
// obvious a value is still outstanding. NEVER fabricate NIP / KRS / REGON / address.
//
// Railway env vars (all optional; unset → placeholder shown):
//   LEGAL_COMPANY_NAME, LEGAL_FORM, LEGAL_REGISTERED_ADDRESS,
//   LEGAL_NIP, LEGAL_REGON, LEGAL_KRS, LEGAL_EFFECTIVE_DATE, LEGAL_CONTACT_EMAIL
//
// server-only: lib/legal is imported exclusively by server components.
const env = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v.trim() : fallback;
};

export const LEGAL = {
  COMPANY_NAME: env("LEGAL_COMPANY_NAME", "[LEGAL_COMPANY_NAME]"),
  LEGAL_FORM: env("LEGAL_FORM", "[LEGAL_FORM]"),
  REGISTERED_ADDRESS: env("LEGAL_REGISTERED_ADDRESS", "[REGISTERED_ADDRESS]"),
  NIP: env("LEGAL_NIP", "[NIP]"),
  REGON: env("LEGAL_REGON", "[REGON]"),
  KRS: env("LEGAL_KRS", "[KRS]"),
  /** Real, usable contact until company details are provided. */
  CONTACT_EMAIL: env("LEGAL_CONTACT_EMAIL", "hello@termcatch.com"),
  /** Set to the real go-live date once the documents are formally adopted. */
  EFFECTIVE_DATE: env("LEGAL_EFFECTIVE_DATE", "[LEGAL_EFFECTIVE_DATE]"),
  /** Human "last updated" — kept in sync when a document is revised. */
  LAST_UPDATED: "10 sierpnia 2026",
  BRAND: "TermCatch",
  DOMAIN: "termcatch.com",
};

/** The eight registration fields, for a compact "operator details" block. */
export const LEGAL_OPERATOR_FIELDS: { label: string; value: string }[] = [
  { label: "Operator / Administrator", value: LEGAL.COMPANY_NAME },
  { label: "Forma prawna", value: LEGAL.LEGAL_FORM },
  { label: "Adres siedziby", value: LEGAL.REGISTERED_ADDRESS },
  { label: "NIP", value: LEGAL.NIP },
  { label: "REGON", value: LEGAL.REGON },
  { label: "KRS", value: LEGAL.KRS },
  { label: "Kontakt", value: LEGAL.CONTACT_EMAIL },
];
