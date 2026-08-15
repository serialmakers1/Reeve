// Google Places (New) + Geocoding (Address Descriptors) server-side helpers.
// Uses GOOGLE_MAPS_SERVER_KEY (server-only). Never log/return the key.

const PLACES_BASE = "https://places.googleapis.com/v1/places";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

export const PLACE_FIELD_MASK =
  "id,displayName,formattedAddress,location,types,addressComponents,viewport,plusCode";

// Shared pure types live in types.ts (no Deno) so pure modules/tests can import them
// without pulling this Deno-using module into the app TypeScript program.
import type {
  LatLng, Bounds, PlaceDetails, GeocodeArea, ReverseGeocode,
  FinalPinComponent, FinalPinResolution, StreetViewMeta,
} from "./types.ts";
export type {
  LatLng, Bounds, PlaceDetails, GeocodeArea, ReverseGeocode,
  FinalPinComponent, FinalPinResolution, StreetViewMeta,
} from "./types.ts";

function key(): string {
  const k = Deno.env.get("GOOGLE_MAPS_SERVER_KEY");
  if (!k) throw new Error("google_key_missing");
  return k;
}

/** Places API (New) Place Details with a minimal field mask. */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const res = await fetch(`${PLACES_BASE}/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key(),
      "X-Goog-FieldMask": PLACE_FIELD_MASK,
    },
  });
  if (res.status === 404 || res.status === 400) throw new Error("place_not_found");
  if (!res.ok) throw new Error(`places_http_${res.status}`);
  const j = await res.json();
  const loc = j.location ? { lat: j.location.latitude, lng: j.location.longitude } : null;
  const vp = j.viewport
    ? {
        ne: { lat: j.viewport.high.latitude, lng: j.viewport.high.longitude },
        sw: { lat: j.viewport.low.latitude, lng: j.viewport.low.longitude },
      }
    : null;
  return {
    id: j.id,
    displayName: j.displayName?.text ?? null,
    formattedAddress: j.formattedAddress ?? null,
    location: loc,
    types: Array.isArray(j.types) ? j.types : [],
    viewport: vp,
    plusCode: j.plusCode?.globalCode ?? null,
    addressComponents: Array.isArray(j.addressComponents)
      ? j.addressComponents.map((c: Record<string, unknown>) => ({
          types: (c.types as string[]) ?? [],
          longText: (c.longText as string) ?? "",
          shortText: (c.shortText as string) ?? undefined,
        }))
      : [],
  };
}

/** Reverse geocode with Address Descriptors (India GA). */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode> {
  const url =
    `${GEOCODE_BASE}?latlng=${lat},${lng}` +
    `&extra_computations=ADDRESS_DESCRIPTORS&region=in&language=en&key=${key()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`geocode_http_${res.status}`);
  const j = await res.json();
  if (j.status !== "OK" && j.status !== "ZERO_RESULTS") throw new Error(`geocode_status_${j.status}`);

  const results: Array<Record<string, unknown>> = Array.isArray(j.results) ? j.results : [];
  // country (short code) from any result's components
  let country: string | null = null;
  let cityCandidate: ReverseGeocode["cityCandidate"] = null;
  let routeCandidate: ReverseGeocode["routeCandidate"] = null;
  const components: ReverseGeocode["components"] = [];
  const cityResults: ReverseGeocode["cityResults"] = [];
  const seenCityPids = new Set<string>();

  for (const r of results) {
    const comps = (r.address_components as Array<Record<string, unknown>>) ?? [];
    for (const c of comps) {
      const types = (c.types as string[]) ?? [];
      components.push({ types, long_name: (c.long_name as string) ?? "", short_name: (c.short_name as string) ?? "" });
      if (types.includes("country") && !country) country = (c.short_name as string) ?? null;
    }
    const rTypes = (r.types as string[]) ?? [];
    // a "locality" result carries the primary city Place ID
    if (!cityCandidate && rTypes.includes("locality") && r.place_id) {
      cityCandidate = { place_id: r.place_id as string, display_name: cityName(r) };
    }
    // ALL canonical-city result entities (locality OR administrative_area_level_3) — evidence set.
    if (r.place_id && (rTypes.includes("locality") || rTypes.includes("administrative_area_level_3"))) {
      const pid = r.place_id as string;
      if (!seenCityPids.has(pid)) {
        seenCityPids.add(pid);
        cityResults.push({ place_id: pid, display_name: cityName(r), types: rTypes });
      }
    }
    // a "route" result carries a road Place ID
    if (!routeCandidate && rTypes.includes("route") && r.place_id) {
      routeCandidate = { place_id: r.place_id as string, display_name: routeName(r) };
    }
  }

  // Address Descriptor areas (top-level `address_descriptor.areas`)
  const areas: GeocodeArea[] = [];
  const ad = (j.address_descriptor as Record<string, unknown>) ?? null;
  if (ad && Array.isArray(ad.areas)) {
    for (const a of ad.areas as Array<Record<string, unknown>>) {
      const pid = a.place_id as string | undefined;
      if (!pid) continue;
      const dn = (a.display_name as Record<string, unknown>)?.text as string | undefined;
      areas.push({
        place_id: pid,
        display_name: dn ?? "",
        containment: ((a.containment as string) ?? null) as GeocodeArea["containment"],
      });
    }
  }

  return { country, cityCandidate, cityResults, routeCandidate, areas, components, rawResultsCount: results.length };
}

