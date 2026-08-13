import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Symmetric encryption for integration secrets at rest (currently the
 * Fakturownia API token). AES-256-GCM (authenticated) so a tampered ciphertext
 * is rejected on decrypt rather than silently mis-decrypted.
 *
 * The key is DERIVED (SHA-256) from a server-only secret and never leaves the
 * server. Preference order — the first present wins:
 *   FAKTUROWNIA_ENCRYPTION_KEY  (dedicated, recommended in production)
 *   INTEGRATION_ENCRYPTION_KEY  (shared integration secret)
 *   SUPABASE_SERVICE_ROLE_KEY   (already required for the app to run)
 * This mirrors lib/danger-codes.ts / lib/employee/invite-token.ts, so encrypted
 * secrets work in every environment the app already runs in — no new required
 * env var. Rotating the source secret invalidates existing ciphertexts (they
 * fail closed on decrypt), which the connection layer treats as "reconnect".
 *
 * Stored format (all base64url, ':'-joined):  v1:<iv>:<authTag>:<ciphertext>
 * Plaintext tokens are NEVER logged or returned to the browser.
 */

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard

function keySource(): string {
  const s =
    process.env.FAKTUROWNIA_ENCRYPTION_KEY ||
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s || s.trim().length === 0) {
    throw new Error("Brak konfiguracji szyfrowania sekretów integracji.");
  }
  return s;
}

/** 32-byte AES key derived from the server secret (never the raw secret). */
function derivedKey(): Buffer {
  return createHash("sha256").update(`fakturownia-secret:${keySource()}`).digest();
}

/** True when the app can encrypt/decrypt integration secrets in this env. */
export function encryptionAvailable(): boolean {
  try {
    keySource();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, derivedKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(":");
}

/** Decrypt; returns null on any malformed/tampered/wrong-key input (fail closed). */
export function decryptSecret(stored: string): string | null {
  try {
    const parts = stored.split(":");
    if (parts.length !== 4 || parts[0] !== VERSION) return null;
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ct = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv(ALGO, derivedKey(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}
