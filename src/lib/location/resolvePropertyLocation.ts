/**
 * Pure property-location resolver (Prompt 1 — geographic foundation).
 *
 * Consumes ALREADY-fetched/normalized Google data (a live `Place` → NormalizedGooglePlace
 * adapter is added in Prompt 2) and returns a structured resolution: normalized address,
 * building name + provenance, whether the owner must supply the building name, the
 * primary/secondary city + area/road candidates, and genuine blocking issues.
 *
 * Trust boundaries (do not weaken):
 *  - The resolver has NO DB/Google-server access; it cannot verify a place. Google
 *    address components carry only text/types — never Place IDs — so a city entity CANNOT
 *    be manufactured from a component. `primaryCityCandidate` is an OPTIONAL input the
 *    Prompt-2 Edge Function supplies after server-side reverse-geocode/verification.
 *  - No admin-area text ever becomes the City. No coordinates → blocking. Missing
 *    street/locality/pincode is NOT blocking.
 * Pure + deterministic; on failure it returns issues and never persists anything.
 */

import { isBuildingResult } from "@/components/property-address/buildingEligibility";
import type { LatLng, GeoBounds } from "@/lib/location/geoPlausibility";

/** A verified Google entity supplied by the server (carries its own place_id). */
export interface GeoCandidate {
  place_id: string;
  display_name: string;
  center: LatLng;
  bbox?: GeoBounds | null;
}
export interface AreaRoadCandidate extends GeoCandidate {
  kind: "area" | "road";
}

export interface NormalizedAddressComponent {
  types: string[];
  longText: string;
  shortText?: string;
}

export interface NormalizedGooglePlace {
  place_id: string | null;
  /** Place displayName (building/POI name when the result is a premise/establishment). */
  display_name: string | null;
  /** Place types (primaryType first when available). */
  types: string[];
  location: LatLng | null;
  formatted_address?: string | null;
  addressComponents: NormalizedAddressComponent[];
  /** Server-supplied verified candidates (Prompt 2). */
  primaryCityCandidate?: GeoCandidate | null;
  secondaryCityCandidates?: GeoCandidate[];
  areaRoadCandidates?: AreaRoadCandidate[];
  /** Owner-typed building name, used only when Google gave no credible building. */
  ownerBuildingName?: string | null;
}

export type BlockingIssue = "no_coordinates" | "google_city_unresolved";

export interface ResolvedLocation {
  address: {
    place_id: string | null;
    formatted_address: string | null;
    street_number: string | null;
    route: string | null;
    street_address: string | null;
    sublocality_1: string | null;
    sublocality_2: string | null;
    neighborhood: string | null;
    /** Reeve "area/locality" — NOT the city. */
    locality: string | null;
    state: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  building_name: string | null;
  building_name_source: "google" | "owner" | null;
  ownerBuildingRequired: boolean;
  primaryCity: GeoCandidate | null;
  secondaryCities: GeoCandidate[];
  areaRoadCandidates: AreaRoadCandidate[];
  blockingIssues: BlockingIssue[];
}

/** Types that constitute credible evidence of a building/premise/POI (not a bare area/street). */
const BUILDING_TYPES: ReadonlySet<string> = new Set([
  "premise",
  "subpremise",
  "establishment",
  "point_of_interest",
]);

function pick(components: NormalizedAddressComponent[], type: string): string | null {
  const c = components.find((x) => x.types.includes(type));
  return c ? c.longText : null;
}

export function resolvePropertyLocation(input: NormalizedGooglePlace): ResolvedLocation {
  const c = input.addressComponents ?? [];
  const street_number = pick(c, "street_number");
  const route = pick(c, "route");
  const sublocality_1 = pick(c, "sublocality_level_1");
  const sublocality_2 = pick(c, "sublocality_level_2");
  const neighborhood = pick(c, "neighborhood");
  const state = pick(c, "administrative_area_level_1");
  const pincode = pick(c, "postal_code");

  const street_address =
    [street_number, route].filter(Boolean).join(" ").trim() || route || null;
  // Reeve area/locality (NOT the city — city is a verified Google entity only).
  const locality = sublocality_1 ?? neighborhood ?? sublocality_2 ?? null;

  // Building identity: credible Google building requires explicit building-type evidence
  // AND a display name; else the owner must supply it (location stays Google-sourced).
  const hasBuildingType = (input.types ?? []).some((t) => BUILDING_TYPES.has(t));
  const credibleGoogleBuilding =
    hasBuildingType && isBuildingResult(input.types) && !!input.display_name;

  let building_name: string | null;
  let building_name_source: "google" | "owner" | null;
  let ownerBuildingRequired: boolean;
  if (credibleGoogleBuilding) {
    building_name = input.display_name;
    building_name_source = "google";
    ownerBuildingRequired = false;
  } else {
    ownerBuildingRequired = true;
    const owner = input.ownerBuildingName?.trim();
    building_name = owner ? owner : null;
    building_name_source = owner ? "owner" : null;
  }

  // City: only a server-supplied verified candidate (with a place_id) counts.
  const primaryCity = input.primaryCityCandidate ?? null;

  const blockingIssues: BlockingIssue[] = [];
  if (!input.location) blockingIssues.push("no_coordinates");
  if (!primaryCity || !primaryCity.place_id) blockingIssues.push("google_city_unresolved");

  return {
    address: {
      place_id: input.place_id ?? null,
      formatted_address: input.formatted_address ?? null,
      street_number,
      route,
      street_address,
      sublocality_1,
      sublocality_2,
      neighborhood,
      locality,
      state,
      pincode,
      latitude: input.location?.lat ?? null,
      longitude: input.location?.lng ?? null,
    },
    building_name,
    building_name_source,
    ownerBuildingRequired,
    primaryCity,
    secondaryCities: (input.secondaryCityCandidates ?? []).slice(0, 2),
    areaRoadCandidates: input.areaRoadCandidates ?? [],
    blockingIssues,
  };
}
