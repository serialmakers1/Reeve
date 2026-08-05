import type { LocationToken, LocationTokenType } from "../domain/searchTypes";

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
  // Optional area viewport: accept only when all 4 coords are finite numbers.
  const vp = obj.viewport as Record<string, any> | undefined;
  const fin = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  const viewport =
    vp && vp.sw && vp.ne && fin(vp.sw.lat) && fin(vp.sw.lng) && fin(vp.ne.lat) && fin(vp.ne.lng)
      ? { sw: { lat: vp.sw.lat, lng: vp.sw.lng }, ne: { lat: vp.ne.lat, lng: vp.ne.lng } }
      : null;
  return { id, label, type: type as LocationTokenType, cityId, placeId, viewport };
}
