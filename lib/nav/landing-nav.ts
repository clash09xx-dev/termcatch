// ─── Public (marketing) navigation composition ───────────────────────────────
// Pure — no React, no Supabase, no window — so the rule can be unit-tested and
// so desktop and mobile cannot drift apart by each deciding for themselves.
//
// THE RULE, and the bug it replaces
//
// The navbar previously computed `isMarketing = !isAuthed && isMarketingRoute()`,
// which meant simply being logged in stripped the marketing links off the
// homepage: an owner visiting termcatch.com saw only Search / Language / Panel
// and had no way to reach Pricing, Careers or About.
//
// Two independent questions were collapsed into one. They are kept separate here:
//
//   WHICH LINKS  ← the ROUTE alone. A marketing page markets to everyone; the
//                  product routes (/search, /b/[slug], the booking flow) are task
//                  contexts where marketing links are noise.
//   WHICH ACCOUNT ACTIONS ← the SESSION alone. Log in / Create account for a
//                  guest, Panel for someone signed in.
//
// The authenticated app shells (/business, /customer, /employee, /admin) never
// render this nav at all — they have their own sidebar/topbar — so nothing here
// can leak marketing chrome into a dashboard.

/**
 * Routes that get the full marketing nav. Everything public that is NOT in this
 * list is a task context and gets the minimal nav instead.
 *
 * Adding a marketing page means adding it here — one list, not one prop per
 * page — and the legal pages are included because they are reached from the
 * footer of the marketing site and should not dead-end the visitor.
 */
export const MARKETING_ROUTES = [
  "/",
  "/about",
  "/pricing",
  "/careers",
  "/for-business",
  "/faq",
  "/contact",
  "/terms",
  "/privacy",
  "/gdpr",
  "/cookies",
] as const;

export function isMarketingRoute(pathname: string): boolean {
  return (MARKETING_ROUTES as readonly string[]).includes(pathname);
}

/** Where "Zaproś i zarób" points — the affiliate section under Careers. */
export const AFFILIATE_HREF = "/careers#zaros-i-zarob";

export type NavLinkKey = "search" | "registerSalon" | "pricing" | "careers" | "about";

/** Account controls on the right of the pill. `loading` reserves the space. */
export type NavAccount = "loading" | "guest" | "authed";

export type LandingNavModel = {
  /** True on a marketing route, for ANY visitor — signed in or not. */
  marketing: boolean;
  /** Link keys in render order, self-link already removed. */
  linkKeys: NavLinkKey[];
  /** The affiliate CTA belongs to the marketing chrome, not to the session. */
  showAffiliate: boolean;
  account: NavAccount;
};

const MARKETING_LINKS: { key: NavLinkKey; href: string }[] = [
  { key: "search", href: "/search" },
  { key: "registerSalon", href: "/register?role=business" },
  { key: "pricing", href: "/pricing" },
  { key: "careers", href: "/careers" },
  { key: "about", href: "/about" },
];

/** Href for a link key — single source, shared by desktop and mobile. */
export function navHref(key: NavLinkKey): string {
  return MARKETING_LINKS.find((l) => l.key === key)!.href;
}

export function buildLandingNav(input: { pathname: string; account: NavAccount }): LandingNavModel {
  const pathname = input.pathname || "/";
  const marketing = isMarketingRoute(pathname);

  const candidates = marketing ? MARKETING_LINKS : [MARKETING_LINKS[0]];

  // Never link to the page you are already on — that is what made the nav on
  // /search show a redundant "Search" to someone already searching.
  const linkKeys = candidates
    .filter((l) => l.href.split("?")[0] !== pathname)
    .map((l) => l.key);

  return {
    marketing,
    linkKeys,
    showAffiliate: marketing,
    account: input.account,
  };
}
