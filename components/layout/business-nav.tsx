// ─── Business navigation — single source of truth ───────────────────────────
// Four groups by work rhythm: Praca (daily) · Oferta · Narzędzia · Firma.
// Routes are unchanged; only labels + grouping are new. The topbar reads
// PAGE_META for its title and one contextual primary action per screen.

import type { CSSProperties } from "react";

type IconProps = { className?: string; style?: CSSProperties };
type IconFn = (p: IconProps) => React.JSX.Element;

// Every visible string comes from dict.businessNav via `key`. No labels live here.
export type NavKey =
  | "today" | "calendar" | "clients" | "history" | "services" | "team" | "hours"
  | "ai" | "marketing" | "coupons" | "invoices" | "analytics" | "reviews"
  | "payments" | "locations" | "settings";
export type NavItem = { href: string; key: NavKey; icon: IconFn; flag?: "multiLocation" };
export type NavGroupKey = "groupWork" | "groupOffer" | "groupTools" | "groupCompany";
export type NavGroup = { groupKey: NavGroupKey; items: NavItem[] };

const svg = (children: React.ReactNode): IconFn =>
  function Icon({ className, style }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        width={17}
        height={17}
        className={className}
        style={style}
        aria-hidden="true"
      >
        {children}
      </svg>
    );
  };

// Icons — one coherent set, 17px / stroke 1.75 (lucide-derived geometry)
const TodayIcon = svg(<><rect x="3" y="4" width="18" height="18" rx="2.5" /><path d="M3 10h18" /><path d="M8 2v4M16 2v4" /><circle cx="8.5" cy="14.5" r="1.4" fill="currentColor" stroke="none" /></>);
const CalendarIcon = svg(<><rect x="3" y="4" width="18" height="18" rx="2.5" /><path d="M3 10h18M8 2v4M16 2v4" /><path d="M8 14h3M8 18h6" /></>);
const ClientsIcon = svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>);
const ServicesIcon = svg(<><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="2" /></>);
const TeamIcon = svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16.5 5.5a3 3 0 0 1 0 6M17 20a5.5 5.5 0 0 0-2.2-4.4" /></>);
const HoursIcon = svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>);
const HistoryIcon = svg(<><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7.5v5l3 2" /></>);
const AiIcon = svg(<><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" /><circle cx="12" cy="12" r="3.4" /></>);
const MarketingIcon = svg(<><path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15 8a4 4 0 0 1 0 8" /><path d="M18.5 5.5a8 8 0 0 1 0 13" /></>);
const CouponIcon = svg(<><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6Z" /><path d="M14 5v14" strokeDasharray="2 2.4" /></>);
const InvoiceIcon = svg(<><path d="M6 2h9l5 5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 6 20Z" /><path d="M14 2v5h5" /><path d="M9.5 13h5M9.5 17h5" /></>);
const AnalyticsIcon = svg(<><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-3M12.5 16V9M17 16v-5" /></>);
const ReviewIcon = svg(<><path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L3.2 9.2l5.4-.8Z" /></>);
const PaymentsIcon = svg(<><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /><path d="M6 15h3" /></>);
const SettingsIcon = svg(<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.2M12 19.3v2.2M4.2 7l1.9 1.1M17.9 15.9l1.9 1.1M4.2 17l1.9-1.1M17.9 8.1l1.9-1.1" /></>);
const LocationsIcon = svg(<><path d="M12 21s-6-5.686-6-10a6 6 0 0 1 12 0c0 4.314-6 10-6 10Z" /><circle cx="12" cy="11" r="2" /></>);

export const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: "groupWork",
    items: [
      { href: "/business/dashboard", key: "today", icon: TodayIcon },
      { href: "/business/calendar", key: "calendar", icon: CalendarIcon },
      { href: "/business/crm", key: "clients", icon: ClientsIcon },
      { href: "/business/history", key: "history", icon: HistoryIcon },
    ],
  },
  {
    groupKey: "groupOffer",
    items: [
      { href: "/business/services", key: "services", icon: ServicesIcon },
      { href: "/business/staff", key: "team", icon: TeamIcon },
      { href: "/business/hours", key: "hours", icon: HoursIcon },
    ],
  },
  {
    groupKey: "groupTools",
    items: [
      { href: "/business/ai", key: "ai", icon: AiIcon },
      { href: "/business/marketing", key: "marketing", icon: MarketingIcon },
      { href: "/business/coupons", key: "coupons", icon: CouponIcon },
      { href: "/business/invoices", key: "invoices", icon: InvoiceIcon },
    ],
  },
  {
    groupKey: "groupCompany",
    items: [
      { href: "/business/analytics", key: "analytics", icon: AnalyticsIcon },
      { href: "/business/reviews", key: "reviews", icon: ReviewIcon },
      { href: "/business/payments", key: "payments", icon: PaymentsIcon },
      // Gated by MULTI_LOCATION_ENABLED — hidden (filtered) unless the flag is on.
      { href: "/business/locations", key: "locations", icon: LocationsIcon, flag: "multiLocation" },
      { href: "/business/settings", key: "settings", icon: SettingsIcon },
    ],
  },
];

/**
 * Nav groups with flag-gated items filtered out. Items carrying `flag:
 * "multiLocation"` appear only when multi-location is enabled, so with the flag
 * off the nav is byte-identical to before.
 */
export function navGroupsFor(flags: { multiLocation: boolean }): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => (i.flag === "multiLocation" ? flags.multiLocation : true)),
  })).filter((g) => g.items.length > 0);
}

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// Per-route title + one contextual primary action.
// Actions use ?action=new which each client page reads to open its creator —
// keeps server pages server-side, no global handler wiring.
// Text keys into dict.businessNav — titles reuse the nav keys; actions + a few
// extras (panel/salonProfile) round out the set.
export type BusinessTextKey =
  | NavKey | "panel" | "salonProfile"
  | "newAppointment" | "addService" | "addPerson" | "newCampaign" | "newCoupon" | "addLocation";
