/**
 * Geographic plausibility — the single client-side source of the thresholds that the
 * DB `reeve_geo_is_plausible` helper enforces. Used ONLY for the one owner-added extra
 * Area/Road (a pre-check + tests); server-verified google/admin associations are never
 * subjected to it. Pure + framework-free.
 *
 * Mirror of the deployed helper (migration 20260810100300_geo_trusted_rpcs.sql):
 *   area: inside bbox                OR distance ≤ 3 km
 *   road: inside bbox padded ~2 km   OR distance ≤ 10 km
 * The DB uses earthdistance (spherical); this uses haversine — equivalent at these
 * thresholds. Keep the two in sync if either changes.
 */

export const GEO_PLAUSIBILITY = {
  areaMaxMeters: 3000,
  roadMaxMeters: 10000,
  roadPadDegrees: 0.02, // ~2 km bbox padding for long/linear roads
} as const;

export interface LatLng {
  lat: number;
  lng: number;
}
export interface GeoBounds {
  ne: LatLng;
  sw: LatLng;
}
export type GeoKind = "city" | "area" | "road";

const EARTH_RADIUS_M = 6371000;
const toRad = (d: number): number => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * True when `pin` is geographically plausible for an area/road entity at `center`
 * (optionally with `bbox`). Returns false when either point is missing — plausibility
 * cannot be confirmed without both.
 */
export function isGeoPlausible(
  pin: LatLng | null | undefined,
  center: LatLng | null | undefined,
  bbox: GeoBounds | null | undefined,
  kind: GeoKind,
): boolean {
  if (!pin || !center) return false;
  const maxM = kind === "road" ? GEO_PLAUSIBILITY.roadMaxMeters : GEO_PLAUSIBILITY.areaMaxMeters;
  const pad = kind === "road" ? GEO_PLAUSIBILITY.roadPadDegrees : 0;

  if (bbox) {
    if (
      pin.lat >= bbox.sw.lat - pad &&
      pin.lat <= bbox.ne.lat + pad &&
      pin.lng >= bbox.sw.lng - pad &&
      pin.lng <= bbox.ne.lng + pad
    ) {
      return true;
    }
  }
  return haversineMeters(pin, center) <= maxM;
}
