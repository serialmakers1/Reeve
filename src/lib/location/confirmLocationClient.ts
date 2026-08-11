/**
 * Client for the trusted confirm-property-location Edge Function (Prompt 2).
 * The browser NEVER establishes canonical geography — it only forwards the selected
 * Google place_id + pin and the owner's candidate selections; the server verifies,
 * recomputes the allowed set, and persists. Machine error codes are mapped to copy.
 */

const FN_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co/functions/v1/confirm-property-location";

export type LocationErrorCode =
  | "google_unavailable" | "search_again" | "city_unresolved"
  | "implausible_area" | "outside_service_area" | "building_name_required"
  | "city_not_associated" | "secondary_is_primary" | "too_many_secondaries"
  | "owner_cannot_set_secondaries"
  | "unauthorized" | "forbidden" | "locked" | "save_failed" | "update_failed" | "network";

export const LOCATION_ERROR_COPY: Record<LocationErrorCode, string> = {
  google_unavailable: "Location search is temporarily unavailable. Your draft is safe — try again shortly.",
  search_again: "That location didn't match. Please search again and pick the closest accurate result.",
  city_unresolved: "We couldn't identify the city. Please choose the nearest city.",
  implausible_area: "That area/road is too far from your property to add.",
  outside_service_area: "Reeve currently supports properties in India only.",
  building_name_required: "Please enter the building / society name.",
  city_not_associated: "Google doesn't associate this location with that city. Choose one of the suggested cities.",
  secondary_is_primary: "A secondary city can't be the same as the primary city.",
  too_many_secondaries: "You can add at most two secondary cities.",
  owner_cannot_set_secondaries: "Only an administrator can set secondary cities.",
  unauthorized: "Please sign in again.",
  forbidden: "You can't edit this property's location.",
  locked: "Location can't be changed at this stage.",
  save_failed: "Couldn't save the location. Please try again.",
  update_failed: "Couldn't update the building name. Please try again.",
  network: "Network error. Your draft is safe — please try again.",
};

export interface ResolvedProperty {
  place_id: string; formatted_address: string | null; latitude: number; longitude: number;
  locality: string | null; state: string | null; pincode: string | null;
  building_name: string | null; building_source: "google" | null; owner_building_required: boolean;
}
export interface CandidateCity { place_id: string; display_name: string }
export interface CandidateArea { place_id: string; display_name: string; preselect: boolean }
export type SecondaryCityMode = "auto" | "admin";
export interface ResolveResult {
  ok: true; property_id: string;
  property: ResolvedProperty;
  primary_city: CandidateCity | null; city_unresolved: boolean;
  areas: CandidateArea[]; road: { place_id: string; display_name: string } | null;
  /** Admin-only: full Google semantic city-evidence set for this pin (offer ONLY these). */
  city_candidates?: CandidateCity[];
  /** Admin-only: the effective secondary cities (≤2). */
  secondary_cities?: CandidateCity[];
  /** Durable secondary-city intent; the server is authoritative. */
  secondary_city_mode?: SecondaryCityMode;
}

/**
 * 4-state override wire contract. Key PRESENCE is meaningful:
 *  - omit the key entirely → server applies its mode-aware default
 *  - `null` → explicit "use Google" (recompute)
 *  - value (`"<id>"` / `[ids]`) → explicit choice; `[]` = admin "no secondaries"
 */
export interface OverrideWire { cityPlaceId?: string | null; secondaryCityPlaceIds?: string[] | null }
function overrideBody(o?: OverrideWire): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  if (o && Object.prototype.hasOwnProperty.call(o, "cityPlaceId")) b.city_place_id = o.cityPlaceId;
  if (o && Object.prototype.hasOwnProperty.call(o, "secondaryCityPlaceIds")) b.secondary_city_place_ids = o.secondaryCityPlaceIds;
  return b;
}

interface CallOpts { token: string; body: Record<string, unknown> }

// Single result shape (project has strictNullChecks:false → discriminated-union
// narrowing is unreliable; use optional fields + explicit `ok` checks instead).
export interface LocationCallResult<T> { ok: boolean; data?: T; error?: LocationErrorCode }

async function call<T>(opts: CallOpts): Promise<LocationCallResult<T>> {
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(opts.body),
    });
  } catch {
    return { ok: false, error: "network" };
  }
  const json = await res.json().catch(() => ({}));
  if (res.ok && json?.ok) return { ok: true, data: json as T };
  return { ok: false, error: (json?.error as LocationErrorCode) ?? "google_unavailable" };
}

export function resolveLocation(
  token: string, propertyId: string, placeId: string, lat: number, lng: number, override?: OverrideWire,
) {
  return call<ResolveResult>({
    token,
    body: { mode: "resolve", property_id: propertyId, place_id: placeId, lat, lng, ...overrideBody(override) },
  });
}

export function confirmLocation(token: string, args: {
  propertyId: string; placeId: string; lat: number; lng: number;
  buildingName?: string | null; selectedAreaIds?: string[]; extraAreaId?: string | null;
} & OverrideWire) {
  return call<{ ok: true; property_id: string; confirmed: true }>({
    token,
    body: {
      mode: "confirm", property_id: args.propertyId, place_id: args.placeId, lat: args.lat, lng: args.lng,
      building_name: args.buildingName ?? null,
      selected_area_ids: args.selectedAreaIds ?? [],
      extra_area_id: args.extraAreaId ?? null,
      ...overrideBody(args),
    },
  });
}

export function updateBuildingName(token: string, propertyId: string, buildingName: string | null) {
  return call<{ ok: true }>({ token, body: { mode: "update_building_name", property_id: propertyId, building_name: buildingName } });
}
