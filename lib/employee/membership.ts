// What a join request grants, stated once, in one dependency-free place.
//
// The rule the whole feature rests on:
//
//     join code   → the right to ASK
//     approval    → membership
//
// Everything that could accidentally blur that line lives here as a pure
// function, so "does a PENDING request let someone into the salon?" is answered
// by a test rather than by reading three server files and hoping.
//
// Note that the runtime does NOT consult these functions to decide access —
// access is an ACTIVE Employee row, resolved from the session in lib/ownership.
// A pending request creates no Employee row, so the guarantee is structural.
// These exist to name the invariant and to pin it under test.

import type { JoinRequestStatus } from "@prisma/client";

/**
 * Does a request in this state give the applicant a salon context (the panel,
 * the Client/Salon switch, employee permissions)?
 *
 * Only APPROVED does, and even then only because approval is what creates the
 * Employee row — the status alone is never read as an authorization.
 */
export function grantsSalonContext(status: JoinRequestStatus): boolean {
  return status === "APPROVED";
}

/** Is the owner still expected to act on this request? */
export function awaitsOwnerDecision(status: JoinRequestStatus): boolean {
  return status === "PENDING";
}

/**
 * May this person apply (again) to this salon?
 *
 * A rejection is not a ban: people get re-hired, and an owner who mis-clicked
 * should not have to contact support. A PENDING request cannot be re-submitted
 * because it is already in the queue, and an APPROVED one because they are
 * already on the team.
 */
export function canReapply(status: JoinRequestStatus | null): boolean {
  return status === null || status === "REJECTED";
}

/** The states an applicant's account can truthfully report about one salon. */
export type MembershipDisplayState =
  /** No relationship with any salon. */
  | "none"
  /** Applied; the owner has not decided yet. */
  | "pending"
  /** Applied; the last approval attempt hit the salon's specialist limit. */
  | "blocked"
  /** On the team. */
  | "approved"
  /** The owner declined. */
  | "rejected";

/**
 * What the applicant's settings page should say.
 *
 * `activeMembership` wins over everything: it is the only input derived from a
 * real Employee row, so if the two ever disagree the row is the truth and the
 * request is stale bookkeeping.
 */
export function membershipDisplayState(input: {
  activeMembership: boolean;
  requestStatus: JoinRequestStatus | null;
  /** The last approval attempt was refused by the plan limit. */
  blocked?: boolean;
}): MembershipDisplayState {
  if (input.activeMembership) return "approved";
  if (input.requestStatus === "APPROVED") return "approved";
  if (input.requestStatus === "PENDING") return input.blocked ? "blocked" : "pending";
  if (input.requestStatus === "REJECTED") return "rejected";
  return "none";
}
