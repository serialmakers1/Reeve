/**
 * Pure, testable helpers for the admin Comment Moderation page
 * (src/pages/admin/CommentModeration.tsx).
 *
 * Kept free of React / Supabase so state→action mapping, report-JSON coercion,
 * burst formatting, signal summaries and RPC-error copy are unit-tested without
 * jsdom / Radix scaffolding. No "abuse"/"coordination" wording — signals are
 * factual and advisory only.
 */

// ── Moderation state + actions ───────────────────────────────────────────────

export type ModerationState = "visible" | "auto_hidden" | "admin_hidden" | "user_deleted";
export type ModerationAction = "unhide" | "delete";
/** Semantic tone → resolved to concrete Tailwind tokens in the components. */
export type ModerationTone = "neutral" | "amber" | "destructive" | "green";

interface StateMeta {
  label: string;
  tone: ModerationTone;
  actions: ModerationAction[];
}

const STATE_META: Record<ModerationState, StateMeta> = {
  visible: { label: "Visible", tone: "neutral", actions: ["delete"] },
  auto_hidden: { label: "Auto-hidden", tone: "amber", actions: ["unhide", "delete"] },
  admin_hidden: { label: "Admin-removed", tone: "destructive", actions: ["unhide"] },
  user_deleted: { label: "User-deleted", tone: "neutral", actions: [] },
};

