import type { Event } from "@sentry/react";

/**
 * Narrow allow-list of fully-handled Supabase/PostgREST control-flow responses that
 * `Sentry.supabaseIntegration` reports as unhandled (`mechanism.type ===
 * 'auto.db.supabase.postgres'`, from `new Error(res.error.message)`) even though the
 * application already handles them correctly:
 *
 *   - ALREADY_REPORTED — duplicate comment report; caught in ReportModal (inline message).
 *   - location_not_ready:publish_location_incomplete — admin published before finalizing
 *     location; caught in ListingReviewDetail (toast). The DB publish guard is correct.
 *   - AbortError: signal is aborted without reason — expected TanStack/navigation
 *     cancellation of an in-flight read (e.g. search_location_preferences); swallowed
 *     by callers. supabase-js surfaces the aborted fetch as `res.error` with this exact
 *     message, code "", status 0.
 *
 * Exact-equality only. Everything else — sibling `location_not_ready:*`, `invalid_anchor`,
 * `Cover changes are not allowed…`, other AbortError values, generic network/FetchError,
 * RLS/permission, unknown DB/RPC, and anything under a different mechanism (e.g. the
 * `auto.db.supabase.auth` `AuthRetryableFetchError`) — stays visible. Fail open: any
 * uncertainty (no exception, no matching mechanism, differing value) returns false.
 */
const SUPABASE_POSTGRES_MECHANISM = "auto.db.supabase.postgres";

const EXPECTED_POSTGRES_VALUES: ReadonlySet<string> = new Set([
  "ALREADY_REPORTED",
  "location_not_ready:publish_location_incomplete",
  "AbortError: signal is aborted without reason",
]);

/**
 * True when the event is a known, fully-handled Supabase noise event that should be
 * dropped in `beforeSend`. Returns false for anything it cannot positively identify.
 */
export function isExpectedSupabaseNoise(event: Event): boolean {
  // Inspect ONLY the primary exception: an event can carry multiple exception
  // values (e.g. a chained/secondary error), and dropping the whole event because
  // a secondary entry matched the allow-list would suppress a real primary error.
  const exception = event.exception?.values?.[0];

  return (
    exception?.mechanism?.type === SUPABASE_POSTGRES_MECHANISM &&
    typeof exception.value === "string" &&
    EXPECTED_POSTGRES_VALUES.has(exception.value)
  );
}
