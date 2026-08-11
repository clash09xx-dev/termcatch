import "server-only";

import { createHmac, randomBytes } from "crypto";

/**
 * Secure invitation tokens. The raw token travels only in the email link; only
 * its HMAC is ever stored (mirrors lib/danger-codes.ts). Single-use + expiry +
 * revocation are enforced at the DB layer.
 */

function secret(): string {
  return process.env.INVITE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-invite-secret-change-me";
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHmac("sha256", secret()).update(`employee-invite:${token}`).digest("hex");
}
