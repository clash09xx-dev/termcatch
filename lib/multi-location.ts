// ─── Multi-location feature flag (Wave 4) ───────────────────────────────────
// The Location model + owner-scoped location management + booking location
// selection all sit BEHIND this flag. It is OFF by default: until it is
// explicitly enabled (and the deterministic migration in scripts/backfill-
// locations.ts has been run against the target database), every business
// behaves as a single-location salon exactly as before — no code path queries
// `prisma.location`. Flip MULTI_LOCATION_ENABLED=true only AFTER the migration.

export function multiLocationEnabled(): boolean {
  return process.env.MULTI_LOCATION_ENABLED === "true";
}
