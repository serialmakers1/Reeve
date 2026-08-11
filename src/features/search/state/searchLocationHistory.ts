import type { LocationToken, CityToken } from "../domain/searchTypes";
import type { SearchMode } from "../domain/searchMode";
import { MAX_SELECTED_LOCATIONS } from "../domain/searchConstants";
import { normalizePropertyTypes } from "../domain/propertyTypes";
import { validateLocationToken, validateCityToken } from "./locationTokenValidation";

// ─── Model (v2 — the canonical in-memory shape) ───────────────────────────────
// v2 adds per-city `mode` + `propertyTypes` so a returning user restores their full
// setup for each city. v1 (city/areas only) is still read from disk and upgraded
// in-memory (see validateHistory); it is only persisted as v2 on the next save.

export interface SearchLocationCityEntry {
  city: string; // normalized lowercase
  /** Canonical city Place anchor (Prompt 3); undefined for older/manual entries. */
  cityToken?: CityToken;
  /** Exact last confirmed selection for this city ([] = whole-city search). */
  lastSelectedAreas: LocationToken[];
  /** Quick-pick pool of recently used areas for this city. */
  recentAreas: LocationToken[];
  mode: SearchMode; // "rent" | "buy"
  propertyTypes: string[]; // normalized; [] = all types
  confirmedAt: number;
}

export interface SearchLocationHistory {
  version: 2;
  /** Most-recently-confirmed first. cities[0] is the default. */
  cities: SearchLocationCityEntry[];
}

/** Back-compat alias — importers historically referenced this name. */
export type SearchLocationHistoryV1 = SearchLocationHistory;

export const DEFAULT_MODE: SearchMode = "rent";

// ─── Caps ───────────────────────────────────────────────────────────────────

export const MAX_HISTORY_CITIES = 5;
export const MAX_RECENT_AREAS_PER_CITY = 8;

