// Pure eligibility rule for the floating view switch — decides WHICH control a
// request may see, from server-computed facts only. Kept dependency-free so it's
// unit-testable and can't accidentally read a cookie for a permission decision.
//
//   admin  → the internal 3-way Client/Salon/Owner switch (AdminViewSwitcher)
//   owner  → the safe product Client/Salon switch (OwnerViewSwitcher)
//   none   → no switch (normal customer, employee, or unauthenticated)
//
// `ownsBusiness` MUST come from a server-side ownership check
// (currentOwnedBusinessId), never from the `ownerView` cookie. Admin takes
// precedence so platform admins keep their existing capability, and admin
// privilege is NEVER inferred from a selected UI mode.

export type ViewSwitchKind = "admin" | "owner" | "none";

export function resolveViewSwitch(input: { isAdmin: boolean; ownsBusiness: boolean }): ViewSwitchKind {
  if (input.isAdmin) return "admin";
  if (input.ownsBusiness) return "owner";
  return "none";
}