export type PageAction = { labelKey: BusinessTextKey; href: string; plus?: boolean };
export type PageMeta = { titleKey: BusinessTextKey; action?: PageAction };
const NEW_APPT: PageAction = { labelKey: "newAppointment", href: "/business/calendar?action=new", plus: true };
export const PAGE_META: Record<string, PageMeta> = {
  "/business/dashboard": { titleKey: "today", action: NEW_APPT },
  "/business/calendar": { titleKey: "calendar", action: NEW_APPT },
  "/business/crm": { titleKey: "clients", action: NEW_APPT },
  "/business/history": { titleKey: "history" },
  "/business/services": { titleKey: "services", action: { labelKey: "addService", href: "/business/services?action=new", plus: true } },
  // No "Add person" action: a specialist joins with the salon code and the
  // owner approves them on the page itself. There is nothing for a topbar
  // shortcut to open, and a "+" that opened a creator would be a lie.
  "/business/staff": { titleKey: "team" },
  "/business/hours": { titleKey: "hours" },
  "/business/ai": { titleKey: "ai" },
  "/business/marketing": { titleKey: "marketing", action: { labelKey: "newCampaign", href: "/business/marketing?action=new", plus: true } },
  "/business/coupons": { titleKey: "coupons", action: { labelKey: "newCoupon", href: "/business/coupons?action=new", plus: true } },
  "/business/invoices": { titleKey: "invoices" },
  "/business/analytics": { titleKey: "analytics" },
  "/business/reviews": { titleKey: "reviews" },
  "/business/payments": { titleKey: "payments" },
  "/business/locations": { titleKey: "locations", action: { labelKey: "addLocation", href: "/business/locations?action=new", plus: true } },
  "/business/settings": { titleKey: "settings" },
  "/business/profile": { titleKey: "salonProfile" },
};

export function pageMetaFor(pathname: string): PageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Longest-prefix fallback for nested routes
  const hit = Object.keys(PAGE_META)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? PAGE_META[hit] : { titleKey: "panel" };
}
