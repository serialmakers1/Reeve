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

export function updateBuildingName(token: string, propertyId: string, buildingName: string | null) {
  return call<{ ok: true }>({ token, body: { mode: "update_building_name", property_id: propertyId, building_name: buildingName } });
}

// ── Phase 2 trusted location engine (use_pin preview / commit_pin write) ──
// Additive; NOT wired into any UI in Phase 2. The full structured engine response is
// returned verbatim (its error shape is `{ code }`, distinct from the legacy string errors).

export type IndiaValidation = "confirmed" | "outside" | "unresolved";
export type ResolutionStatus = "complete" | "discovery_incomplete" | "india_unresolved" | "retryable_google";
export type BuildingOutcome = "SAME" | "UNCERTAIN" | "CONFLICT" | "NOT_APPLICABLE";

export interface PinCandidate {
  candidate_key: string; geo_place_id: string | null; kind: string; display_name: string;
  evidence_type: string; recommendation?: "recommended" | "suggestion"; root_eligible?: boolean; is_primary?: boolean;
  source?: "system" | "owner";
}
export interface RejectedExtra { place_id: string; reason: string }
export interface PinEngineResult {
  ok: boolean;
  property_id: string;
  exact_location?: { lat: number; lng: number; formatted_address: string | null; india_validation: IndiaValidation };
  factual?: Record<string, string | null>;
  resolution_status?: ResolutionStatus;
  building?: { outcome: BuildingOutcome; display_name?: string | null; source?: "google" | "owner" | "admin" | null; provider_place_id?: string | null };
  discovery?: {
    root?: unknown; associations: PinCandidate[]; suggestions: PinCandidate[]; missing_root: boolean;
    /** Owner-added extras the server could not use ("Something is missing" rejections). */
    rejected_extras?: RejectedExtra[];
    /** use_pin only: >1 owner-added settlement while the pin has no deterministic root. */
    ambiguous_root?: boolean;
  };
  street_view?: { available: boolean; fallback: boolean; pano_id?: string | null };
  error?: { code: string };
}

async function callPinEngine(token: string, body: Record<string, unknown>): Promise<PinEngineResult> {
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, property_id: (body.property_id as string) ?? "", error: { code: "network" } };
  }
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // Normalize the two error shapes into one: structured `{ code }` (use_pin/commit_pin) OR a bare
  // string from errResp(...) (e.g. { error: "outside_service_area" }). Callers read `error.code`.
  if (typeof j.error === "string") j.error = { code: j.error };
  j.ok = j.ok === true;
  return j as unknown as PinEngineResult;
}

export function resolvePinPreview(
  token: string,
  args: { propertyId: string; lat: number; lng: number; placeId?: string | null; buildingName?: string | null; extraPlaceIds?: string[] },
): Promise<PinEngineResult> {
  return callPinEngine(token, {
    mode: "use_pin", property_id: args.propertyId, lat: args.lat, lng: args.lng,
    place_id: args.placeId ?? null, building_name: args.buildingName ?? null,
    ...(args.extraPlaceIds && args.extraPlaceIds.length ? { extra_place_ids: args.extraPlaceIds } : {}),
  });
}

export function commitPin(
  token: string,
  args: {
    propertyId: string; lat: number; lng: number; placeId?: string | null;
    selectedCandidateKeys?: string[]; buildingChoice?: "keep" | "clear" | "set"; buildingName?: string | null;
    extraPlaceIds?: string[];
  },
): Promise<PinEngineResult> {
  return callPinEngine(token, {
    mode: "commit_pin", property_id: args.propertyId, lat: args.lat, lng: args.lng,
    place_id: args.placeId ?? null,
    ...(args.selectedCandidateKeys ? { selected_candidate_keys: args.selectedCandidateKeys } : {}),
    ...(args.buildingChoice ? { building_choice: args.buildingChoice } : {}),
    building_name: args.buildingName ?? null,
    ...(args.extraPlaceIds && args.extraPlaceIds.length ? { extra_place_ids: args.extraPlaceIds } : {}),
  });
}

/** Owner Discovery confirmation — stamps discovery_confirmed_at via the trusted Edge action. */
export function confirmDiscovery(token: string, propertyId: string): Promise<PinEngineResult> {
  return callPinEngine(token, { mode: "confirm_discovery", property_id: propertyId });
}

// ── Admin-only trusted actions (Prompt 3) ──────────────────────────────────
export interface AdminDiscoveryArgs {
  propertyId: string;
  keepGeoPlaceIds: string[];
  addGeoPlaceIds?: string[];
  extraPlaceIds?: string[];
  rootGeoPlaceId?: string | null;
  rootExtraPlaceId?: string | null;
}

/** Admin Discovery correction — server validates keep/add/extras + root; writes via replace RPC. */
export function adminUpdateDiscovery(token: string, args: AdminDiscoveryArgs): Promise<PinEngineResult> {
  return callPinEngine(token, {
    mode: "admin_update_discovery",
    property_id: args.propertyId,
    keep_geo_place_ids: args.keepGeoPlaceIds,
    ...(args.addGeoPlaceIds && args.addGeoPlaceIds.length ? { add_geo_place_ids: args.addGeoPlaceIds } : {}),
    ...(args.extraPlaceIds && args.extraPlaceIds.length ? { extra_place_ids: args.extraPlaceIds } : {}),
    ...(args.rootGeoPlaceId !== undefined ? { root_geo_place_id: args.rootGeoPlaceId } : {}),
    ...(args.rootExtraPlaceId ? { root_extra_place_id: args.rootExtraPlaceId } : {}),
  });
}

/** Admin Discovery finalization — stamps discovery_finalized_at via the trusted Edge action. */
export function finalizeDiscovery(token: string, propertyId: string): Promise<PinEngineResult> {
  return callPinEngine(token, { mode: "finalize_discovery", property_id: propertyId });
}
