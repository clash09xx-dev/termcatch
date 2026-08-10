// ─── Legal document constants ────────────────────────────────────────────────
// Company registration details are PLACEHOLDERS until the real entity data is
// supplied. Never render fabricated NIP / KRS / REGON / address values — the
// helpers below render the placeholder token verbatim so it is obvious a value
// is still outstanding.

export const LEGAL = {
  COMPANY_NAME: "[LEGAL_COMPANY_NAME]",
  LEGAL_FORM: "[LEGAL_FORM]",
  REGISTERED_ADDRESS: "[REGISTERED_ADDRESS]",
  NIP: "[NIP]",
  REGON: "[REGON]",
  KRS: "[KRS]",
  /** Real, usable contact until company details are provided. */
  CONTACT_EMAIL: "hello@termcatch.com",
  /** Set to the real go-live date once the documents are formally adopted. */
  EFFECTIVE_DATE: "[LEGAL_EFFECTIVE_DATE]",
  /** Human "last updated" — kept in sync when a document is revised. */
  LAST_UPDATED: "10 sierpnia 2026",
  BRAND: "TermCatch",
  DOMAIN: "termcatch.com",
} as const;

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
