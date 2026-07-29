// Shared geo shapes + converters for Search city/area resolution.

export interface CityViewport {
  low: { lat: number; lng: number };
  high: { lat: number; lng: number };
}

export interface LatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Converts a stored city viewport ({ low, high }) into the LatLngBoundsLiteral
 * shape the Google Places (New) `locationRestriction` expects. Returns null when
 * the viewport is missing or malformed so callers can skip restriction safely.
 */
export function viewportToBoundsLiteral(vp: CityViewport | null | undefined): LatLngBoundsLiteral | null {
  if (
    !vp ||
    typeof vp.low?.lat !== "number" ||
    typeof vp.low?.lng !== "number" ||
    typeof vp.high?.lat !== "number" ||
    typeof vp.high?.lng !== "number"
  ) {
    return null;
  }
  return {
    south: vp.low.lat,
    west: vp.low.lng,
    north: vp.high.lat,
    east: vp.high.lng,
  };
}
