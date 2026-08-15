// Pure shared types for the confirm-property-location function.
// NO Deno / Google / network — so pure modules (resolvePin.ts) and vitest fixtures can
// import these without pulling in google.ts (which references the Deno runtime).

export interface LatLng { lat: number; lng: number }
export interface Bounds { ne: LatLng; sw: LatLng }

export interface PlaceDetails {
  id: string;
  displayName: string | null;
  formattedAddress: string | null;
  location: LatLng | null;
  types: string[];
  viewport: Bounds | null;
  plusCode: string | null;
  addressComponents: Array<{ types: string[]; longText: string; shortText?: string }>;
}

export interface GeocodeArea {
  place_id: string;
  display_name: string;
  containment: "WITHIN" | "OUTSKIRTS" | "NEAR" | null;
}

export interface ReverseGeocode {
  country: string | null;
  cityCandidate: { place_id: string; display_name: string } | null;
  cityResults: Array<{ place_id: string; display_name: string; types: string[] }>;
  routeCandidate: { place_id: string; display_name: string } | null;
  areas: GeocodeArea[];
  components: Array<{ types: string[]; long_name: string; short_name: string }>;
  rawResultsCount: number;
}

export interface FinalPinComponent { types: string[]; long_name: string; short_name: string }
export interface FinalPinResolution {
  status: "ok" | "zero_results" | "transient";
  country: string | null;
  components: FinalPinComponent[];
  formatted_address: string | null;
  plus_code: string | null;
  cityResults: Array<{ place_id: string; display_name: string; types: string[] }>;
  routeCandidate: { place_id: string; display_name: string } | null;
  areas: GeocodeArea[];
}

export interface StreetViewMeta { available: boolean; pano_id: string | null; location: LatLng | null }
