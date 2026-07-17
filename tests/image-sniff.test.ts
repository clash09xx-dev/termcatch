import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sniffImageType } from "../lib/image-sniff";

function bmff(brand: string): Uint8Array {
  const b = new Uint8Array(16);
  b.set([0, 0, 0, 16], 0);
  b.set([..."ftyp"].map((c) => c.charCodeAt(0)), 4);
  b.set([...brand].map((c) => c.charCodeAt(0)), 8);
  return b;
}

describe("sniffImageType — real bytes decide, never the declared MIME", () => {
  test("JPEG magic", () => {
    const b = new Uint8Array(16); b.set([0xff, 0xd8, 0xff, 0xe0]);
    assert.deepEqual(sniffImageType(b), { mime: "image/jpeg", ext: "jpg" });
  });
  test("PNG magic", () => {
    const b = new Uint8Array(16); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.deepEqual(sniffImageType(b), { mime: "image/png", ext: "png" });
  });
  test("WebP RIFF container", () => {
    const b = new Uint8Array(16);
    b.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
    b.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
    assert.deepEqual(sniffImageType(b), { mime: "image/webp", ext: "webp" });
  });
  test("AVIF brand", () => {
    assert.deepEqual(sniffImageType(bmff("avif")), { mime: "image/avif", ext: "avif" });
  });
  test("HEIC brands recognized as unsupported (clear rejection, not unknown)", () => {
    assert.equal(sniffImageType(bmff("heic")), "heic");
    assert.equal(sniffImageType(bmff("mif1")), "heic");
  });
  test("executable/unknown bytes rejected even with an image name/MIME", () => {
    const elf = new Uint8Array(16); elf.set([0x7f, 0x45, 0x4c, 0x46]); // ELF
    const mz = new Uint8Array(16); mz.set([0x4d, 0x5a]); // Windows MZ
    assert.equal(sniffImageType(elf), null);
    assert.equal(sniffImageType(mz), null);
    assert.equal(sniffImageType(new Uint8Array(4)), null); // too short
  });
});
