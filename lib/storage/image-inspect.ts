/**
 * Dependency-free image sniffing used to re-verify an uploaded photo server-side
 * (PROMPT 28) instead of trusting the client-declared MIME type/extension —
 * this is what "확장자 위변조 방지" means in practice: read the real magic
 * bytes off the object we actually stored, not what the upload request claimed.
 */
export type ImageFormat = "jpeg" | "png" | "webp" | "heic";

const FORMAT_MIME_TYPES: Record<ImageFormat, string[]> = {
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
};

export function mimeMatchesFormat(mimeType: string, format: ImageFormat): boolean {
  return FORMAT_MIME_TYPES[format].includes(mimeType.toLowerCase());
}

export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 12 && readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  if (bytes.length >= 12 && readAscii(bytes, 4, 4) === "ftyp") {
    const brand = readAscii(bytes, 8, 4);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"].includes(brand)) {
      return "heic";
    }
  }
  return null;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

/** PNG stores width/height as the first 8 bytes of the mandatory IHDR chunk right after the signature. */
function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24 || readAscii(bytes, 12, 4) !== "IHDR") return null;
  return { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) };
}

/** Handles the common VP8 (lossy) and VP8L (lossless) WebP sub-formats; skips VP8X-only extended headers. */
function readWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const chunk = readAscii(bytes, 12, 4);
  if (chunk === "VP8 ") {
    // 3-byte frame tag, then a 0x9d 0x01 0x2a start code, then 14-bit width/height (little-endian).
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return { width, height };
  }
  if (chunk === "VP8L") {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | (b1 >> 6));
    return { width, height };
  }
  return null;
}

/**
 * Walks JPEG markers looking for a Start-Of-Frame segment. Camera photos can carry large
 * EXIF/ICC segments before it, so this only succeeds if SOF falls within the provided
 * (already range-fetched) byte prefix — callers must treat `null` as "couldn't verify",
 * not "invalid", and fall back to the client-reported dimensions.
 */
function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2; // skip SOI (0xFFD8)
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    // Standalone markers with no length/payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9) return null; // EOI reached without finding SOF
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    const segmentLength = readUint16BE(bytes, offset + 2);
    if (isSof) {
      if (offset + 9 >= bytes.length) return null;
      return { height: readUint16BE(bytes, offset + 5), width: readUint16BE(bytes, offset + 7) };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

/** Returns `null` when the format can't be dimension-checked from this byte prefix (e.g. HEIC, or SOF outside the fetched range). */
export function readImageDimensions(
  bytes: Uint8Array,
  format: ImageFormat,
): { width: number; height: number } | null {
  switch (format) {
    case "png":
      return readPngDimensions(bytes);
    case "webp":
      return readWebpDimensions(bytes);
    case "jpeg":
      return readJpegDimensions(bytes);
    case "heic":
      return null;
  }
}
