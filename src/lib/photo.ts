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

function isHeic(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * Pipeline: raw file → size check → HEIC conversion (dynamic import) → compression.
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

  // Convert HEIC → JPEG via dynamic import
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

  // Compress (silent)
  try {
    const compressed = await imageCompression(input, PHOTO_CONFIG.compression);
    // imageCompression can return a Blob-like; wrap into a File to preserve name/type downstream.
    const result =
      compressed instanceof File
        ? compressed
        : new File([compressed], input.name, { type: input.type });
    return { ok: true, file: result };
  } catch {
    return { ok: false, error: { kind: "compression_failed" } };
  }
}