function cityName(r: Record<string, unknown>): string {
  const comps = (r.address_components as Array<Record<string, unknown>>) ?? [];
  const loc = comps.find((c) => ((c.types as string[]) ?? []).includes("locality"));
  return (loc?.long_name as string) ?? (r.formatted_address as string) ?? "";
}
function routeName(r: Record<string, unknown>): string {
  const comps = (r.address_components as Array<Record<string, unknown>>) ?? [];
  const rt = comps.find((c) => ((c.types as string[]) ?? []).includes("route"));
  return (rt?.long_name as string) ?? "";
}

// ── Phase 2: final-pin reverse geocode with normalized status (rural India bug fix) ──
// Distinguishes transient provider failure / ZERO_RESULTS / OK so the caller never treats
// "no country" as "outside India". The legacy reverseGeocode() above is left UNCHANGED.

export async function reverseGeocodeFinalPin(lat: number, lng: number): Promise<FinalPinResolution> {
  const empty: FinalPinResolution = {
    status: "transient", country: null, components: [], formatted_address: null, plus_code: null,
    cityResults: [], routeCandidate: null, areas: [],
  };
  let res: Response;
  try {
    res = await fetch(
      `${GEOCODE_BASE}?latlng=${lat},${lng}&extra_computations=ADDRESS_DESCRIPTORS&region=in&language=en&key=${key()}`,
      { method: "GET" },
    );
  } catch {
    return { ...empty, status: "transient" };
  }
  if (!res.ok) return { ...empty, status: "transient" };
  let j: Record<string, unknown>;
  try { j = await res.json(); } catch { return { ...empty, status: "transient" }; }
  const gstatus = j.status as string;
  if (gstatus === "ZERO_RESULTS") return { ...empty, status: "zero_results" };
  if (gstatus !== "OK") return { ...empty, status: "transient" };

  const results: Array<Record<string, unknown>> = Array.isArray(j.results) ? j.results : [];
  let country: string | null = null;
  let routeCandidate: FinalPinResolution["routeCandidate"] = null;
  const cityResults: FinalPinResolution["cityResults"] = [];
  const seenCity = new Set<string>();

  for (const r of results) {
    const comps = (r.address_components as Array<Record<string, unknown>>) ?? [];
    for (const c of comps) {
      const t = (c.types as string[]) ?? [];
      if (t.includes("country") && !country) country = (c.short_name as string) ?? null;
    }
    const rTypes = (r.types as string[]) ?? [];
    if (r.place_id && (rTypes.includes("locality") || rTypes.includes("administrative_area_level_3"))) {
      const pid = r.place_id as string;
      if (!seenCity.has(pid)) { seenCity.add(pid); cityResults.push({ place_id: pid, display_name: cityName(r), types: rTypes }); }
    }
    if (!routeCandidate && rTypes.includes("route") && r.place_id) {
      routeCandidate = { place_id: r.place_id as string, display_name: routeName(r) };
    }
  }

  // Most-specific result (results[0]) drives factual components + formatted address + plus code.
  const top = results[0] ?? {};
  const components: FinalPinComponent[] = ((top.address_components as Array<Record<string, unknown>>) ?? []).map((c) => ({
    types: (c.types as string[]) ?? [], long_name: (c.long_name as string) ?? "", short_name: (c.short_name as string) ?? "",
  }));
  const plus_code = ((j.plus_code as Record<string, unknown>)?.global_code as string) ?? null;

  const areas: GeocodeArea[] = [];
  const ad = (j.address_descriptor as Record<string, unknown>) ?? null;
  if (ad && Array.isArray(ad.areas)) {
    for (const a of ad.areas as Array<Record<string, unknown>>) {
      const pid = a.place_id as string | undefined;
      if (!pid) continue;
      const dn = (a.display_name as Record<string, unknown>)?.text as string | undefined;
      areas.push({ place_id: pid, display_name: dn ?? "", containment: ((a.containment as string) ?? null) as GeocodeArea["containment"] });
    }
  }

  return {
    status: "ok", country, components,
    formatted_address: (top.formatted_address as string) ?? null,
    plus_code, cityResults, routeCandidate, areas,
  };
}

// ── Street View availability metadata (no image bytes). Accepts a pin OR a specific pano id. ──
export async function streetViewMetadata(
  q: { lat: number; lng: number } | { panoId: string },
): Promise<StreetViewMeta> {
  const base = "https://maps.googleapis.com/maps/api/streetview/metadata";
  const param = "panoId" in q ? `pano=${encodeURIComponent(q.panoId)}` : `location=${q.lat},${q.lng}`;
  let res: Response;
  try {
    res = await fetch(`${base}?${param}&key=${key()}`, { method: "GET" });
  } catch {
    return { available: false, pano_id: null, location: null };
  }
  if (!res.ok) return { available: false, pano_id: null, location: null };
  let j: Record<string, unknown>;
  try { j = await res.json(); } catch { return { available: false, pano_id: null, location: null }; }
  if (j.status !== "OK") return { available: false, pano_id: null, location: null };
  const loc = j.location ? { lat: (j.location as Record<string, number>).lat, lng: (j.location as Record<string, number>).lng } : null;
  return { available: true, pano_id: (j.pano_id as string) ?? null, location: loc };
}
