// ─── Google Maps helpers (pure, testable) ─────────────────────────────────────
// A salon location is "verified" only when latitude/longitude (+ ideally a
// Place ID) were stored from a real Google Places selection. Free-text
// addresses are NEVER turned into map pins by guessing, and the public map
// NEVER queries by salon name.

/** True for a real-looking key — placeholders like "AIza..." are rejected. */
export function isRealKey(value: string | undefined | null): boolean {
  if (!value) return false;
  if (value.includes("...") || /YOUR|xxx/i.test(value)) return false;
  return value.length >= 30;
}

/** Browser key (NEXT_PUBLIC — inlined client-side; restrict by HTTP referrer). */
export function mapsBrowserKey(): string | null {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return isRealKey(k) ? (k as string) : null;
}

/** Server-only key for Place Details verification (never sent to the client). */
export function mapsServerKey(): string | null {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  return isRealKey(k) ? (k as string) : null;
}

export function isPlausiblePlaceId(id: string): boolean {
  return /^[A-Za-z0-9_-]{10,300}$/.test(id);
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Turn-by-turn navigation link from VERIFIED data (keyless URL). */
export function navigationUrl(loc: { latitude: number; longitude: number; placeId?: string | null }): string {
  const dest = `${loc.latitude},${loc.longitude}`;
  const base = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  return loc.placeId ? `${base}&destination_place_id=${encodeURIComponent(loc.placeId)}` : base;
}

/** Address-only search link (no salon name — names mislead geocoding). */
export function addressSearchUrl(address: string, postalCode: string, city: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${postalCode} ${city}`)}`;
}

/** Maps Embed API URL for a verified location (requires the browser key). */
export function embedUrl(key: string, loc: { latitude: number; longitude: number; placeId?: string | null }): string {
  const q = loc.placeId ? `place_id:${loc.placeId}` : `${loc.latitude},${loc.longitude}`;
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&language=pl&zoom=16`;
}
