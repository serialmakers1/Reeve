import { serializeSearchMode } from "../domain/searchMode";
import type { SearchState, RentFilters, BuyFilters } from "../domain/searchTypes";
import {
  DEFAULT_SORT,
  DEFAULT_VIEW,
  MAX_SELECTED_LOCATIONS,
  URL_PARAMS,
} from "../domain/searchConstants";
import type { SerializedLocationsPayloadV1 } from "./parseSearchUrl";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encodeLocationsData(tokens: SearchState["context"]["locations"]): string {
  const payload: SerializedLocationsPayloadV1 = {
    v: 1,
    items: tokens.slice(0, MAX_SELECTED_LOCATIONS).map((t) => ({
      id: t.id,
      label: t.label,
      type: t.type,
      cityId: t.cityId,
      placeId: t.placeId,
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
  const { context, filters, sort, view, cursor, mapBounds, selectedPropertyId } = state;

  // ── Mode ──
  if (context.mode !== null) {
    params.set(P.type, serializeSearchMode(context.mode));
  }

  // ── Context ──
  if (context.city) params.set(P.city, context.city);

  if (context.locations.length > 0) {
    params.set(P.locations, context.locations.map((l) => l.id).join(","));
    // Phase 4 (Search Setup) may revisit this base64 encoding if URL length becomes a concern.
    params.set(P.locationsData, encodeLocationsData(context.locations));
  }

  if (context.propertyType) params.set(P.propertyType, context.propertyType);

  // ── Sort / view / page ──
  setIfNonDefault(params, P.sort, sort, DEFAULT_SORT);
  setIfNonDefault(params, P.view, view, DEFAULT_VIEW);
  if (cursor !== null && cursor.sort === sort) {
    params.set(P.cursor, btoa(JSON.stringify(cursor)));
  }

  // ── Map bounds — persist whenever non-null (survives List↔Map toggles) ──
  if (mapBounds !== null) {
    params.set(P.boundsNeLat, String(mapBounds.ne.lat));
    params.set(P.boundsNeLng, String(mapBounds.ne.lng));
    params.set(P.boundsSwLat, String(mapBounds.sw.lat));
    params.set(P.boundsSwLng, String(mapBounds.sw.lng));
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
  if (f.minResponseRate !== undefined) params.set(P.minResponseRate, String(f.minResponseRate));
  setBoolIfTrue(params, P.hasExperienceFeedback, f.hasExperienceFeedback);

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
