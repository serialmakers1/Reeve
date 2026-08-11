import type { CityToken, LocationToken, LocationTokenType, AreaViewport } from "../domain/searchTypes";

// Shared, strict validation for a single LocationToken from any untrusted source
// (URL base64 payload, localStorage, Supabase JSONB). Keeping one implementation
// guarantees identical injection guards / type whitelist / length caps everywhere.

const INJECTION_PATTERNS = ["<", ">", "javascript:", "data:"];

export function isInjectionSafe(s: string): boolean {
  return !INJECTION_PATTERNS.some((p) => s.includes(p));
}

export const LOCATION_TOKEN_TYPES: ReadonlySet<string> = new Set([
  "area",
  "sublocality",
  "neighbourhood",
  "building",
  "project",
  "pincode",
  "landmark",
]);

/**
 * Validates one untrusted item into a LocationToken, or returns null if invalid.
 * Never throws. An invalid item must be discarded individually by the caller
 * (a single bad area must not invalidate a whole city's history).
 */
export function validateLocationToken(item: unknown): LocationToken | null {
  if (typeof item !== "object" || item === null) return null;
  const obj = item as Record<string, unknown>;
  const id = obj.id;
  const label = obj.label;
  const type = obj.type;
  if (typeof id !== "string" || id.length === 0 || id.length > 200) return null;
  if (typeof label !== "string" || label.length === 0 || label.length > 150) return null;
  if (typeof type !== "string" || !LOCATION_TOKEN_TYPES.has(type)) return null;
  if (!isInjectionSafe(id) || !isInjectionSafe(label)) return null;
  const cityId = typeof obj.cityId === "string" ? obj.cityId : null;
  const placeId = typeof obj.placeId === "string" ? obj.placeId : null;
  const lat = isGeoLat(obj.lat) ? (obj.lat as number) : null;
  const lng = isGeoLng(obj.lng) ? (obj.lng as number) : null;
  const viewport = parseViewport(obj.viewport);
  return { id, label, type: type as LocationTokenType, cityId, placeId, lat, lng, viewport };
}

// ─── Geo coordinate guards ────────────────────────────────────────────────────

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}
export function isGeoLat(n: unknown): boolean {
  return isFiniteNum(n) && n >= -90 && n <= 90;
}
export function isGeoLng(n: unknown): boolean {
  return isFiniteNum(n) && n >= -180 && n <= 180;
}

/** Parse an optional area/city viewport; only accept sane, in-range bounds. */
export function parseViewport(raw: unknown): AreaViewport | null {
  const vp = raw as Record<string, any> | undefined | null;
  if (
    vp && vp.sw && vp.ne &&
    isGeoLat(vp.sw.lat) && isGeoLng(vp.sw.lng) &&
    isGeoLat(vp.ne.lat) && isGeoLng(vp.ne.lng)
  ) {
    return { sw: { lat: vp.sw.lat, lng: vp.sw.lng }, ne: { lat: vp.ne.lat, lng: vp.ne.lng } };
  }
  return null;
}

/**
 * Validates one untrusted item into a CityToken, or null. A valid city REQUIRES
 * a placeId + finite in-range lat/lng (anchors must never be (0,0) or missing).
 */
export function validateCityToken(item: unknown): CityToken | null {
  if (typeof item !== "object" || item === null) return null;
  const obj = item as Record<string, unknown>;
  const placeId = obj.placeId;
  const label = obj.label;
  if (typeof placeId !== "string" || placeId.length === 0 || placeId.length > 200) return null;
  if (typeof label !== "string" || label.length === 0 || label.length > 150) return null;
  if (!isInjectionSafe(placeId) || !isInjectionSafe(label)) return null;
  if (!isGeoLat(obj.lat) || !isGeoLng(obj.lng)) return null;
  return {
    placeId,
    label,
    lat: obj.lat as number,
    lng: obj.lng as number,
    viewport: parseViewport(obj.viewport),
  };
}
