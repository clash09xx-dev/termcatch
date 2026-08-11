/**
 * Locale-aware formatting via the Intl API. These helpers only change how a
 * value is DISPLAYED — they never mutate stored values. Currency defaults to
 * PLN (the platform's billing currency) regardless of UI language, because
 * language ≠ country: the German UI still shows Polish złoty, formatted the
 * German way.
 */
import type { Locale } from "./config";

// UI language → the BCP-47 tag whose formatting conventions best match it.
// (Deliberately not tied to a country: this drives number/date shape only.)
const BCP47: Record<Locale, string> = {
  pl: "pl-PL",
  en: "en-GB",
  de: "de-DE",
  tr: "tr-TR",
};

export function intlLocale(locale: Locale): string {
  return BCP47[locale] ?? BCP47.pl;
}

function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Long date, e.g. pl "11 sierpnia 2026", de "11. August 2026", en "11 August 2026". */
export function formatDate(
  d: Date | string | number,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(
    intlLocale(locale),
    opts ?? { day: "numeric", month: "long", year: "numeric" },
  ).format(toDate(d));
}

/** 24-hour clock in every locale (booking context — never am/pm). */
export function formatTime(
  d: Date | string | number,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(
    intlLocale(locale),
    opts ?? { hour: "2-digit", minute: "2-digit", hour12: false },
  ).format(toDate(d));
}

export function formatNumber(
  n: number,
  locale: Locale,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(n);
}

/** Currency defaults to PLN; the amount is not converted, only formatted. */
export function formatCurrency(
  amount: number,
  locale: Locale,
  currency = "PLN",
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
