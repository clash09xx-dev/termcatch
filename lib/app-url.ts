// Canonical public app URL. Always derived from the configured
// NEXT_PUBLIC_APP_URL env var — NEVER from a request Host header (which is
// attacker-controllable). Validated to be a proper http(s) origin.
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" || u.protocol === "http:") return u.origin;
    } catch {
      // malformed env — fall through to the safe default
    }
  }
  return "https://termcatch.com";
}

/** Full public booking URL for a business slug. */
export function bookingUrl(slug: string): string {
  return `${getAppUrl()}/b/${slug}`;
}
