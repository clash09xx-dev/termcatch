// ─── Image magic-byte sniffing (pure, testable) ──────────────────────────────
// Identifies the real file type from its bytes so server-side validation never
// trusts the browser-declared MIME type or the filename.

export type SniffedImage = { mime: string; ext: string };

function ascii(buf: Uint8Array, start: number, len: number): string {
  return String.fromCharCode(...buf.subarray(start, start + len));
}

/**
 * Returns the detected image type, the literal "heic" for Apple HEIC/HEIF
 * containers (recognized but unsupported), or null for anything else
 * (including executables and unknown formats).
 */
export function sniffImageType(buf: Uint8Array): SniffedImage | "heic" | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && ascii(buf, 1, 3) === "PNG") {
    return { mime: "image/png", ext: "png" };
  }
  // GIF: GIF87a / GIF89a
  if (ascii(buf, 0, 6) === "GIF87a" || ascii(buf, 0, 6) === "GIF89a") {
    return { mime: "image/gif", ext: "gif" };
  }
  // WebP: RIFF....WEBP
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  // ISO-BMFF containers: size(4) + "ftyp" + brand(4)
  if (ascii(buf, 4, 4) === "ftyp") {
    const brand = ascii(buf, 8, 4);
    if (brand === "avif" || brand === "avis") {
      return { mime: "image/avif", ext: "avif" };
    }
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"].includes(brand)) {
      return "heic";
    }
  }
  return null;
}
