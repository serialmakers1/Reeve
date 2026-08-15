import type { CityToken, LocationToken } from "../domain/searchTypes";

// Shared, strict validation for a single canonical geo token from any untrusted
// source (URL base64 payload, localStorage, Supabase JSONB). Keeping one
// implementation guarantees identical injection guards / kind whitelist / UUID
// checks everywhere. Identity is the Reeve canonical geo_place UUID; Google Place
// IDs / coordinates are NEVER accepted as identity.

const INJECTION_PATTERNS = ["<", ">", "javascript:", "data:"];

export function isInjectionSafe(s: string): boolean {
  return !INJECTION_PATTERNS.some((p) => s.includes(p));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical geo_place UUID (the only accepted token identity). */
export function isGeoPlaceId(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

const ROOT_KINDS: ReadonlySet<string> = new Set(["search_region", "settlement"]);
const DETAIL_KINDS: ReadonlySet<string> = new Set(["locality", "road"]);
const SETTLEMENT_SUBTYPES: ReadonlySet<string> = new Set(["city", "town", "village"]);

function optCleanString(v: unknown, max: number): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= max && isInjectionSafe(v)
    ? v
    : null;
}

/**
 * Validates one untrusted item into a canonical DETAIL LocationToken, or null.
 * Never throws. Slot-specific: a valid detail REQUIRES a geo_place UUID, a
 * kind ∈ {locality, road}, and a valid scopeRootId UUID. Any item that fails
 * (incl. old Google-shaped tokens or a cross-slot root kind) is discarded so it
 * can never enter active Search state. A single bad item must not invalidate the
 * rest of a list.
 */
export function validateLocationToken(item: unknown): LocationToken | null {
  if (typeof item !== "object" || item === null) return null;
  const obj = item as Record<string, unknown>;
  const geoPlaceId = obj.geoPlaceId ?? obj.id;
  const label = obj.label;
  const kind = obj.kind;
  const scopeRootId = obj.scopeRootId;
  if (!isGeoPlaceId(geoPlaceId)) return null;
  if (typeof label !== "string" || label.length === 0 || label.length > 150) return null;
  if (!isInjectionSafe(label)) return null;
  if (typeof kind !== "string" || !DETAIL_KINDS.has(kind)) return null;
  if (!isGeoPlaceId(scopeRootId)) return null;
  return {
    id: geoPlaceId as string,
    geoPlaceId: geoPlaceId as string,
    kind: kind as "locality" | "road",
    scopeRootId: scopeRootId as string,
    label,
    parentLabel: optCleanString(obj.parentLabel, 150),
    searchRegionLabel: optCleanString(obj.searchRegionLabel, 150),
  };
}

/**
 * Validates one untrusted item into a canonical root CityToken, or null.
 * Slot-specific: a valid root REQUIRES a geo_place UUID + a kind ∈
 * {search_region, settlement}. Old Google-shaped city tokens (placeId + lat/lng,
 * no canonical UUID/kind) and cross-slot detail kinds are discarded.
 */
export function validateCityToken(item: unknown): CityToken | null {
  if (typeof item !== "object" || item === null) return null;
  const obj = item as Record<string, unknown>;
  const geoPlaceId = obj.geoPlaceId ?? obj.id;
  const label = obj.label;
  const kind = obj.kind;
  if (!isGeoPlaceId(geoPlaceId)) return null;
  if (typeof label !== "string" || label.length === 0 || label.length > 150) return null;
  if (!isInjectionSafe(label)) return null;
  if (typeof kind !== "string" || !ROOT_KINDS.has(kind)) return null;
  const subtypeRaw = obj.settlementSubtype;
  const settlementSubtype =
    typeof subtypeRaw === "string" && SETTLEMENT_SUBTYPES.has(subtypeRaw)
      ? (subtypeRaw as "city" | "town" | "village")
      : null;
  return {
    geoPlaceId: geoPlaceId as string,
    kind: kind as "search_region" | "settlement",
    label,
    settlementSubtype,
    searchRegionId: isGeoPlaceId(obj.searchRegionId) ? (obj.searchRegionId as string) : null,
    searchRegionLabel: optCleanString(obj.searchRegionLabel, 150),
  };
}
