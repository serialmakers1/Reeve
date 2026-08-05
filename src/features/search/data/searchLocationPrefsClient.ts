import { supabase } from "@/integrations/supabase/client";
import type { SearchMode } from "@/features/search/domain/searchMode";
import {
  type SearchLocationHistory,
  validateHistory,
} from "@/features/search/state/searchLocationHistory";

/**
 * Data access for the `search_location_preferences` table.
 *
 * The table is created by migration 20260805161000_search_location_preferences.sql but
 * is NOT yet in the generated Supabase types (regenerate after deploy). The unsafe
 * `(supabase as any)` cast is intentionally isolated to THIS file. All failures are
 * swallowed by callers — persistence must never block Search or erase the local cache.
 */

export interface ServerPrefsRow {
  schemaVersion: number;
  history: SearchLocationHistory;
  updatedAt: string | null;
}

/**
 * Reads the current user's preferences row (or null if none / on error / aborted).
 * Accepts DB rows with schema_version 1 or 2 (validateHistory upgrades v1 in-memory).
 * Pass an AbortSignal so a timed-out/superseded read can be cancelled and never applied.
 */
export async function fetchLocationPrefs(
  fallbackMode?: SearchMode,
  signal?: AbortSignal,
): Promise<ServerPrefsRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("search_location_preferences")
    .select("schema_version, history, updated_at");
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return {
    schemaVersion: typeof data.schema_version === "number" ? data.schema_version : 1,
    history: validateHistory(data.history, fallbackMode),
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}

/**
 * Upserts the current user's history as schema_version 2. Returns the server
 * `updated_at` on success (used to refresh the account cache's freshness key), or
 * null on failure. Callers serialize writes per user (see searchLocationMemory).
 */
export async function saveLocationPrefs(
  userId: string,
  history: SearchLocationHistory,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("search_location_preferences")
    .upsert(
      { user_id: userId, schema_version: 2, history },
      { onConflict: "user_id" },
    )
    .select("updated_at")
    .maybeSingle();
  if (error || !data) return null;
  return typeof data.updated_at === "string" ? data.updated_at : null;
}
