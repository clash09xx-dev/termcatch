#!/usr/bin/env node
/**
 * Generator client secret (JWT) dla Sign In with Apple — potrzebny w Supabase.
 *
 * Użycie:
 *   node scripts/generate-apple-secret.mjs \
 *     --key ./AuthKey_ABC123DEFG.p8 \
 *     --team-id TWOJ_TEAM_ID \
 *     --key-id ABC123DEFG \
 *     --client-id com.termcatch.web
 *
 * Wynik wklej w Supabase → Authentication → Providers → Apple → Secret Key.
 * Token jest ważny 6 miesięcy (maksimum dozwolone przez Apple) —
 * ustaw przypomnienie, żeby wygenerować nowy przed wygaśnięciem.
 *
 * Klucz .p8 nie opuszcza Twojego komputera.
 */

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const keyPath = arg("key");
const teamId = arg("team-id");
const keyId = arg("key-id");
const clientId = arg("client-id") ?? "com.termcatch.web";

if (!keyPath || !teamId || !keyId) {
  console.error(
    "Brakuje argumentów.\n\nUżycie:\n  node scripts/generate-apple-secret.mjs --key ./AuthKey_XXX.p8 --team-id TEAMID --key-id KEYID --client-id com.termcatch.web"
  );
  process.exit(1);
}

const privateKey = readFileSync(keyPath, "utf8");

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const now = Math.floor(Date.now() / 1000);
const sixMonths = 60 * 60 * 24 * 180; // maks. dozwolone przez Apple

const header = { alg: "ES256", kid: keyId, typ: "JWT" };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + sixMonths,
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

const sign = createSign("SHA256");
sign.update(signingInput);
sign.end();
// Apple wymaga podpisu ES256 w formacie raw (IEEE P1363), nie DER
const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

const jwt = `${signingInput}.${b64url(signature)}`;

const expDate = new Date((now + sixMonths) * 1000).toLocaleDateString("pl-PL");
console.log("\nTwój client secret (wklej w Supabase → Providers → Apple → Secret Key):\n");
console.log(jwt);
console.log(`\nWażny do: ${expDate} — ustaw przypomnienie na wygenerowanie nowego.\n`);
