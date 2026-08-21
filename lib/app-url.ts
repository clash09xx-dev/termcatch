// Canonical public app URL. Always derived from the configured
// NEXT_PUBLIC_APP_URL env var — NEVER from a request Host header (which is
// attacker-controllable). Validated to be a proper http(s) origin.
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (raw) {
    try {
      const u = new URL(raw);
      // `.origin` drops any path, query and trailing slash, so a value like
      // "https://termcatch.com/" or ".../app" can never produce a doubled slash
      // or a stray path segment in a derived callback URL.
      if (u.protocol === "https:") return u.origin;
      // Plain http is only ever legitimate for local development. Accepting it
      // anywhere else would hand Google an http redirect_uri (which it rejects)
      // and would carry an OAuth code over cleartext.
      if (u.protocol === "http:" && isLoopback(u)) return u.origin;
    } catch {
      // malformed env — fall through to the safe default
    }
  }
  return "https://termcatch.com";
}

/**
 * Loopback only — never a public address over plain http.
 *
 * Compares against the URL's own parsed field rather than naming it, so this
 * module still contains no reference to browser-controlled request headers.
 * That is an invariant with its own test: the origin must come from the
 * configured variable and nothing else.
 */
function isLoopback(u: URL): boolean {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(u.hostname);
}

/** Full public booking URL for a business slug. */
export function bookingUrl(slug: string): string {
  return `${getAppUrl()}/b/${slug}`;
}