function humanize(s: string): string {
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

/**
 * Metadata for a moderation state. Unknown/future states fail safe: neutral
 * tone, no actions, humanised label — never crash, never expose a rejectable action.
 */
export function moderationStateMeta(state: string | null | undefined): StateMeta {
  const key = (state ?? "") as ModerationState;
  return STATE_META[key] ?? { label: humanize(state ?? ""), tone: "neutral", actions: [] };
}

export function allowedActionsForState(state: string | null | undefined): ModerationAction[] {
  return moderationStateMeta(state).actions;
}

// ── Report JSON coercion ─────────────────────────────────────────────────────

export interface OpenReport {
  reason: string;
  notes: string | null;
  created_at: string;
  reporter_pseudonym: string | null;
  reporter_full_name: string | null;
  reporter_is_owner: boolean;
}

/** Safely coerce the review-queue `open_reports` Json into typed rows; garbage → []. */
export function parseOpenReports(json: unknown): OpenReport[] {
  if (!Array.isArray(json)) return [];
  const out: OpenReport[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    out.push({
      reason: typeof o.reason === "string" ? o.reason : "other",
      notes: typeof o.notes === "string" ? o.notes : null,
      created_at: typeof o.created_at === "string" ? o.created_at : "",
      reporter_pseudonym: typeof o.reporter_pseudonym === "string" ? o.reporter_pseudonym : null,
      reporter_full_name: typeof o.reporter_full_name === "string" ? o.reporter_full_name : null,
      reporter_is_owner: o.reporter_is_owner === true,
    });
  }
  return out;
}

// ── Display helpers ──────────────────────────────────────────────────────────

const EM_DASH = "—";

/** Show pseudonym + full name where both exist; fall back to whichever is present. */
export function identityLine(
  pseudonym: string | null | undefined,
  fullName: string | null | undefined,
): string {
  const p = pseudonym?.trim() || "";
  const f = fullName?.trim() || "";
  if (p && f) return `${p} · ${f}`;
  return p || f || EM_DASH;
}

export function authorTypeLabel(isOwner: boolean): "Owner" | "Member" {
  return isOwner ? "Owner" : "Member";
}

/** Property label for links/cards; never empty (would render a broken link). */
export function propertyLabel(
  building: string | null | undefined,
  locality: string | null | undefined,
  city: string | null | undefined,
): string {
  const b = building?.trim();
  if (b) return b;
  const loc = locality?.trim() || "";
  const cty = city?.trim() || "";
  if (loc && cty) return loc.toLowerCase() === cty.toLowerCase() ? loc : `${loc}, ${cty}`;
  return loc || cty || "Property details";
}

// ── Signals (factual, advisory) ──────────────────────────────────────────────

/**
 * Human "N reports within ~X" burst string, or null when not meaningful
 * (fewer than 2 reports, or missing timing).
 */
export function formatBurst(seconds: number | null | undefined, count: number): string | null {
  if (seconds == null || !Number.isFinite(seconds) || count < 2) return null;
  const s = Math.max(0, Math.round(seconds));
  let span: string;
  if (s < 60) span = "under a minute";
  else if (s < 3600) span = `~${Math.round(s / 60)} min`;
  else if (s < 86400) span = `~${Math.round(s / 3600)} hr`;
  else span = `~${Math.round(s / 86400)} days`;
  return s < 60 ? `${count} reports ${span}` : `${count} reports within ${span}`;
}

export interface QueueSignalInput {
  open_report_count: number;
  burst_seconds: number | null;
  open_reports: unknown;
}

/**
 * Concise, neutral signal chips for a review-queue row. These are cues for
 * admin judgement, never claims of coordinated abuse.
 */
export function summarizeQueueSignals(row: QueueSignalInput): string[] {
  const chips: string[] = [];
  const burst = formatBurst(row.burst_seconds, row.open_report_count);
  if (burst) chips.push(burst);
  const ownerReporters = parseOpenReports(row.open_reports).filter((r) => r.reporter_is_owner).length;
  if (ownerReporters === 1) chips.push("Property owner is a reporter");
  else if (ownerReporters > 1) chips.push(`${ownerReporters} reporters own this property`);
  return chips;
}

// ── RPC error copy ───────────────────────────────────────────────────────────

const ERROR_COPY: Record<string, string> = {
  COMMENT_NOT_HIDDEN: "This comment is already visible — it may have been unhidden by another admin.",
  ALREADY_DELETED: "This comment is already removed — it may have been deleted by another admin.",
  CANNOT_RESTORE_USER_DELETED: "This comment was deleted by its author and can't be restored.",
  CANNOT_DELETE_USER_DELETED: "This comment was already deleted by its author.",
  COMMENT_NOT_FOUND: "This comment no longer exists.",
  NOT_AUTHORIZED: "You don't have permission to do that.",
};

/** Extract the bare RAISE code Supabase surfaces (message may be prefixed). */
function errorCode(raw: string | null | undefined): string {
  const msg = (raw ?? "").trim();
  for (const key of Object.keys(ERROR_COPY)) {
    if (msg === key || msg.includes(key)) return key;
  }
  return "";
}

export function moderationErrorMessage(raw: string | null | undefined): string {
  return ERROR_COPY[errorCode(raw)] ?? "Something went wrong — please try again.";
}

/**
 * Stale-state errors (another admin already acted, or the row vanished). The
 * caller should refetch/reconcile rather than treat these as a hard failure.
 */
export function isStaleModerationError(raw: string | null | undefined): boolean {
  const key = errorCode(raw);
  return key === "COMMENT_NOT_HIDDEN" || key === "ALREADY_DELETED" || key === "COMMENT_NOT_FOUND";
}

// ── Filter/sort option constants (single source for the tab UIs) ──────────────

export const REPORT_REASON_OPTIONS = [
  { value: "all", label: "All reasons" },
  { value: "spam", label: "Spam" },
  { value: "abusive", label: "Abusive" },
  { value: "false_information", label: "False information" },
  { value: "other", label: "Other" },
] as const;

export const COMMENT_STATE_OPTIONS = [
  { value: "all", label: "All states" },
  { value: "visible", label: "Visible" },
  { value: "auto_hidden", label: "Auto-hidden" },
  { value: "admin_hidden", label: "Admin-removed" },
  { value: "user_deleted", label: "User-deleted" },
] as const;

export const REPORT_BUCKET_OPTIONS = [
  { value: "all", label: "All reports" },
  { value: "0", label: "0 reports" },
  { value: "1", label: "1 report" },
  { value: "2", label: "2 reports" },
  { value: "3_plus", label: "3+ reports" },
] as const;

export const AUTHOR_TYPE_OPTIONS = [
  { value: "all", label: "All authors" },
  { value: "owner", label: "Owner" },
  { value: "member", label: "Member" },
] as const;

export const ALL_COMMENTS_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_reported", label: "Most reported" },
] as const;

export const REVIEW_QUEUE_SORT_OPTIONS = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
] as const;

export const USER_SIGNALS_SORT_OPTIONS = [
  { value: "reports_filed", label: "Most reports filed" },
  { value: "reports_received", label: "Most reports received" },
  { value: "comments", label: "Most comments" },
] as const;
