/**
 * Shared rejection-reason category options + formatter.
 *
 * Used by admin reject flows (new-listing "changes requested" and edit-request
 * rejection) and by every owner/admin surface that displays the stored reason
 * category from property_activity_log.payload.reason / property_edit_requests.
 * rejection_reason.
 *
 * Reject RPCs now store the RAW category value (e.g. "policy_violation"); this
 * helper maps it to a friendly label for display. It is tolerant of:
 *   - raw category values → mapped label
 *   - legacy rows that stored the friendly label → returned unchanged
 *   - unknown snake_case values → humanized (never shown raw)
 *
 * Applies to the reason CATEGORY only. The free-text admin comment
 * (reason_text / rejection_reason_text) is a message and is shown verbatim —
 * never pass it through this helper.
 */

export const REJECTION_REASONS = [
  { value: "incomplete_details", label: "Incomplete details" },
  { value: "photos_insufficient", label: "Photos insufficient" },
  { value: "pricing_unclear", label: "Pricing unclear" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "policy_violation", label: "Policy violation" },
  { value: "other", label: "Other" },
] as const;

const VALUE_TO_LABEL = new Map<string, string>(REJECTION_REASONS.map((r) => [r.value, r.label]));
const KNOWN_LABELS = new Set<string>(REJECTION_REASONS.map((r) => r.label));

function humanizeSnakeCase(v: string): string {
  const words = v.split("_").filter(Boolean).join(" ").trim();
  if (!words) return v;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Returns a friendly label for a stored rejection-reason category, or null when
 * there is nothing to show. Never returns a raw snake_case value.
 */
export function formatRejectionReason(v?: string | null): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;

  // Known raw value (case-insensitive) → mapped label.
  const mapped = VALUE_TO_LABEL.get(trimmed.toLowerCase());
  if (mapped) return mapped;

  // Legacy rows that already stored the friendly label → unchanged.
  if (KNOWN_LABELS.has(trimmed)) return trimmed;

  // Unknown snake_case value → humanize; already-spaced text → leave as-is.
  if (trimmed.includes("_")) return humanizeSnakeCase(trimmed);
  return trimmed;
}
