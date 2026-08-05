import { supabase } from "@/integrations/supabase/client";
import {
  type SearchLocationHistoryV1,
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
  history: SearchLocationHistoryV1;
  updatedAt: string | null;
}

/** Reads the current user's preferences row (or null if none / on error). */
export async function fetchLocationPrefs(): Promise<ServerPrefsRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("search_location_preferences")
    .select("history, updated_at")
    .maybeSingle();
  if (error || !data) return null;
  return {
    history: validateHistory(data.history),
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}

/**
 * Upserts the current user's history. Returns the server `updated_at` on success
 * (used to refresh the account cache's freshness key), or null on failure.
 */
export async function saveLocationPrefs(
  userId: string,
  history: SearchLocationHistoryV1,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("search_location_preferences")
    .upsert(
      { user_id: userId, schema_version: 1, history },
      { onConflict: "user_id" },
    )
    .select("updated_at")
    .maybeSingle();
  if (error || !data) return null;
  return typeof data.updated_at === "string" ? data.updated_at : null;
}
