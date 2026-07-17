import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isRealKey, isPlausiblePlaceId, isValidLatLng, navigationUrl, addressSearchUrl, embedUrl } from "../lib/maps";

describe("isRealKey — placeholder keys never activate Google features", () => {
  test("placeholder 'AIza...' rejected", () => assert.equal(isRealKey("AIza..."), false));
  test("empty/undefined rejected", () => {
    assert.equal(isRealKey(""), false);
    assert.equal(isRealKey(undefined), false);
  });
  test("YOUR_KEY-style rejected", () => assert.equal(isRealKey("YOUR_API_KEY_HERE_1234567890123456"), false));
  test("real-shaped key accepted", () => assert.equal(isRealKey("AIzaSyA1234567890abcdefghijklmnopqrstuv"), true));
});

describe("location validation", () => {
  test("plausible place id", () => assert.equal(isPlausiblePlaceId("ChIJd8BlQ2BZwokRAFUEcm_qrcA"), true));
  test("garbage place id rejected", () => {
    assert.equal(isPlausiblePlaceId("short"), false);
    assert.equal(isPlausiblePlaceId("has spaces not allowed here"), false);
  });
  test("valid Kraków coords", () => assert.equal(isValidLatLng(50.0647, 19.945), true));
  test("0,0 island rejected", () => assert.equal(isValidLatLng(0, 0), false));
  test("out-of-range rejected", () => assert.equal(isValidLatLng(91, 10), false));
});

describe("URL builders — no salon name ever in queries", () => {
  test("navigation link from coords + place id", () => {
    const u = navigationUrl({ latitude: 50.06, longitude: 19.94, placeId: "ChIJtest12345" });
    assert.match(u, /destination=50\.06%2C19\.94/);
    assert.match(u, /destination_place_id=ChIJtest12345/);
  });
  test("navigation link without place id", () => {
    const u = navigationUrl({ latitude: 50.06, longitude: 19.94 });
    assert.doesNotMatch(u, /destination_place_id/);
  });
  test("address search link contains only address parts", () => {
    const u = addressSearchUrl("Stawowa 215 BA", "31-346", "Krakow");
    assert.match(u, /Stawowa/);
    assert.doesNotMatch(u, /nada/i);
  });
  test("embed prefers place_id and pins coords otherwise", () => {
    assert.match(embedUrl("K", { latitude: 1, longitude: 2, placeId: "ChIJx12345678" }), /q=place_id%3AChIJx12345678/);
    assert.match(embedUrl("K", { latitude: 50.1, longitude: 19.9 }), /q=50\.1%2C19\.9/);
  });
});
