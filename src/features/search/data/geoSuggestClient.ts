import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityToken, LocationToken } from "@/features/search/domain/searchTypes";

/**
 * Canonical Reeve geography lookup client (Phase 4 · Prompt 3).
 *
 * The ONLY suggestion/hydration surface for the LIST Search frontend. Identity is
 * the Reeve `geo_place` UUID — Google Places / Geocoding are never used here.
 * Backed by the anon-safe SECURITY DEFINER RPCs `reeve_search_geo_suggest` and
 * `reeve_search_geo_by_ids` (Prompt 2).
 */

export interface GeoSuggestRow {
  id: string;
  display_name: string;
  kind: "search_region" | "settlement" | "locality" | "road";
  settlement_subtype: "city" | "town" | "village" | null;
  parent_geo_place_id: string | null;
  parent_display_name: string | null;
  search_region_id: string | null;
  search_region_display_name: string | null;
}

export type RootKind = "search_region" | "settlement";
export type DetailKind = "locality" | "road";

const norm = (s: string): string => s.trim().toLowerCase();

/** Row (root kind) → canonical root CityToken. Legacy Google/map fields left unset. */
export function rowToCityToken(row: GeoSuggestRow): CityToken | null {
  if (row.kind !== "search_region" && row.kind !== "settlement") return null;
  return {
    geoPlaceId: row.id,
    kind: row.kind,
    label: row.display_name,
    settlementSubtype: row.settlement_subtype,
    searchRegionId: row.search_region_id,
    searchRegionLabel: row.search_region_display_name,
  };
}

/** Row (detail kind) → canonical detail LocationToken, stamped with its owning root. */
export function rowToLocationToken(row: GeoSuggestRow, scopeRootId: string): LocationToken | null {
  if (row.kind !== "locality" && row.kind !== "road") return null;
  return {
    id: row.id,
    geoPlaceId: row.id,
    kind: row.kind,
    scopeRootId,
    label: row.display_name,
    parentLabel: row.parent_display_name,
    searchRegionLabel: row.search_region_display_name,
  };
}

interface SuggestArgs {
  query: string;
  kinds?: GeoSuggestRow["kind"][];
  parentGeoPlaceId?: string | null;
  searchRegionId?: string | null;
  limit?: number;
}

/** Raw suggestion query. Blank query returns []. Never throws on empty results. */
export async function suggestGeo(
  args: SuggestArgs,
  supabaseClient: SupabaseClient,
): Promise<GeoSuggestRow[]> {
  if (!args.query.trim()) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc("reeve_search_geo_suggest", {
    p_query: args.query,
    p_kinds: args.kinds ?? null,
    p_parent_geo_place_id: args.parentGeoPlaceId ?? null,
    p_search_region_id: args.searchRegionId ?? null,
    p_limit: args.limit ?? 10,
  });
  if (error) throw error;
  return (data ?? []) as GeoSuggestRow[];
}

/** Authoritative UUID → token hydration for URL/memory restore. */
export async function geoByIds(
  ids: string[],
  supabaseClient: SupabaseClient,
): Promise<GeoSuggestRow[]> {
  if (ids.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc("reeve_search_geo_by_ids", {
    p_ids: ids,
  });
  if (error) throw error;
  return (data ?? []) as GeoSuggestRow[];
}

/**
 * Pure candidate-selection logic extracted from `resolveCanonicalCityByName`.
 * Given a normalized search name and the rows returned by suggestGeo, returns
 * the single safe CityToken to select, or null if the result is ambiguous.
 * Selection order:
 *   (a) unique exact normalized display_name match (prefer settlement);
 *   (b) exactly one candidate total (alias support, e.g. "Bangalore" → "Bengaluru");
 *   (c) null — ambiguous or no safe pick.
 */
export function selectCanonicalCityCandidate(
  name: string,
  rows: GeoSuggestRow[],
): CityToken | null {
  if (rows.length === 0) return null;
  const q = norm(name.trim());
  const exact = rows.filter((r) => norm(r.display_name) === q);
  if (exact.length > 0) {
    const settlement = exact.find((r) => r.kind === "settlement");
    const uniqueExactIds = new Set(exact.map((r) => r.id));
    if (uniqueExactIds.size === 1) return rowToCityToken(settlement ?? exact[0]);
    if (settlement && exact.filter((r) => r.kind === "settlement").length === 1) {
      return rowToCityToken(settlement);
    }
    return null;
  }
  const uniqueIds = new Set(rows.map((r) => r.id));
  if (uniqueIds.size === 1) return rowToCityToken(rows[0]);
  return null;
}

/**
 * Canonical city-name → root CityToken resolver (replaces the Google resolve).
 * Used by popular-cities clicks + IP prefill. Selection order (no arbitrary
 * contains-pick):
 *   (a) a unique exact normalized canonical display_name match (prefer settlement);
 *   (b) else if the RPC returned exactly ONE candidate, accept it (alias support,
 *       e.g. "Bangalore" → the single canonical "Bengaluru" row);
 *   (c) else return null — leave the user in canonical Search to choose.
 */
export async function resolveCanonicalCityByName(
  name: string,
  supabaseClient: SupabaseClient,
): Promise<CityToken | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  let rows: GeoSuggestRow[];
  try {
    rows = await suggestGeo(
      { query: trimmed, kinds: ["settlement", "search_region"], limit: 5 },
      supabaseClient,
    );
  } catch {
    return null;
  }
  return selectCanonicalCityCandidate(trimmed, rows);
}
