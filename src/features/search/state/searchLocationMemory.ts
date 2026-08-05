import type { LocationToken } from "../domain/searchTypes";
import {
  type SearchLocationHistoryV1,
  confirmSelection,
  emptyHistory,
  mergeHistories,
} from "./searchLocationHistory";
import {
  type AccountCacheV1,
  readAnonHistory,
  writeAnonHistory,
  readAccountCache,
  writeAccountCache,
  writePendingConfirm,
  readPendingConfirm,
  clearPendingConfirm,
} from "./searchLocationStorage";
import { fetchLocationPrefs, saveLocationPrefs } from "../data/searchLocationPrefsClient";

/** Provenance of the currently-active bootstrap location. */
export type LocationSource = "url" | "memory" | "ip_unconfirmed" | "user";

// ─── Confirm (the ONLY save path) ─────────────────────────────────────────────

/**
 * Records an explicit user confirmation of a city/area selection. Called ONLY from
 * confirmed user actions (Keep-city, submit setup, manual select + submit) — never
 * from generic URL effects. An `ip_unconfirmed` location must never be passed here.
 *
 * Logged out → anonymous localStorage + a short-lived sessionStorage "pending" copy
 * that survives an OAuth redirect so it can merge into the account on login.
 * Logged in → account cache immediately + async Supabase upsert (cache freshness
 * key refreshed from the returned row). Returns the new history for optimistic UI.
 */
export async function confirmSearchLocation(args: {
  userId: string | null;
  city: string;
  areas: LocationToken[];
}): Promise<SearchLocationHistoryV1> {
  const { userId, city, areas } = args;

  if (!userId) {
    const next = confirmSelection(readAnonHistory(), city, areas);
    writeAnonHistory(next);
    // Preserve this confirmation across a login redirect (Google OAuth / reload).
    writePendingConfirm(city, areas);
    return next;
  }

  const cache = readAccountCache(userId) ?? {
    version: 1 as const,
    history: emptyHistory(),
    serverUpdatedAt: null,
  };
  const next = confirmSelection(cache.history, city, areas);
  // Optimistic: cache updated synchronously for instant restoration next visit.
  writeAccountCache(userId, { version: 1, history: next, serverUpdatedAt: cache.serverUpdatedAt });

  // Async reconcile — never blocks Search; on failure the local cache still stands.
  const serverUpdatedAt = await saveLocationPrefs(userId, next);
  if (serverUpdatedAt) {
    writeAccountCache(userId, { version: 1, history: next, serverUpdatedAt });
  }
  return next;
}

// ─── Load / reconcile ─────────────────────────────────────────────────────────

/** Synchronous history available at mount for seeding decisions. */
export function loadCachedHistory(userId: string | null): SearchLocationHistoryV1 {
  if (!userId) return readAnonHistory();
  return readAccountCache(userId)?.history ?? emptyHistory();
}

/**
 * Background reconciliation for a logged-in user. Reads the server row (bounded by the
 * caller's timeout), folds in a pending anonymous confirmation from this session, and
 * writes the merged result back to the account cache + server. Returns the reconciled
 * history (or the cached one on failure). Merge order = OLDEST→NEWEST:
 *   server (base) → account cache → current-session pending confirmation (wins).
 */
export async function reconcileAccountHistory(userId: string): Promise<SearchLocationHistoryV1> {
  const cache = readAccountCache(userId);
  const cacheHistory = cache?.history ?? emptyHistory();

  const server = await fetchLocationPrefs();
  const serverHistory = server?.history ?? emptyHistory();

  // Current-session anonymous confirmation (survived an OAuth redirect), if any.
  const pending = readPendingConfirm();
  const pendingHistory = pending
    ? confirmSelection(emptyHistory(), pending.city, pending.areas, pending.confirmedAt)
    : emptyHistory();

  const merged = mergeHistories(serverHistory, cacheHistory, pendingHistory);

  // Persist the reconciled result. Clear the pending key once folded in.
  const serverUpdatedAt = await saveLocationPrefs(userId, merged);
  writeAccountCache(userId, {
    version: 1,
    history: merged,
    serverUpdatedAt: serverUpdatedAt ?? server?.updatedAt ?? cache?.serverUpdatedAt ?? null,
  });
  if (pending) clearPendingConfirm();

  return merged;
}

export type { AccountCacheV1 };
