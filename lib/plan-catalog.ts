// ─── Plan catalogue (marketing metadata) ────────────────────────────────────
// Display-only plan data (name, price, features) for plan-selection surfaces.
// The authoritative LIMITS live in lib/entitlements.ts and the authoritative
// Stripe price ids in lib/subscription.ts — this module never invents prices
// for billing, it only renders the offer.

import type { PlanKey } from "@/lib/subscription";

export type PlanCatalogEntry = {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    key: "SOLO",
    name: "Solo",
    price: "99 zł",
    period: "mies.",
    tagline: "Dla specjalisty prowadzącego jednoosobowy salon.",
    features: ["1 specjalista", "1 lokalizacja", "Kalendarz i rezerwacje", "Profil salonu w TermCatch"],
  },
  {
    key: "TEAM",
    name: "Team",
    price: "199 zł",
    period: "mies.",
    tagline: "Dla małych zespołów w jednej lokalizacji.",
    features: ["Do 4 specjalistów", "1 lokalizacja", "Zarządzanie zespołem", "Comiesięczne raporty"],
  },
  {
    key: "PRO",
    name: "Professional",
    price: "369 zł",
    period: "mies.",
    tagline: "Dla rozwijających się salonów z większym zespołem.",
    highlight: true,
    features: ["Do 15 specjalistów", "Do 2 lokalizacji", "Asystent AI (do 30 zapytań/dzień)", "Priorytetowa pomoc"],
  },
  {
    key: "ULTIMATE",
    name: "Ultimate",
    price: "499 zł",
    period: "mies.",
    tagline: "Dla sieci salonów i zespołów bez limitów.",
    features: ["Bez limitu specjalistów", "Bez limitu lokalizacji", "Asystent AI bez limitu", "Priorytetowa pomoc"],
  },
];
