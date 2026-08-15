import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Symmetric encryption for integration secrets at rest.
 *
 * Extracted from lib/fakturownia/crypto.ts so a second integration (Google
 * Calendar OAuth tokens) does not copy the same 60 lines with one word changed.
 * The behaviour is identical; the only new thing is the `domain` parameter.
 *
 * WHY THE DOMAIN MATTERS
 * The AES key is derived as SHA-256("<domain>:<secret>"), so two integrations
 * sharing the same env secret still end up with different keys. A Fakturownia
 * ciphertext therefore cannot be decrypted by the calendar code even if a bug
 * fed it there — it fails closed instead of silently cross-decrypting.
 *
 * Key source, first present wins:
 *   <PREFIX>_ENCRYPTION_KEY      dedicated, recommended in production
 *   INTEGRATION_ENCRYPTION_KEY   shared integration secret
 *   SUPABASE_SERVICE_ROLE_KEY    already required for the app to run
 * so encrypted secrets work in every environment the app already runs in with
 * no new required variable. Rotating the source secret invalidates existing
 * ciphertexts (they fail closed on decrypt), which each integration treats as
 * "reconnect required" rather than as a crash.
 *
 * Stored format (all base64url, ':'-joined):  v1:<iv>:<authTag>:<ciphertext>
 * Plaintext is NEVER logged and never returned to the browser.
 */

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard

export type SecretBox = {
  available(): boolean;
  encrypt(plaintext: string): string;
  /** Returns null on malformed / tampered / wrong-key input (fail closed). */
  decrypt(stored: string): string | null;
};

/**
 * Build an encrypt/decrypt pair bound to one integration.
 *
 * @param domain      key-separation label, e.g. "google-calendar-token"
 * @param envPrefix   optional dedicated env var prefix, e.g. "GOOGLE_CALENDAR"
 */
export function createSecretBox(domain: string, envPrefix?: string): SecretBox {
  function keySource(): string {
    const dedicated = envPrefix ? process.env[`${envPrefix}_ENCRYPTION_KEY`] : undefined;
    const s = dedicated || process.env.INTEGRATION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s || s.trim().length === 0) {
      throw new Error("Missing integration secret encryption configuration.");
    }
    return s;
  }

  function derivedKey(): Buffer {
    return createHash("sha256").update(`${domain}:${keySource()}`).digest();
  }

  return {
    available() {
      try {
        keySource();
        return true;
      } catch {
        return false;
      }
    },

    encrypt(plaintext: string): string {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGO, derivedKey(), iv);
      const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(":");
    },

    decrypt(stored: string): string | null {
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
    },
  };
}
