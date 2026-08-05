/**
 * Owner-only public-text validation for the List Property form.
 *
 * Reuses the deployed authoritative validator `public.validate_short_text` via the
 * thin authenticated wrapper RPC `validate_property_field_text` (server owns the max
 * length per field — client can never supply or raise it). YouTube is validated
 * locally (a URL would otherwise trip validate_short_text's CONTAINS_URL rule).
 *
 * Error copy reuses the existing bio/comment wording; only TEXT_TOO_LONG is mapped
 * per-field. No new contact/abuse/URL detection regexes live here.
 */
import { supabase } from "@/integrations/supabase/client";

/** Owner-form character caps. Server enforces the first three authoritatively. */
export const OWNER_TEXT_MAX = {
  parking_notes: 80,
  building_rules: 200,
  building_notes: 300,
  youtube_walkthrough_url: 200,
} as const;

export type OwnerTextField = keyof typeof OWNER_TEXT_MAX;

/** Fields validated by the server RPC (YouTube is local-only). */
export type ServerTextField = "parking_notes" | "building_rules" | "building_notes";

const TOO_LONG_MESSAGE: Record<ServerTextField, string> = {
  parking_notes: "Parking notes must be 80 characters or fewer.",
  building_rules: "House rules must be 200 characters or fewer.",
  building_notes: "About the property must be 300 characters or fewer.",
};

const CONTACT_CODES = [
  "CONTAINS_URL",
  "CONTAINS_EMAIL",
  "CONTAINS_PHONE",
  "CONTAINS_SOCIAL_HANDLE",
  "BLOCKED_CONTENT",
];

/**
 * Maps a validator error message to user copy, or null if unrecognised.
 * Contact/link/blocked wording is reused verbatim from the bio/comment mappers;
 * length is field-specific.
 */
export function mapOwnerTextError(field: ServerTextField, message: string): string | null {
  if (message.includes("TEXT_TOO_LONG")) return TOO_LONG_MESSAGE[field];
  if (CONTACT_CODES.some((code) => message.includes(code)))
    return "Please remove phone numbers, email addresses or external links.";
  if (message.includes("BLOCKED_WORD"))
    return "Please remove abusive or inappropriate language.";
  return null;
}

export type OwnerTextResult =
  | { ok: true }
  | { ok: false; error: string } // known policy code → show inline
  | { ok: false; error: null; failed: true }; // network / unknown → show toast, still block submit

/**
 * Validates one property text field via the server RPC.
 * - Known policy codes → `{ ok:false, error }` (inline).
 * - Unmapped DB error / thrown network error → `{ ok:false, error:null, failed:true }`
 *   (caller shows a toast; never treated as valid at submit).
 */
export async function validatePropertyFieldText(
  field: ServerTextField,
  text: string,
): Promise<OwnerTextResult> {
  try {
    const { error } = await supabase.rpc("validate_property_field_text", {
      p_field: field,
      p_text: text,
    });
    if (!error) return { ok: true };
    const mapped = mapOwnerTextError(field, error.message ?? "");
    if (mapped) return { ok: false, error: mapped };
    return { ok: false, error: null, failed: true };
  } catch {
    return { ok: false, error: null, failed: true };
  }
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export type YoutubeResult =
  | { ok: true }
  | { ok: false; reason: "too_long" | "invalid" };

export const YOUTUBE_MESSAGE: Record<"too_long" | "invalid", string> = {
  too_long: "YouTube link must be 200 characters or fewer.",
  invalid: "Enter a valid YouTube video link (youtube.com/watch, youtu.be, shorts or embed).",
};

/**
 * Local YouTube validation — never calls the server (a URL trips CONTAINS_URL).
 * Empty is valid (optional field). Enforces the 200-char cap here too, because a
 * legacy value longer than 200 can load into the field and `maxLength` neither
 * truncates nor invalidates it. Requires https, a known host, and an extractable
 * 11-char video id from a watch / shorts / embed / youtu.be URL. Rejects bare
 * homepages, channels, search pages and spoofed hosts (youtube.com.evil.com).
 */
export function validateYoutubeUrl(url: string): YoutubeResult {
  const trimmed = (url ?? "").trim();
  if (trimmed === "") return { ok: true };
  if (trimmed.length > OWNER_TEXT_MAX.youtube_walkthrough_url) {
    return { ok: false, reason: "too_long" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsed.protocol !== "https:") return { ok: false, reason: "invalid" };
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return { ok: false, reason: "invalid" };

  const segments = parsed.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    videoId = segments[0] ?? null;
  } else if (segments[0] === "watch") {
    videoId = parsed.searchParams.get("v");
  } else if (segments[0] === "shorts" || segments[0] === "embed") {
    videoId = segments[1] ?? null;
  }

  if (!videoId || !VIDEO_ID_RE.test(videoId)) return { ok: false, reason: "invalid" };
  return { ok: true };
}
