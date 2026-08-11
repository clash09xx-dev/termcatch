/** Pure, testable invitation status + expiry logic (no crypto, no server-only). */

export const INVITE_TTL_DAYS = 7;

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * The effective status of an invitation. Revoked and accepted are terminal;
 * an otherwise-pending invitation past its expiry is "expired".
 */
export function effectiveStatus(
  inv: { status: string; expiresAt: Date; acceptedAt: Date | null },
  now: Date = new Date()
): InviteStatus {
  if (inv.status === "revoked") return "revoked";
  if (inv.status === "accepted" || inv.acceptedAt) return "accepted";
  if (inv.expiresAt.getTime() < now.getTime()) return "expired";
  return "pending";
}

/** Only a pending, unexpired, unrevoked invitation may be accepted. */
export function isAcceptable(inv: { status: string; expiresAt: Date; acceptedAt: Date | null }, now: Date = new Date()): boolean {
  return effectiveStatus(inv, now) === "pending";
}

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Zaproszenie wysłane",
  accepted: "Konto aktywne",
  expired: "Zaproszenie wygasło",
  revoked: "Zaproszenie cofnięte",
};
