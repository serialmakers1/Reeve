import type { LocationToken } from "../domain/searchTypes";
import {
  type SearchLocationHistoryV1,
  emptyHistory,
  validateHistory,
} from "./searchLocationHistory";

// ─── Keys ───────────────────────────────────────────────────────────────────

const ANON_KEY = "reeve_search_location_anon_v1";
const ACCOUNT_KEY_PREFIX = "reeve_search_location_account_v1:";
const PENDING_CONFIRM_KEY = "reeve_search_pending_confirm_v1";

const PENDING_CONFIRM_TTL_MS = 10 * 60 * 1000; // 10 minutes

function accountKey(userId: string): string {
  return `${ACCOUNT_KEY_PREFIX}${userId}`;
}

// ─── Browser-guarded storage primitives ───────────────────────────────────────
// Every access is try/catch guarded: unavailable (SSR / private mode), corrupted,
// or quota-rejected storage is treated as empty and never throws, so Search always
// works (falls through to IP → setup).

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch {
    /* unavailable / quota — ignore */
  }
}

function safeRemove(storage: () => Storage, key: string): void {
  try {
    storage().removeItem(key);
  } catch {
    /* ignore */
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

// ─── Anonymous history (localStorage) ─────────────────────────────────────────

export function readAnonHistory(): SearchLocationHistoryV1 {
  const raw = safeGet(local, ANON_KEY);
  if (!raw) return emptyHistory();
  try {
    return validateHistory(JSON.parse(raw));
  } catch {
    return emptyHistory();
  }
}

export function writeAnonHistory(history: SearchLocationHistoryV1): void {
  safeSet(local, ANON_KEY, JSON.stringify(history));
}

// ─── Account cache (localStorage, per-user) ───────────────────────────────────

export interface AccountCacheV1 {
  version: 1;
  history: SearchLocationHistoryV1;
  /** ISO timestamp of the last successfully-synced Supabase row; null before first sync. */
  serverUpdatedAt: string | null;
}

export function readAccountCache(userId: string): AccountCacheV1 | null {
  if (!userId) return null;
  const raw = safeGet(local, accountKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.version !== 1) return null;
    return {
      version: 1,
      history: validateHistory(parsed.history),
      serverUpdatedAt:
        typeof parsed.serverUpdatedAt === "string" ? parsed.serverUpdatedAt : null,
    };
  } catch {
    return null;
  }
}

export function writeAccountCache(userId: string, cache: AccountCacheV1): void {
  if (!userId) return;
  safeSet(local, accountKey(userId), JSON.stringify(cache));
}

export function clearAccountCache(userId: string): void {
  if (!userId) return;
  safeRemove(local, accountKey(userId));
}

// ─── Pending anonymous confirmation (sessionStorage, survives OAuth redirect) ──

export interface PendingConfirmV1 {
  version: 1;
  city: string;
  areas: LocationToken[];
  confirmedAt: number;
  expiresAt: number;
}

export function writePendingConfirm(city: string, areas: LocationToken[]): void {
  const now = Date.now();
  const payload: PendingConfirmV1 = {
    version: 1,
    city,
    areas,
    confirmedAt: now,
    expiresAt: now + PENDING_CONFIRM_TTL_MS,
  };
  safeSet(session, PENDING_CONFIRM_KEY, JSON.stringify(payload));
}

/** Reads the pending confirmation if present and unexpired, else null. Does not clear. */
export function readPendingConfirm(): PendingConfirmV1 | null {
  const raw = safeGet(session, PENDING_CONFIRM_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.version !== 1) return null;
    if (typeof parsed.city !== "string" || !parsed.city) return null;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null;
    const areas = Array.isArray(parsed.areas) ? (parsed.areas as LocationToken[]) : [];
    return {
      version: 1,
      city: parsed.city,
      areas,
      confirmedAt: typeof parsed.confirmedAt === "number" ? parsed.confirmedAt : 0,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingConfirm(): void {
  safeRemove(session, PENDING_CONFIRM_KEY);
}
