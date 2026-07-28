import { parseSearchMode } from "../domain/searchMode";
import type { SearchState, SearchCursor, RentFilters, BuyFilters, LocationToken, LocationTokenType, MapBounds, BhkValue, FurnishingValue, ParkingValue, PossessionValue, PetPolicyValue, KhataValue } from "../domain/searchTypes";
import {
  BHK_VALUES,
  FURNISHING_VALUES,
  PARKING_VALUES,
  POSSESSION_VALUES,
  PET_POLICY_VALUES,
  KHATA_VALUES,
  PROPERTY_TYPE_VALUES,
  RENT_SORT_KEYS,
  BUY_SORT_KEYS,
  SEARCH_VIEW_MODES,
  DEFAULT_SORT,
  DEFAULT_VIEW,
  MAX_SELECTED_LOCATIONS,
  URL_PARAMS,
} from "../domain/searchConstants";
import { getDefaultSearchState } from "../domain/searchDefaults";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function parseFloat_(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function splitComma(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function filterUnique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function filterToValid<T extends string>(
  raw: string[],
  validSet: readonly T[],
): T[] {
  const set = new Set<string>(validSet);
  return filterUnique(raw.filter((v) => set.has(v)) as T[]);
}

export interface SerializedLocationsPayloadV1 {
  v: 1;
  items: unknown[];
}

const INJECTION_PATTERNS = ["<", ">", "javascript:", "data:"];

function isInjectionSafe(s: string): boolean {
  return !INJECTION_PATTERNS.some((p) => s.includes(p));
}

const LOCATION_TOKEN_TYPES: ReadonlySet<string> = new Set([
  "area", "sublocality", "neighbourhood", "building", "project", "pincode", "landmark",
]);

function decodeLocationsData(raw: string | null): LocationToken[] {
  if (!raw) return [];
  try {
    const json = atob(raw);
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Record<string, unknown>).v !== 1 ||
      !Array.isArray((parsed as Record<string, unknown>).items)
    ) {
      return [];
    }
    const items: unknown[] = (parsed as SerializedLocationsPayloadV1).items;
    const seen = new Set<string>();
    const result: LocationToken[] = [];
    for (const item of items.slice(0, MAX_SELECTED_LOCATIONS)) {
      if (result.length >= MAX_SELECTED_LOCATIONS) break;
      if (typeof item !== "object" || item === null) continue;
      const obj = item as Record<string, unknown>;
      const id = obj.id;
      const label = obj.label;
      const type = obj.type;
      if (typeof id !== "string" || id.length === 0 || id.length > 200) continue;
      if (typeof label !== "string" || label.length === 0 || label.length > 150) continue;
      if (typeof type !== "string" || !LOCATION_TOKEN_TYPES.has(type)) continue;
      if (!isInjectionSafe(id) || !isInjectionSafe(label)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      const cityId = typeof obj.cityId === "string" ? obj.cityId : null;
      const placeId = typeof obj.placeId === "string" ? obj.placeId : null;
      result.push({ id, label, type: type as LocationTokenType, cityId, placeId });
    }
    return result;
  } catch {
    return [];
  }
}

// ─── Cursor validation ────────────────────────────────────────────────────────

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function validateCursor(
  obj: Record<string, unknown>,
  currentSort: SearchState["sort"],
): SearchCursor | null {
  const validSorts = [...RENT_SORT_KEYS, ...BUY_SORT_KEYS] as readonly string[];
  const sortVal = obj.sort;
  if (typeof sortVal !== "string" || !validSorts.includes(sortVal)) return null;
  if (sortVal !== currentSort) return null;
  const id = obj.id;
  if (typeof id !== "string" || id.length === 0) return null;
  if (!("listedAt" in obj)) return null;

  if (sortVal === "newest") {
    return {
      sort: "newest",
      listedAt: isStringOrNull(obj.listedAt) ? obj.listedAt : null,
      id,
    };
  }
  if (sortVal === "availability_confirmed") {
    if (!("availabilityConfirmedAt" in obj)) return null;
    return {
      sort: "availability_confirmed",
      availabilityConfirmedAt: isStringOrNull(obj.availabilityConfirmedAt)
        ? obj.availabilityConfirmedAt
        : null,
      listedAt: isStringOrNull(obj.listedAt) ? obj.listedAt : null,
      id,
    };
  }
  if (sortVal === "price_asc" || sortVal === "price_desc") {
    if (!("priceAmount" in obj)) return null;
    const pa = obj.priceAmount;
    const priceAmount: number | null = typeof pa === "number" ? pa : null;
    return {
      sort: sortVal as "price_asc" | "price_desc",
      priceAmount,
      listedAt: isStringOrNull(obj.listedAt) ? obj.listedAt : null,
      id,
    };
  }
  return null;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Pure parser: URLSearchParams → SearchState.
 * Never throws. Always returns a complete SearchState.
 * Never mutates the input.
 */
export function parseSearchUrl(params: URLSearchParams): SearchState {
  const P = URL_PARAMS;

  // ── Mode ──
  const mode = parseSearchMode(params.get(P.type));
  const defaults = getDefaultSearchState(mode);

  // ── Context ──
  const rawCity = params.get(P.city);
  const city = rawCity ? rawCity.trim().toLowerCase() || null : null;

  const locationIds = splitComma(params.get(P.locations));
  const allTokens = decodeLocationsData(params.get(P.locationsData));
  const tokenMap = new Map(allTokens.map((t) => [t.id, t]));
  const locations: LocationToken[] = locationIds
    .map((id) => tokenMap.get(id))
    .filter((t): t is LocationToken => t !== undefined)
    .slice(0, MAX_SELECTED_LOCATIONS);

  const rawPt = params.get(P.propertyType);
  const propertyType =
    rawPt && (PROPERTY_TYPE_VALUES as readonly string[]).includes(rawPt)
      ? rawPt
      : null;

  // ── Price ──
  let minPrice = parsePositiveInt(params.get(P.minPrice)) ?? undefined;
  let maxPrice = parsePositiveInt(params.get(P.maxPrice)) ?? undefined;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  // ── Shared enum arrays ──
  const bhk = filterToValid<BhkValue>(splitComma(params.get(P.bhk)), BHK_VALUES);
  const furnishing = filterToValid<FurnishingValue>(
    splitComma(params.get(P.furnishing)),
    FURNISHING_VALUES,
  );
  const parking4w = filterToValid<ParkingValue>(
    splitComma(params.get(P.parking4w)),
    PARKING_VALUES,
  );
  const parking2w = filterToValid<ParkingValue>(
    splitComma(params.get(P.parking2w)),
    PARKING_VALUES,
  );
  const amenities = filterUnique(splitComma(params.get(P.amenities)));

  // ── Shared trust / media filters ──
  const hasVideoWalkthrough = params.get(P.hasVideoWalkthrough) === "1" ? true : undefined;
  const minResponseRate = parsePositiveInt(params.get(P.minResponseRate)) ?? undefined;
  const hasExperienceFeedback = params.get(P.hasExperienceFeedback) === "1" ? true : undefined;

  // ── Sort ──
  const rawSort = params.get(P.sort) ?? "";
  const validSortKeys = mode === "buy"
    ? (BUY_SORT_KEYS as readonly string[])
    : (RENT_SORT_KEYS as readonly string[]);
  const sort = validSortKeys.includes(rawSort)
    ? (rawSort as SearchState["sort"])
    : DEFAULT_SORT;

  // ── View ──
  const rawView = params.get(P.view) ?? "";
  const view = (SEARCH_VIEW_MODES as readonly string[]).includes(rawView)
    ? (rawView as SearchState["view"])
    : DEFAULT_VIEW;

  // ── Cursor ──
  const cursorRaw = params.get(URL_PARAMS.cursor);
  let cursor: SearchCursor | null = null;
  if (cursorRaw) {
    try {
      const decoded = JSON.parse(atob(cursorRaw)) as Record<string, unknown>;
      cursor = validateCursor(decoded, sort);
    } catch {
      cursor = null;
    }
  }

  // ── Map bounds ──
  const neLat = parseFloat_(params.get(P.boundsNeLat));
  const neLng = parseFloat_(params.get(P.boundsNeLng));
  const swLat = parseFloat_(params.get(P.boundsSwLat));
  const swLng = parseFloat_(params.get(P.boundsSwLng));
  const mapBounds: MapBounds | null =
    neLat !== null && neLng !== null && swLat !== null && swLng !== null
      ? { ne: { lat: neLat, lng: neLng }, sw: { lat: swLat, lng: swLng } }
      : null;

  // ── Selected property ──
  const selectedPropertyId = params.get(P.selectedPropertyId) || null;

  // ── Mode-specific filters ──
  let filters: RentFilters | BuyFilters;

  if (mode === "buy") {
    const minCarpetArea = parsePositiveInt(params.get(P.minCarpetArea)) ?? undefined;
    const maxCarpetArea = parsePositiveInt(params.get(P.maxCarpetArea)) ?? undefined;
    const minSuperBuiltUp = parsePositiveInt(params.get(P.minSuperBuiltUp)) ?? undefined;
    const maxSuperBuiltUp = parsePositiveInt(params.get(P.maxSuperBuiltUp)) ?? undefined;
    const possessionStatus = filterToValid<PossessionValue>(
      splitComma(params.get(P.possessionStatus)),
      POSSESSION_VALUES,
    );
    const possessionBefore = params.get(P.possessionBefore) || undefined;
    const negotiable = params.get(P.negotiable) === "1" ? true : undefined;
    const maxBrokerage = parsePositiveInt(params.get(P.maxBrokeragePct)) ?? undefined;
    const listedWithin = parsePositiveInt(params.get(P.listedWithin)) ?? undefined;
    const reraDisclosed = params.get(P.reraDisclosed) === "1" ? true : undefined;
    const khataType = filterToValid<KhataValue>(
      splitComma(params.get(P.khataType)),
      KHATA_VALUES,
    );
    const propertyTaxPaid = params.get(P.propertyTaxPaid) === "1" ? true : undefined;

    const buyFilters: BuyFilters = {
      ...(minPrice !== undefined && { minPrice }),
      ...(maxPrice !== undefined && { maxPrice }),
      ...(bhk.length && { bhk }),
      ...(furnishing.length && { furnishing }),
      ...(minCarpetArea !== undefined && { minCarpetArea }),
      ...(maxCarpetArea !== undefined && { maxCarpetArea }),
      ...(minSuperBuiltUp !== undefined && { minSuperBuiltUp }),
      ...(maxSuperBuiltUp !== undefined && { maxSuperBuiltUp }),
      ...(possessionStatus.length && { possessionStatus }),
      ...(possessionBefore && { possessionBefore }),
      ...(negotiable !== undefined && { negotiable }),
      ...(maxBrokerage !== undefined && { maxBrokerage }),
      ...(listedWithin !== undefined && { listedWithin }),
      ...(reraDisclosed !== undefined && { reraDisclosed }),
      ...(khataType.length && { khataType }),
      ...(propertyTaxPaid !== undefined && { propertyTaxPaid }),
      ...(parking4w.length && { parking4w }),
      ...(parking2w.length && { parking2w }),
      ...(amenities.length && { amenities }),
      ...(hasVideoWalkthrough !== undefined && { hasVideoWalkthrough }),
      ...(minResponseRate !== undefined && { minResponseRate }),
      ...(hasExperienceFeedback !== undefined && { hasExperienceFeedback }),
    };
    filters = buyFilters;
  } else {
    // rent (or unresolved — defaults to rent filter shape)
    const availableBy = params.get(P.availableBy) || undefined;
    const listedWithin = parsePositiveInt(params.get(P.listedWithin)) ?? undefined;
    const availabilityConfirmedWithin =
      parsePositiveInt(params.get(P.availabilityConfirmedWithin)) ?? undefined;
    const maxBrokerage = parsePositiveInt(params.get(P.maxBrokerage)) ?? undefined;
    const zeroRentBrokerage = params.get(P.zeroRentBrokerage) === "1" ? true : undefined;
    const maxDeposit = parsePositiveInt(params.get(P.maxDeposit)) ?? undefined;
    const maxLockIn = parsePositiveInt(params.get(P.maxLockIn)) ?? undefined;
    const maxNotice = parsePositiveInt(params.get(P.maxNotice)) ?? undefined;
    const maxAnnualIncrease =
      parsePositiveInt(params.get(P.maxAnnualIncrease)) ?? undefined;
    const maxMoveInCharges =
      parsePositiveInt(params.get(P.maxMoveInCharges)) ?? undefined;
    const petPolicy = filterToValid<PetPolicyValue>(
      splitComma(params.get(P.petPolicy)),
      PET_POLICY_VALUES,
    );

    const rentFilters: RentFilters = {
      ...(minPrice !== undefined && { minPrice }),
      ...(maxPrice !== undefined && { maxPrice }),
      ...(bhk.length && { bhk }),
      ...(furnishing.length && { furnishing }),
      ...(availableBy && { availableBy }),
      ...(listedWithin !== undefined && { listedWithin }),
      ...(availabilityConfirmedWithin !== undefined && { availabilityConfirmedWithin }),
      ...(maxBrokerage !== undefined && { maxBrokerage }),
      ...(zeroRentBrokerage !== undefined && { zeroRentBrokerage }),
      ...(maxDeposit !== undefined && { maxDeposit }),
      ...(maxLockIn !== undefined && { maxLockIn }),
      ...(maxNotice !== undefined && { maxNotice }),
      ...(maxAnnualIncrease !== undefined && { maxAnnualIncrease }),
      ...(maxMoveInCharges !== undefined && { maxMoveInCharges }),
      ...(petPolicy.length && { petPolicy }),
      ...(parking4w.length && { parking4w }),
      ...(parking2w.length && { parking2w }),
      ...(amenities.length && { amenities }),
      ...(hasVideoWalkthrough !== undefined && { hasVideoWalkthrough }),
      ...(minResponseRate !== undefined && { minResponseRate }),
      ...(hasExperienceFeedback !== undefined && { hasExperienceFeedback }),
    };
    filters = rentFilters;
  }

  void defaults; // defaults used for mode-gated fallback above

  return {
    context: { mode, city, locations, propertyType },
    filters,
    sort,
    view,
    cursor,
    mapBounds,
    selectedPropertyId,
  };
}
