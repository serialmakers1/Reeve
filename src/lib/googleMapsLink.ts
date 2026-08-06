/**
 * buildGoogleMapsLink — builds a safe "Open in Google Maps" URL for the admin
 * listing-review page. Deliberately conservative:
 *
 *   1. Choose the best query in priority order:
 *        valid finite lat,lng  →  formatted_address  →  assembled address parts
 *   2. If no usable query can be built, return null (caller shows a muted
 *      "Location not resolved" message rather than a misleading pin).
 *   3. Append &query_place_id only when a non-empty place_id exists.
 *
 * Admin-only unit/flat identifiers (flat_number, lister_flat_number) are NEVER
 * included in the external URL.
 */

export interface GoogleMapsLinkInput {
  place_id?: string | null;
  formatted_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  building_name?: string | null;
  street_address?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

/** Trim a possibly-null string; return null for empty/whitespace-only. */
function clean(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function buildGoogleMapsLink(p: GoogleMapsLinkInput): string | null {
  let query: string | null = null;

  if (isFiniteNumber(p.latitude) && isFiniteNumber(p.longitude)) {
    query = `${p.latitude},${p.longitude}`;
  } else {
    const formatted = clean(p.formatted_address);
    if (formatted) {
      query = formatted;
    } else {
      const assembled = [
        p.building_name,
        p.street_address,
        p.locality,
        p.city,
        p.state,
        p.pincode,
      ]
        .map(clean)
        .filter((x): x is string => x !== null)
        .join(", ");
      if (assembled.length > 0) query = assembled;
    }
  }

  if (!query) return null;

  let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const placeId = clean(p.place_id);
  if (placeId) url += `&query_place_id=${encodeURIComponent(placeId)}`;
  return url;
}
