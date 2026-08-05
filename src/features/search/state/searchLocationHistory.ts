import type { LocationToken } from "../domain/searchTypes";
import { MAX_SELECTED_LOCATIONS } from "../domain/searchConstants";
import { validateLocationToken } from "./locationTokenValidation";

// ─── Model ──────────────────────────────────────────────────────────────────

export interface SearchLocationHistoryCityV1 {
  city: string; // normalized lowercase
  /** Exact last confirmed selection for this city ([] = whole-city search). */
  lastSelectedAreas: LocationToken[];
  /** Quick-pick pool of recently used areas for this city. */
  recentAreas: LocationToken[];
  confirmedAt: number;
}

export interface SearchLocationHistoryV1 {
  version: 1;
  /** Most-recently-confirmed first. cities[0] is the default. */
  cities: SearchLocationHistoryCityV1[];
}

// ─── Caps ───────────────────────────────────────────────────────────────────

export const MAX_HISTORY_CITIES = 5;
export const MAX_RECENT_AREAS_PER_CITY = 8;

export function emptyHistory(): SearchLocationHistoryV1 {
  return { version: 1, cities: [] };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeCityName(city: unknown): string | null {
  if (typeof city !== "string") return null;
  const c = city.trim().toLowerCase();
  if (!c || c.length > 120) return null;
  if (c.includes("<") || c.includes(">")) return null;
  return c;
}

/** Deduplicate tokens by id, preserving first-seen order, capped. */
function dedupTokens(tokens: LocationToken[], cap: number): LocationToken[] {
  const seen = new Set<string>();
  const out: LocationToken[] = [];
  for (const t of tokens) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/** Validate an untrusted token array, discarding invalid items individually. */
function validateTokens(raw: unknown, cap: number): LocationToken[] {
  if (!Array.isArray(raw)) return [];
  const out: LocationToken[] = [];
  for (const item of raw) {
    const t = validateLocationToken(item);
    if (t) out.push(t);
  }
  return dedupTokens(out, cap);
}

// ─── Validation / normalization ───────────────────────────────────────────────

/**
 * Validates untrusted history (from localStorage or Supabase JSONB) into a safe,
 * normalized SearchLocationHistoryV1. Never throws. Unsupported versions and
 * malformed shapes yield empty history; individual bad cities/areas are dropped.
 */
export function validateHistory(raw: unknown): SearchLocationHistoryV1 {
  if (typeof raw !== "object" || raw === null) return emptyHistory();
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1 || !Array.isArray(obj.cities)) return emptyHistory();

  const seenCities = new Set<string>();
  const cities: SearchLocationHistoryCityV1[] = [];
  for (const c of obj.cities) {
    if (typeof c !== "object" || c === null) continue;
    const co = c as Record<string, unknown>;
    const city = normalizeCityName(co.city);
    if (!city || seenCities.has(city)) continue;
    const confirmedAt =
      typeof co.confirmedAt === "number" && Number.isFinite(co.confirmedAt) ? co.confirmedAt : 0;
    const lastSelectedAreas = validateTokens(co.lastSelectedAreas, MAX_SELECTED_LOCATIONS);
    const recentAreas = validateTokens(co.recentAreas, MAX_RECENT_AREAS_PER_CITY);
    seenCities.add(city);
    cities.push({ city, lastSelectedAreas, recentAreas, confirmedAt });
  }

  return normalizeHistory({ version: 1, cities });
}

/** Sorts cities most-recent-first and enforces the city cap. */
export function normalizeHistory(history: SearchLocationHistoryV1): SearchLocationHistoryV1 {
  const cities = [...history.cities]
    .sort((a, b) => b.confirmedAt - a.confirmedAt)
    .slice(0, MAX_HISTORY_CITIES);
  return { version: 1, cities };
}

/**
 * Records an explicit user confirmation of `city` + `areas`. Moves the city to the
 * front (newest), stores the exact selection as lastSelectedAreas, and folds the
 * selected areas into that city's recentAreas pool (deduped, capped).
 * `areas` may be [] — a whole-city confirmation.
 */
export function confirmSelection(
  history: SearchLocationHistoryV1,
  city: string,
  areas: LocationToken[],
  now: number = Date.now(),
): SearchLocationHistoryV1 {
  const norm = normalizeCityName(city);
  if (!norm) return history;
  const cleanAreas = dedupTokens(
    areas.map((a) => validateLocationToken(a)).filter((a): a is LocationToken => a !== null),
    MAX_SELECTED_LOCATIONS,
  );

  const existing = history.cities.find((c) => c.city === norm);
  const rest = history.cities.filter((c) => c.city !== norm);

  // New selected areas lead the recentAreas pool, then prior recents.
  const mergedRecent = dedupTokens(
    [...cleanAreas, ...(existing?.recentAreas ?? [])],
    MAX_RECENT_AREAS_PER_CITY,
  );

  const entry: SearchLocationHistoryCityV1 = {
    city: norm,
    lastSelectedAreas: cleanAreas,
    recentAreas: mergedRecent,
    confirmedAt: now,
  };

  return normalizeHistory({ version: 1, cities: [entry, ...rest] });
}

/** The default city + its exact last selection, or null when history is empty. */
export function latestSelection(
  history: SearchLocationHistoryV1,
): { city: string; areas: LocationToken[] } | null {
  const first = normalizeHistory(history).cities[0];
  if (!first) return null;
  return { city: first.city, areas: first.lastSelectedAreas };
}

/** Recent-area quick picks for one city (city-scoped; never mixes cities). */
export function recentAreasForCity(history: SearchLocationHistoryV1, city: string): LocationToken[] {
  const norm = normalizeCityName(city);
  if (!norm) return [];
  return history.cities.find((c) => c.city === norm)?.recentAreas ?? [];
}

/**
 * City-scoped memory for one city: the exact last selection + the recent-area pool.
 * Always returns empty arrays for an unknown city (never mixes cities).
 */
export function cityMemory(
  history: SearchLocationHistoryV1,
  city: string,
): { lastSelectedAreas: LocationToken[]; recentAreas: LocationToken[] } {
  const norm = normalizeCityName(city);
  const entry = norm ? history.cities.find((c) => c.city === norm) : undefined;
  return {
    lastSelectedAreas: entry?.lastSelectedAreas ?? [],
    recentAreas: entry?.recentAreas ?? [],
  };
}

/** Ordered list of recent city names (most-recent first). */
export function recentCities(history: SearchLocationHistoryV1): string[] {
  return normalizeHistory(history).cities.map((c) => c.city);
}

/**
 * Deterministic merge of multiple histories (e.g. server, account cache, current-session
 * confirmation). Earlier arguments are OLDER; later arguments WIN on both city recency
 * (higher confirmedAt) and per-city area data. Used on login reconciliation.
 */
export function mergeHistories(
  ...histories: SearchLocationHistoryV1[]
): SearchLocationHistoryV1 {
  const byCity = new Map<string, SearchLocationHistoryCityV1>();
  for (const h of histories) {
    for (const c of h.cities) {
      const prev = byCity.get(c.city);
      if (!prev || c.confirmedAt >= prev.confirmedAt) {
        byCity.set(c.city, {
          city: c.city,
          lastSelectedAreas: c.lastSelectedAreas,
          recentAreas: dedupTokens(
            [...c.recentAreas, ...(prev?.recentAreas ?? [])],
            MAX_RECENT_AREAS_PER_CITY,
          ),
          confirmedAt: Math.max(c.confirmedAt, prev?.confirmedAt ?? 0),
        });
      } else {
        // prev is newer — keep it but fold in this history's recents.
        byCity.set(c.city, {
          ...prev,
          recentAreas: dedupTokens(
            [...prev.recentAreas, ...c.recentAreas],
            MAX_RECENT_AREAS_PER_CITY,
          ),
        });
      }
    }
  }
  return normalizeHistory({ version: 1, cities: [...byCity.values()] });
}
