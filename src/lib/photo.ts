import imageCompression from "browser-image-compression";
import { PHOTO_CONFIG, type PhotoAcceptedFormat } from "@/config/photo";

export type PhotoProcessError =
  | { kind: "too_large"; sizeMB: number }
  | { kind: "unsupported_format"; type: string }
  | { kind: "heic_conversion_failed" }
  | { kind: "compression_failed" };

export type PhotoProcessResult =
  | { ok: true; file: File }
  | { ok: false; error: PhotoProcessError };

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
// Final output must be an upload-accepted raster type (matches the Edge Function's allow-list).
const OUTPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Hard upper bound on any returned file — mirrors upload-property-image MAX_BYTES (10 MB).
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function isHeic(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

// Cached, feature-based WebP-encode detection (never UA-sniff). SSR/no-canvas safe.
let webpEncodeSupport: boolean | null = null;
function canEncodeWebp(): boolean {
  if (webpEncodeSupport !== null) return webpEncodeSupport;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    webpEncodeSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpEncodeSupport = false;
  }
  return webpEncodeSupport;
}

// Rename so extension always agrees with the actual MIME (the Edge Function derives the
// R2 object extension from the uploaded content type).
function normalizeName(sourceName: string, type: string): File["name"] {
  const ext = type === "image/webp" ? ".webp" : type === "image/png" ? ".png" : ".jpg";
  const stem = sourceName.replace(/\.[^./\\]+$/, "") || "photo";
  return stem + ext;
}
function finalize(sourceName: string, produced: File): File {
  const name = normalizeName(sourceName, produced.type);
  if (produced.name === name) return produced;
  return new File([produced], name, { type: produced.type });
}

/**
 * Preprocess ONE newly selected image into a single optimized upload candidate.
 * Pipeline: raw file → size check → HEIC/HEIF→JPEG (dynamic import) → compress to
 * ≤1280px longest edge, q0.70, EXIF stripped → prefer WebP, else format-safe fallback.
 * Every successful output is a PROCESSED candidate (never the raw original): MIME ∈
 * {webp,jpeg,png}, ≤1280px, EXIF-stripped, ≤10 MB, and reduced when possible.
 * Silent — no logging, no toast. Callers decide how to surface errors.
 * heic2any is dynamically imported to keep the initial bundle unchanged for non-iPhone users.
 */
export async function processPhotoForUpload(
  file: File,
): Promise<PhotoProcessResult> {
  // Reject files above raw size limit (prevents heic2any memory crash on very large iPhone photos)
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > PHOTO_CONFIG.upload.maxSizeMBRaw) {
    return { ok: false, error: { kind: "too_large", sizeMB } };
  }

  let input: File = file;

  // Convert HEIC/HEIF → JPEG via dynamic import (unchanged). HEVC/other formats are not
  // HEIC and fall through to the acceptedFormats validation below → unsupported_format.
  if (isHeic(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      input = new File(
        [blob],
        file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        { type: "image/jpeg" },
      );
    } catch {
      return { ok: false, error: { kind: "heic_conversion_failed" } };
    }
  } else {
    // Validate format for non-HEIC files
    const accepted = PHOTO_CONFIG.upload.acceptedFormats;
    if (!accepted.includes(file.type as PhotoAcceptedFormat)) {
      return { ok: false, error: { kind: "unsupported_format", type: file.type } };
    }
  }

  const sourceBytes = file.size;

  // Run one compression pass; return a *valid candidate* File (accepted MIME + ≤10 MB) or null.
  const compress = async (fileType: string): Promise<File | null> => {
    try {
      const out = await imageCompression(input, { ...PHOTO_CONFIG.compression, fileType });
      const produced =
        out instanceof File
          ? out
          : new File([out], input.name, { type: (out as Blob).type || fileType });
      if (OUTPUT_TYPES.has(produced.type) && produced.size <= MAX_UPLOAD_BYTES) return produced;
      return null;
    } catch {
      return null;
    }
  };

  // Prefer WebP. Verify the real output MIME (do not trust the requested fileType).
  let webpCand: File | null = null;
  if (canEncodeWebp()) {
    const out = await compress("image/webp");
    if (out && out.type === "image/webp") webpCand = out;
  }
  if (webpCand && webpCand.size < sourceBytes) {
    return { ok: true, file: finalize(file.name, webpCand) }; // smaller WebP wins; skip fallback
  }

  // Format-safe fallback. WebP/PNG inputs fall back to PNG to keep alpha; never WebP→JPEG.
  const fallbackType =
    input.type === "image/png" || input.type === "image/webp" ? "image/png" : "image/jpeg";
  const fbCand = await compress(fallbackType);
  if (fbCand && fbCand.size < sourceBytes) {
    return { ok: true, file: finalize(file.name, fbCand) };
  }

  // Neither beat the source: pick the smallest valid PROCESSED candidate (never the raw
  // original — it may exceed 1280px or retain EXIF). Fail only if nothing valid ≤10 MB.
  const candidates = [webpCand, fbCand].filter((c): c is File => c !== null);
  if (candidates.length === 0) {
    return { ok: false, error: { kind: "compression_failed" } };
  }
  const smallest = candidates.reduce((a, b) => (b.size < a.size ? b : a));
  return { ok: true, file: finalize(file.name, smallest) };
}