export function emptyHistory(): SearchLocationHistory {
  return { version: 2, cities: [] };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeCityName(city: unknown): string | null {
  if (typeof city !== "string") return null;
  const c = city.trim().toLowerCase();
  if (!c || c.length > 120) return null;
  if (c.includes("<") || c.includes(">")) return null;
  return c;
}

function normalizeMode(mode: unknown, fallback: SearchMode): SearchMode {
  return mode === "rent" || mode === "buy" ? mode : fallback;
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
 * Validates untrusted history (localStorage or Supabase JSONB) into a safe, normalized
 * v2 SearchLocationHistory. Never throws. Accepts BOTH on-disk versions:
 *   - version 2 → mode/propertyTypes validated.
 *   - version 1 → city/areas preserved; propertyTypes := []; mode := `fallbackMode`
 *     (caller passes the explicit URL mode, else the Search default). NOT written back
 *     on read — upgraded to v2 only on the next explicit confirm/save.
 * Unsupported versions and malformed shapes yield empty history; individual bad
 * cities/areas are dropped without discarding the rest.
 */
export function validateHistory(
  raw: unknown,
  fallbackMode: SearchMode = DEFAULT_MODE,
): SearchLocationHistory {
  if (typeof raw !== "object" || raw === null) return emptyHistory();
  const obj = raw as Record<string, unknown>;
  const isV1 = obj.version === 1;
  const isV2 = obj.version === 2;
  if ((!isV1 && !isV2) || !Array.isArray(obj.cities)) return emptyHistory();

  const seenCities = new Set<string>();
  const cities: SearchLocationCityEntry[] = [];
  for (const c of obj.cities) {
    if (typeof c !== "object" || c === null) continue;
    const co = c as Record<string, unknown>;
    const city = normalizeCityName(co.city);
    if (!city || seenCities.has(city)) continue;
    const confirmedAt =
      typeof co.confirmedAt === "number" && Number.isFinite(co.confirmedAt) ? co.confirmedAt : 0;
    const lastSelectedAreas = validateTokens(co.lastSelectedAreas, MAX_SELECTED_LOCATIONS);
    const recentAreas = validateTokens(co.recentAreas, MAX_RECENT_AREAS_PER_CITY);
    // v1 entries have no mode/propertyTypes → derive them.
    const mode = isV2 ? normalizeMode(co.mode, fallbackMode) : fallbackMode;
    const propertyTypes = isV2 ? normalizePropertyTypes(asStringArray(co.propertyTypes)) : [];
    const cityToken = validateCityToken(co.cityToken) ?? undefined;
    seenCities.add(city);
    cities.push({ city, cityToken, lastSelectedAreas, recentAreas, mode, propertyTypes, confirmedAt });
  }

  return normalizeHistory({ version: 2, cities });
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Sorts cities most-recent-first and enforces the city cap. */
export function normalizeHistory(history: SearchLocationHistory): SearchLocationHistory {
  const cities = [...history.cities]
    .sort((a, b) => b.confirmedAt - a.confirmedAt)
    .slice(0, MAX_HISTORY_CITIES);
  return { version: 2, cities };
}

/**
 * Records an explicit user confirmation of the complete setup for `city`. Moves the
 * city to the front (newest), stores the exact area selection + mode + property types,
 * and folds the selected areas into that city's recentAreas pool (deduped, capped).
 * `areas` may be [] (whole-city); `propertyTypes` may be [] (all types).
 */
export function confirmSelection(
  history: SearchLocationHistory,
  city: string,
  areas: LocationToken[],
  mode: SearchMode,
  propertyTypes: string[],
  now: number = Date.now(),
  cityToken?: CityToken,
): SearchLocationHistory {
  const norm = normalizeCityName(city);
  if (!norm) return history;
  const cleanAreas = dedupTokens(
    areas.map((a) => validateLocationToken(a)).filter((a): a is LocationToken => a !== null),
    MAX_SELECTED_LOCATIONS,
  );

  const existing = history.cities.find((c) => c.city === norm);
  const rest = history.cities.filter((c) => c.city !== norm);

  const mergedRecent = dedupTokens(
    [...cleanAreas, ...(existing?.recentAreas ?? [])],
    MAX_RECENT_AREAS_PER_CITY,
  );

  // Prefer a freshly-resolved anchor; else keep the city's prior anchor.
  const anchor = (cityToken && validateCityToken(cityToken)) || existing?.cityToken;

  const entry: SearchLocationCityEntry = {
    city: norm,
    ...(anchor ? { cityToken: anchor } : {}),
    lastSelectedAreas: cleanAreas,
    recentAreas: mergedRecent,
    mode: normalizeMode(mode, DEFAULT_MODE),
    propertyTypes: normalizePropertyTypes(propertyTypes),
    confirmedAt: now,
  };

  return normalizeHistory({ version: 2, cities: [entry, ...rest] });
}

// ─── Removal ──────────────────────────────────────────────────────────────────

/** Removes a city entry (and thus its areas/mode/propertyTypes). No-op if absent. */
export function removeCity(history: SearchLocationHistory, city: string): SearchLocationHistory {
  const norm = normalizeCityName(city);
  if (!norm) return history;
  return normalizeHistory({
    version: 2,
    cities: history.cities.filter((c) => c.city !== norm),
  });
}

/** Clears all remembered cities. */
export function clearHistory(): SearchLocationHistory {
  return emptyHistory();
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export interface RememberedSetup {
  city: string;
  cityToken?: CityToken;
  areas: LocationToken[];
  mode: SearchMode;
  propertyTypes: string[];
}

/** The default city + its full remembered setup, or null when history is empty. */
export function latestSelection(history: SearchLocationHistory): RememberedSetup | null {
  const first = normalizeHistory(history).cities[0];
  if (!first) return null;
  return {
    city: first.city,
    cityToken: first.cityToken,
    areas: first.lastSelectedAreas,
    mode: first.mode,
    propertyTypes: first.propertyTypes,
  };
}

/** Recent-area quick picks for one city (city-scoped; never mixes cities). */
export function recentAreasForCity(history: SearchLocationHistory, city: string): LocationToken[] {
  const norm = normalizeCityName(city);
  if (!norm) return [];
  return history.cities.find((c) => c.city === norm)?.recentAreas ?? [];
}

/**
 * City-scoped memory for one city: last selection + recent-area pool + mode + types.
 * Always returns safe defaults for an unknown city (never mixes cities).
 */
export function cityMemory(
  history: SearchLocationHistory,
  city: string,
): { lastSelectedAreas: LocationToken[]; recentAreas: LocationToken[]; mode: SearchMode; propertyTypes: string[] } {
  const norm = normalizeCityName(city);
  const entry = norm ? history.cities.find((c) => c.city === norm) : undefined;
  return {
    lastSelectedAreas: entry?.lastSelectedAreas ?? [],
    recentAreas: entry?.recentAreas ?? [],
    mode: entry?.mode ?? DEFAULT_MODE,
    propertyTypes: entry?.propertyTypes ?? [],
  };
}

/** Ordered list of recent city names (most-recent first). */
export function recentCities(history: SearchLocationHistory): string[] {
  return normalizeHistory(history).cities.map((c) => c.city);
}

/**
 * Deterministic merge of multiple histories (e.g. server, account cache, current-session
 * confirmation). Earlier arguments are OLDER; later arguments WIN on both city recency
 * (higher confirmedAt) and per-city setup data. Used on login reconciliation.
 */
export function mergeHistories(...histories: SearchLocationHistory[]): SearchLocationHistory {
  const byCity = new Map<string, SearchLocationCityEntry>();
  for (const h of histories) {
    for (const c of h.cities) {
      const prev = byCity.get(c.city);
      if (!prev || c.confirmedAt >= prev.confirmedAt) {
        // This entry is newer (or ties, later-arg-wins): its setup wins; fold recents.
        const anchor = c.cityToken ?? prev?.cityToken;
        byCity.set(c.city, {
          city: c.city,
          ...(anchor ? { cityToken: anchor } : {}),
          lastSelectedAreas: c.lastSelectedAreas,
          mode: c.mode,
          propertyTypes: c.propertyTypes,
          recentAreas: dedupTokens(
            [...c.recentAreas, ...(prev?.recentAreas ?? [])],
            MAX_RECENT_AREAS_PER_CITY,
          ),
          confirmedAt: Math.max(c.confirmedAt, prev?.confirmedAt ?? 0),
        });
      } else {
        // prev is newer — keep its setup but fold in this history's recents.
        byCity.set(c.city, {
          ...prev,
          cityToken: prev.cityToken ?? c.cityToken,
          recentAreas: dedupTokens(
            [...prev.recentAreas, ...c.recentAreas],
            MAX_RECENT_AREAS_PER_CITY,
          ),
        });
      }
    }
  }
  return normalizeHistory({ version: 2, cities: [...byCity.values()] });
}
