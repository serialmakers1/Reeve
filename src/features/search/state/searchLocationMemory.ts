import type { LocationToken } from "../domain/searchTypes";
import type { SearchMode } from "../domain/searchMode";
import {
  type SearchLocationHistory,
  confirmSelection,
  emptyHistory,
  mergeHistories,
  removeCity,
} from "./searchLocationHistory";
import {
  type AccountCacheV1,
  readAnonHistory,
  writeAnonHistory,
  readAccountCache,
  writeAccountCache,
  writePendingConfirm,
  readPendingConfirm,
  readPendingConfirmCity,
  clearPendingConfirm,
} from "./searchLocationStorage";
import { fetchLocationPrefs, saveLocationPrefs } from "../data/searchLocationPrefsClient";

/** Provenance of the currently-active bootstrap location. */
export type LocationSource = "url" | "memory" | "ip_unconfirmed" | "user";

export interface ConfirmedSearchSetup {
  city: string;
  areas: LocationToken[];
  mode: SearchMode;
  propertyTypes: string[];
}

// ─── Per-user write serialization ─────────────────────────────────────────────
// Every Supabase write for a given user runs strictly in submission order, so an
// older in-flight upsert can never land after a newer remove/clear and resurrect
// deleted history. The local cache is written synchronously (already ordered); the
// queue makes the server converge to the same final state. The map entry is deleted
// once its chain settles so it cannot grow unbounded.

const writeChains = new Map<string, Promise<unknown>>();

function serializeWrite<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const prev = writeChains.get(userId) ?? Promise.resolve();
  const next = prev.then(task, task); // run regardless of the previous outcome
  const tracked = next.catch(() => {}).finally(() => {
    if (writeChains.get(userId) === tracked) writeChains.delete(userId);
  });
  writeChains.set(userId, tracked);
  return next;
}

/** Serialized server upsert that refreshes only the cache freshness key (never regresses history). */
function queueServerSave(userId: string, history: SearchLocationHistory): Promise<void> {
  return serializeWrite(userId, async () => {
    const serverUpdatedAt = await saveLocationPrefs(userId, history);
    if (serverUpdatedAt) {
      const cur = readAccountCache(userId);
      writeAccountCache(userId, {
        version: 1,
        history: cur?.history ?? history,
        serverUpdatedAt,
      });
    }
  });
}

// ─── Confirm (the ONLY save path) ─────────────────────────────────────────────

/**
 * Records an explicit user confirmation of the COMPLETE setup (city + areas + mode +
 * property types). Called ONLY from confirmed user actions (submit, Keep-city, recent-
 * city apply, explicit Rent/Buy change). An `ip_unconfirmed` location must never reach here.
 *
 * Logged out → anonymous localStorage (v2) + a short-lived sessionStorage "pending" copy
 * that survives an OAuth redirect. Logged in → account cache immediately + serialized
 * Supabase upsert (schema_version 2). Returns the new history for optimistic UI.
 */
export async function confirmSearchSetup(args: {
  userId: string | null;
  setup: ConfirmedSearchSetup;
}): Promise<SearchLocationHistory> {
  const { userId, setup } = args;
  const { city, areas, mode, propertyTypes } = setup;

  if (!userId) {
    const next = confirmSelection(readAnonHistory(), city, areas, mode, propertyTypes);
    writeAnonHistory(next);
    writePendingConfirm(city, areas, mode, propertyTypes);
    return next;
  }

  const cache = readAccountCache(userId) ?? {
    version: 1 as const,
    history: emptyHistory(),
    serverUpdatedAt: null,
  };
  const next = confirmSelection(cache.history, city, areas, mode, propertyTypes);
  // Optimistic + synchronously ordered cache update.
  writeAccountCache(userId, { version: 1, history: next, serverUpdatedAt: cache.serverUpdatedAt });
  void queueServerSave(userId, next);
  return next;
}

// ─── Remove / clear ───────────────────────────────────────────────────────────

export async function removeRememberedCity(args: {
  userId: string | null;
  city: string;
}): Promise<SearchLocationHistory> {
  const { userId, city } = args;

  // Drop a pending confirmation for this exact city so it can't return via login merge.
  if (readPendingConfirmCity() === city.trim().toLowerCase()) clearPendingConfirm();

  if (!userId) {
    const next = removeCity(readAnonHistory(), city);
    writeAnonHistory(next);
    return next;
  }

  const cache = readAccountCache(userId);
  const next = removeCity(cache?.history ?? emptyHistory(), city);
  writeAccountCache(userId, { version: 1, history: next, serverUpdatedAt: cache?.serverUpdatedAt ?? null });
  void queueServerSave(userId, next);
  return next;
}

export async function clearRememberedHistory(args: {
  userId: string | null;
}): Promise<SearchLocationHistory> {
  const { userId } = args;
  clearPendingConfirm(); // clearing all must always drop the pending confirmation

  const next = emptyHistory();
  if (!userId) {
    writeAnonHistory(next);
    return next;
  }
  const cache = readAccountCache(userId);
  writeAccountCache(userId, { version: 1, history: next, serverUpdatedAt: cache?.serverUpdatedAt ?? null });
  void queueServerSave(userId, next);
  return next;
}

// ─── Load / reconcile ─────────────────────────────────────────────────────────

/** Synchronous history available at mount for seeding decisions. */
export function loadCachedHistory(
  userId: string | null,
  fallbackMode?: SearchMode,
): SearchLocationHistory {
  if (!userId) return readAnonHistory(fallbackMode);
  return readAccountCache(userId, fallbackMode)?.history ?? emptyHistory();
}

/**
 * Background reconciliation for a logged-in user. Reads the server row (abortable),
 * folds in a pending anonymous confirmation from this session, writes the merged
 * result back to the account cache, and serializes the server upsert. Merge order =
 * OLDEST→NEWEST: server (base) → account cache → current-session pending (wins).
 * Returns the reconciled history (or the cached one on failure).
 */
export async function reconcileAccountHistory(
  userId: string,
  fallbackMode?: SearchMode,
  signal?: AbortSignal,
): Promise<SearchLocationHistory> {
  const cache = readAccountCache(userId, fallbackMode);
  const cacheHistory = cache?.history ?? emptyHistory();

  const server = await fetchLocationPrefs(fallbackMode, signal);
  const serverHistory = server?.history ?? emptyHistory();

  const pending = readPendingConfirm();
  const pendingHistory = pending
    ? confirmSelection(
        emptyHistory(),
        pending.city,
        pending.areas,
        pending.mode,
        pending.propertyTypes,
        pending.confirmedAt,
      )
    : emptyHistory();

  const merged = mergeHistories(serverHistory, cacheHistory, pendingHistory);

  writeAccountCache(userId, {
    version: 1,
    history: merged,
    serverUpdatedAt: server?.updatedAt ?? cache?.serverUpdatedAt ?? null,
  });
  void queueServerSave(userId, merged);
  if (pending) clearPendingConfirm();

  return merged;
}

export type { AccountCacheV1 };
