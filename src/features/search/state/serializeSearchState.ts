import { serializeSearchMode } from "../domain/searchMode";
import type { SearchState, RentFilters, BuyFilters } from "../domain/searchTypes";
import {
  DEFAULT_SORT,
  MAX_SELECTED_LOCATIONS,
  MAX_SELECTED_CITIES,
  URL_PARAMS,
} from "../domain/searchConstants";
import type { SerializedLocationsPayloadV1 } from "./parseSearchUrl";
import { propertyTypesToCsv } from "../domain/propertyTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Canonical URL snapshot: Reeve geo_place UUID identity only — no Google Place IDs,
// no coordinates, no viewports (Phase 4 · Prompt 3). `by_ids` hydration is authoritative.
function encodeLocationsData(tokens: SearchState["context"]["locations"]): string {
  const payload: SerializedLocationsPayloadV1 = {
    v: 1,
    items: tokens.slice(0, MAX_SELECTED_LOCATIONS).map((t) => ({
      id: t.geoPlaceId,
      kind: t.kind,
      label: t.label,
      scopeRootId: t.scopeRootId,
    })),
  };
  return btoa(JSON.stringify(payload));
}

function encodeCitiesData(cities: SearchState["context"]["cities"]): string {
  const payload: SerializedLocationsPayloadV1 = {
    v: 1,
    items: cities.slice(0, MAX_SELECTED_CITIES).map((c) => ({
      id: c.geoPlaceId,
      kind: c.kind,
      label: c.label,
    })),
  };
  return btoa(JSON.stringify(payload));
}

function setIfNonDefault<T>(
  params: URLSearchParams,
  key: string,
  value: T | undefined | null,
  defaultValue: T,
): void {
  if (value === undefined || value === null) return;
  if (value === defaultValue) return;
  params.set(key, String(value));
}

function setArrayIfNonEmpty(
  params: URLSearchParams,
  key: string,
  arr: unknown[] | undefined,
): void {
  if (!arr || arr.length === 0) return;
  params.set(key, arr.join(","));
}

function setBoolIfTrue(
  params: URLSearchParams,
  key: string,
  value: boolean | undefined,
): void {
  if (value === true) params.set(key, "1");
}

// ─── Serializer ───────────────────────────────────────────────────────────────

/**
 * Pure serializer: SearchState → URLSearchParams.
 * Omits any param equal to its default value.
 * Always returns deterministic output for the same state.
 * Never writes "sale" — only "rent" or "buy".
 */
export function serializeSearchState(state: SearchState): URLSearchParams {
  const P = URL_PARAMS;
  const params = new URLSearchParams();
  const { context, filters, sort, cursor, selectedPropertyId } = state;

  // ── Mode ──
  if (context.mode !== null) {
    params.set(P.type, serializeSearchMode(context.mode));
  }

  // ── Context ──
  if (context.city) params.set(P.city, context.city);

  if (context.cities.length > 0) {
    params.set(P.cities, context.cities.map((c) => c.geoPlaceId).join(","));
    params.set(P.citiesData, encodeCitiesData(context.cities));
  }

  // Distance is only meaningful with a locality anchor (PostGIS locality-only) —
  // never serialize an inert explicit distance (parse also normalizes this).
  if (state.distanceKm !== null && context.locations.some((l) => l.kind === "locality")) {
    params.set(P.distanceKm, String(state.distanceKm));
  }

  if (context.locations.length > 0) {
    params.set(P.locations, context.locations.map((l) => l.geoPlaceId).join(","));
    params.set(P.locationsData, encodeLocationsData(context.locations));
  }

  const ptCsv = propertyTypesToCsv(context.propertyTypes);
  if (ptCsv) params.set(P.propertyType, ptCsv);

  // ── Sort / page ──
  setIfNonDefault(params, P.sort, sort, DEFAULT_SORT);
  if (cursor !== null && cursor.sort === sort) {
    params.set(P.cursor, btoa(JSON.stringify(cursor)));
  }

  // ── Selected property ──
  if (selectedPropertyId) params.set(P.selectedPropertyId, selectedPropertyId);

  // ── Shared filter fields (both modes) ──
  const f = filters as RentFilters & BuyFilters;

  if (f.minPrice !== undefined && f.minPrice > 0) params.set(P.minPrice, String(f.minPrice));
  if (f.maxPrice !== undefined && f.maxPrice > 0) params.set(P.maxPrice, String(f.maxPrice));
  setArrayIfNonEmpty(params, P.bhk, f.bhk);
  setArrayIfNonEmpty(params, P.furnishing, f.furnishing);
  setArrayIfNonEmpty(params, P.parking4w, f.parking4w);
  setArrayIfNonEmpty(params, P.parking2w, f.parking2w);
  setArrayIfNonEmpty(params, P.amenities, f.amenities);
  setBoolIfTrue(params, P.hasVideoWalkthrough, f.hasVideoWalkthrough);

  // ── Mode-specific filters ──
  if (context.mode === "buy") {
    const bf = filters as BuyFilters;
    if (bf.minCarpetArea !== undefined) params.set(P.minCarpetArea, String(bf.minCarpetArea));
    if (bf.maxCarpetArea !== undefined) params.set(P.maxCarpetArea, String(bf.maxCarpetArea));
    if (bf.minSuperBuiltUp !== undefined) params.set(P.minSuperBuiltUp, String(bf.minSuperBuiltUp));
    if (bf.maxSuperBuiltUp !== undefined) params.set(P.maxSuperBuiltUp, String(bf.maxSuperBuiltUp));
    setArrayIfNonEmpty(params, P.possessionStatus, bf.possessionStatus);
    if (bf.possessionBefore) params.set(P.possessionBefore, bf.possessionBefore);
    setBoolIfTrue(params, P.negotiable, bf.negotiable);
    if (bf.maxBrokerage !== undefined) params.set(P.maxBrokeragePct, String(bf.maxBrokerage));
    if (bf.listedWithin !== undefined) params.set(P.listedWithin, String(bf.listedWithin));
    setBoolIfTrue(params, P.reraDisclosed, bf.reraDisclosed);
    setArrayIfNonEmpty(params, P.khataType, bf.khataType);
    setBoolIfTrue(params, P.propertyTaxPaid, bf.propertyTaxPaid);
  } else {
    const rf = filters as RentFilters;
    if (rf.availableBy) params.set(P.availableBy, rf.availableBy);
    if (rf.listedWithin !== undefined) params.set(P.listedWithin, String(rf.listedWithin));
    if (rf.availabilityConfirmedWithin !== undefined)
      params.set(P.availabilityConfirmedWithin, String(rf.availabilityConfirmedWithin));
    if (rf.maxBrokerage !== undefined) params.set(P.maxBrokerage, String(rf.maxBrokerage));
    setBoolIfTrue(params, P.zeroRentBrokerage, rf.zeroRentBrokerage);
    if (rf.maxDeposit !== undefined) params.set(P.maxDeposit, String(rf.maxDeposit));
    if (rf.maxLockIn !== undefined) params.set(P.maxLockIn, String(rf.maxLockIn));
    if (rf.maxNotice !== undefined) params.set(P.maxNotice, String(rf.maxNotice));
    if (rf.maxAnnualIncrease !== undefined) params.set(P.maxAnnualIncrease, String(rf.maxAnnualIncrease));
    if (rf.maxMoveInCharges !== undefined) params.set(P.maxMoveInCharges, String(rf.maxMoveInCharges));
    setArrayIfNonEmpty(params, P.petPolicy, rf.petPolicy);
  }

  return params;
}
