// Pure eligibility rule for the floating view switch — decides WHICH control a
// request may see, from server-computed facts only. Kept dependency-free so it's
// unit-testable and can't accidentally read a cookie for a permission decision.
//
//   admin     → the internal 3-way Client/Salon/Owner switch (AdminViewSwitcher)
//   owner     → the product Client/Salon switch, Salon → /business/dashboard
//   employee  → the same control, Salon → /employee/dashboard
//   none      → no switch (plain customer, or unauthenticated)
//
// WHY "employee" EXISTS
// The rule used to be `isAdmin ? admin : ownsBusiness ? owner : none`, so a
// specialist who joined a salon with a join code got nothing: the membership row
// was created, the role became EMPLOYEE, and the account still looked exactly
// like a customer's with no route into the salon they had just joined. Employees
// are a distinct case rather than a second way of being an "owner", because the
// two lead to different panels with different powers.
//
// `ownsBusiness` / `isEmployee` MUST come from a server-side resolution
// (lib/ownership resolveBusinessAccess), never from the `ownerView` cookie.
// Admin takes precedence so platform admins keep their existing capability, and
// admin privilege is NEVER inferred from a selected UI mode.
//
// This control is NAVIGATION ONLY. Every business and employee route re-checks
// ownership/membership server-side, so seeing the switch grants nothing on its
// own and a forged cookie grants nothing at all.

export type ViewSwitchKind = "admin" | "owner" | "employee" | "none";

export function resolveViewSwitch(input: {
  isAdmin: boolean;
  ownsBusiness: boolean;
  /** An ACTIVE Employee row links this session to a salon. */
  isEmployee?: boolean;
}): ViewSwitchKind {
  if (input.isAdmin) return "admin";
  if (input.ownsBusiness) return "owner";
  if (input.isEmployee) return "employee";
  return "none";
}

/** Does this kind render the product Client/Salon switch? */
export function usesProductSwitch(kind: ViewSwitchKind): boolean {
  return kind === "owner" || kind === "employee";
}
