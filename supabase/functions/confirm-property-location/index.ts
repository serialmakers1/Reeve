// confirm-property-location — trusted owner/admin location flow (Prompt 2).
// Browser never establishes canonical geography: this Edge Function server-verifies
// Google Place IDs + reverse-geocode (Address Descriptors), enforces India, validates
// the final pin against the selected Place, recomputes the allowed candidate set, and
// persists atomically via service-role RPCs. verify_jwt=false + manual JWT.

import {
  fetchPlaceDetails,
  reverseGeocode,
  type PlaceDetails,
  type LatLng,
} from "./google.ts";
import {
  isCanonicalCityType,
  buildCityEvidenceSet,
  pickPrimaryCityPid,
  deriveSecondaryCities,
  validateAdminSecondaries,
  CityClassifyError,
  type CityCandidate,
} from "./geoClassify.ts";

const has = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://tfutuqqcxqqbirnsdpvz.supabase.co";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NO_SOCIETY_TYPES = new Set(["independent_house", "villa", "plot"]);
const BUILDING_TYPES = new Set(["premise", "subpremise", "establishment", "point_of_interest"]);
const GEOGRAPHIC_ONLY = new Set([
  "locality", "sublocality", "sublocality_level_1", "sublocality_level_2", "neighborhood",
  "colloquial_area", "route", "street_address", "street_number", "intersection",
  "postal_code", "postal_town", "administrative_area_level_1", "administrative_area_level_2",
  "administrative_area_level_3", "country", "political", "plus_code",
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
function errResp(error: string, status = 400): Response {
  return json({ error }, status);
}

// haversine metres (mirror of client geoPlausibility)
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function pinInsideOrNear(pin: LatLng, place: PlaceDetails): boolean {
  // inside viewport (small pad) OR within a tolerance of the place location
  if (place.viewport) {
    const pad = 0.01;
    const v = place.viewport;
    if (pin.lat >= v.sw.lat - pad && pin.lat <= v.ne.lat + pad &&
        pin.lng >= v.sw.lng - pad && pin.lng <= v.ne.lng + pad) return true;
  }
  if (place.location) return haversine(pin, place.location) <= 3000; // 3km tolerance
  return false;
}

function isBuildingResult(types: string[]): boolean {
  if (!types || types.length === 0) return true;
  return types.some((t) => !GEOGRAPHIC_ONLY.has(t));
}
function credibleGoogleBuilding(p: PlaceDetails): boolean {
  return !!p.displayName && p.types.some((t) => BUILDING_TYPES.has(t)) && isBuildingResult(p.types);
}

async function getAuthUser(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.id ? { id: u.id } : null;
}

// service-role PostgREST helpers
async function srSelect(path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
}
async function srRpc(fn: string, args: Record<string, unknown>): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
}

/** Server-derive actor from DB state: admin if users.role in admin set, else owner. */
async function deriveActor(userId: string): Promise<"owner" | "admin"> {
  const r = await srSelect(`users?id=eq.${userId}&select=role`);
  if (!r.ok) return "owner";
  const rows = await r.json();
  const role = rows?.[0]?.role as string | undefined;
  return role === "admin" || role === "super_admin" ? "admin" : "owner";
}

interface PropertyRow { owner_id: string; status: string; property_type: string | null }
async function loadProperty(propertyId: string): Promise<PropertyRow | null> {
  const r = await srSelect(`properties?id=eq.${propertyId}&select=owner_id,status,property_type`);
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0] ?? null;
}

function countryOf(p: PlaceDetails): string | null {
  return p.addressComponents.find((c) => c.types.includes("country"))?.shortText ?? null;
}

// ── Google resolution → candidate set (+ semantic city-evidence set, Prompt 4A B1) ──
async function resolveGeography(placeId: string, pin: LatLng) {
  const place = await fetchPlaceDetails(placeId);            // throws place_not_found → search_again
  if (!pinInsideOrNear(pin, place)) throw new Error("search_again");

  const rg = await reverseGeocode(pin.lat, pin.lng);
  if ((rg.country ?? "").toUpperCase() !== "IN") throw new Error("outside_service_area");

  // Google's own primary city (from the reverse-geocode `locality` result), validated as a
  // canonical India city via the SHARED predicate (no longer accepts admin_area_2/postal_town).
  let googlePrimary: { place_id: string; display_name: string; center: LatLng } | null = null;
  const cityEvidenceRaw: CityCandidate[] = [];
  const cityPlaceMap = new Map<string, { display_name: string; center: LatLng }>();

  async function addCity(pid: string, fallbackName: string, containment: CityCandidate["containment"]) {
    if (cityPlaceMap.has(pid)) {
      cityEvidenceRaw.push({ placeId: pid, displayName: cityPlaceMap.get(pid)!.display_name, types: ["locality"], country: "IN", containment });
      return;
    }
    try {
      const cp = await fetchPlaceDetails(pid);
      if (!cp.location) return;
      const country = countryOf(cp) ?? rg.country;
      cityEvidenceRaw.push({ placeId: cp.id, displayName: cp.displayName ?? fallbackName, types: cp.types, country, containment });
      if (isCanonicalCityType(cp.types) && (country ?? "IN").toUpperCase() === "IN") {
        cityPlaceMap.set(cp.id, { display_name: cp.displayName ?? fallbackName, center: cp.location });
      }
    } catch { /* skip unresolvable */ }
  }

  // 1) reverse-geocode primary + all canonical-city results
  if (rg.cityCandidate?.place_id) await addCity(rg.cityCandidate.place_id, rg.cityCandidate.display_name, null);
  for (const cr of rg.cityResults) {
    if (rg.cityCandidate && cr.place_id === rg.cityCandidate.place_id) continue;
    await addCity(cr.place_id, cr.display_name, null);
  }
  if (rg.cityCandidate?.place_id) {
    const m = cityPlaceMap.get(rg.cityCandidate.place_id);
    if (m) googlePrimary = { place_id: rg.cityCandidate.place_id, display_name: m.display_name, center: m.center };
  }

  // 2) Areas from Address Descriptor. Canonical-city descriptors join the city evidence set;
  //    everything else stays an area candidate. (No NEAR — optional, not membership.)
  const areaCands: Array<{ place_id: string; display_name: string; center: LatLng; bbox: null; kind: "area"; containment: string | null; preselect: boolean }> = [];
  for (const a of rg.areas) {
    if (a.containment === "NEAR") continue;
    try {
      const ap = await fetchPlaceDetails(a.place_id);
      if (!ap.location) continue;
      const aCountry = countryOf(ap);
      if ((aCountry ?? "IN").toUpperCase() !== "IN") continue;
      if (isCanonicalCityType(ap.types)) {
        cityEvidenceRaw.push({ placeId: ap.id, displayName: ap.displayName ?? a.display_name, types: ap.types, country: aCountry ?? "IN", containment: a.containment });
        if (!cityPlaceMap.has(ap.id)) cityPlaceMap.set(ap.id, { display_name: ap.displayName ?? a.display_name, center: ap.location });
        continue;
      }
      areaCands.push({
        place_id: ap.id, display_name: ap.displayName ?? a.display_name, center: ap.location,
        bbox: null, kind: "area", containment: a.containment, preselect: a.containment === "WITHIN",
      });
    } catch { /* skip unresolvable */ }
  }

  const cityEvidence = buildCityEvidenceSet(cityEvidenceRaw);
  const primaryCity = googlePrimary ? { ...googlePrimary, kind: "city" as const } : null;

  // Road — only if the reverse-geocode gave a route result with a real place_id.
  let roadCand: { place_id: string; display_name: string; center: LatLng; kind: "road" } | null = null;
  if (rg.routeCandidate) {
    try {
      const rp = await fetchPlaceDetails(rg.routeCandidate.place_id);
      const rCountry = rp.addressComponents.find((c) => c.types.includes("country"))?.shortText;
      if (rp.location && rp.types.includes("route") && (rCountry ?? "IN").toUpperCase() === "IN") {
        roadCand = { place_id: rp.id, display_name: rp.displayName ?? rg.routeCandidate.display_name, center: rp.location, kind: "road" };
      }
    } catch { /* none */ }
  }

  // Building identity
  const hasBuilding = credibleGoogleBuilding(place);
  const comp = (t: string) => place.addressComponents.find((c) => c.types.includes(t))?.longText ?? null;
  const street = [comp("street_number"), comp("route")].filter(Boolean).join(" ").trim() || comp("route") || null;

  return {
    place, pin, primaryCity, areaCands, roadCand, hasBuilding,
    cityEvidence, cityPlaceMap,
    address: {
      formatted_address: place.formattedAddress,
      street_address: street,
      street_number: comp("street_number"), route: comp("route"),
      sublocality_1: comp("sublocality_level_1"), sublocality_2: comp("sublocality_level_2"),
      neighborhood: comp("neighborhood"),
      locality: comp("sublocality_level_1") ?? comp("neighborhood") ?? comp("sublocality_level_2"),
      district: comp("administrative_area_level_2"), state: comp("administrative_area_level_1"),
      country: comp("country"), pincode: comp("postal_code"),
    },
  };
}

type Resolved = Awaited<ReturnType<typeof resolveGeography>>;

// ── Persisted geography (for grandfathering + unchanged-target detection) ──
interface PersistedGeo {
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  mode: "auto" | "admin";
  primary: { place_id: string; geo_place_id: string; display_name: string; source: string } | null;
  secondaries: Array<{ place_id: string; geo_place_id: string; display_name: string; source: string }>;
}
async function loadPersistedGeo(propertyId: string): Promise<PersistedGeo> {
  const empty: PersistedGeo = { placeId: null, lat: null, lng: null, mode: "auto", primary: null, secondaries: [] };
  const pr = await srSelect(`properties?id=eq.${propertyId}&select=place_id,latitude,longitude,secondary_city_mode`);
  if (pr.ok) {
    const rows = await pr.json();
    const row = rows?.[0];
    if (row) {
      empty.placeId = row.place_id ?? null;
      empty.lat = row.latitude ?? null;
      empty.lng = row.longitude ?? null;
      empty.mode = row.secondary_city_mode === "admin" ? "admin" : "auto";
    }
  }
  const ar = await srSelect(
    `property_geo_associations?property_id=eq.${propertyId}&select=relationship,source,geo_place_id,geo_places(place_id,display_name)`,
  );
  if (ar.ok) {
    const rows = (await ar.json()) as Array<Record<string, unknown>>;
    for (const r of rows) {
      const gp = r.geo_places as { place_id?: string; display_name?: string } | null;
      if (!gp?.place_id) continue;
      const rec = { place_id: gp.place_id, geo_place_id: r.geo_place_id as string, display_name: gp.display_name ?? "", source: (r.source as string) ?? "google" };
      if (r.relationship === "primary_city") empty.primary = rec;
      else if (r.relationship === "secondary_city") empty.secondaries.push(rec);
    }
  }
  return empty;
}

/** Effective geography = final primary + secondaries + durable mode. Pure decision + validation;
 *  throws CityClassifyError on invalid admin overrides. Fetches place details ONLY for explicit
 *  admin secondary ids not already resolved in cityPlaceMap. */
async function computeFinalGeography(
  actor: "owner" | "admin",
  body: Record<string, unknown>,
  resolved: Resolved,
  persisted: PersistedGeo,
) {
  const evidence = resolved.cityEvidence;
  const evidenceIds = new Set(evidence.map((c) => c.placeId));
  const googlePrimaryPid = resolved.primaryCity?.place_id ?? null;

  const unchanged =
    !!persisted.placeId && persisted.placeId === resolved.place.id &&
    persisted.lat != null && persisted.lng != null &&
    haversine(resolved.pin, { lat: persisted.lat, lng: persisted.lng }) <= 100;

  const gfPrimary = unchanged && persisted.primary?.source === "admin" ? persisted.primary.place_id : null;
  const gfSecondaryIds = new Set(
    unchanged ? persisted.secondaries.filter((s) => s.source === "admin").map((s) => s.place_id) : [],
  );
  const persistedPrimaryPid = unchanged ? persisted.primary?.place_id ?? null : null;

  // city_place_id field presence (omit / null / value)
  let overridePid: string | null | undefined = undefined;
  if (has(body, "city_place_id")) {
    const v = body.city_place_id;
    overridePid = v === null ? null : (typeof v === "string" && v ? v : undefined);
  }

  const primary = pickPrimaryCityPid(actor, googlePrimaryPid, overridePid, evidenceIds, gfPrimary, persistedPrimaryPid);
  const finalPrimaryPid = primary?.placeId ?? null;

  // secondary_city_place_ids field presence → mode-aware state machine
  const hasSecKey = has(body, "secondary_city_place_ids");
  const secVal = hasSecKey ? body.secondary_city_place_ids : undefined;
  if (hasSecKey && actor !== "admin") throw new CityClassifyError("owner_cannot_set_secondaries");

  type SecOut = { place_id: string; display_name: string; center: LatLng | null; geo_place_id: string | null; source: "google" | "admin" };
  let secondaries: SecOut[] = [];
  let mode: "auto" | "admin";

  const autoDerive = (): SecOut[] =>
    deriveSecondaryCities(evidence, finalPrimaryPid).map((c) => {
      const m = resolved.cityPlaceMap.get(c.placeId);
      return { place_id: c.placeId, display_name: m?.display_name ?? c.displayName, center: m?.center ?? null, geo_place_id: null, source: "google" as const };
    });

  if (!unchanged) {
    // brand-new target → reset to auto
    if (Array.isArray(secVal)) { // admin immediately set explicit on a new target
      mode = "admin";
      secondaries = await validateExplicit(secVal as unknown[], finalPrimaryPid, evidenceIds, resolved, new Set());
    } else {
      mode = "auto";
      secondaries = autoDerive();
    }
  } else if (secVal === null) {
    mode = "auto";
    secondaries = autoDerive();
  } else if (Array.isArray(secVal)) {
    mode = "admin";
    secondaries = await validateExplicit(secVal as unknown[], finalPrimaryPid, evidenceIds, resolved, gfSecondaryIds);
  } else {
    // omitted, unchanged target → mode-aware preserve / recompute
    if (persisted.mode === "admin") {
      mode = "admin";
      secondaries = persisted.secondaries
        .filter((s) => s.place_id !== finalPrimaryPid) // reconcile against final primary
        .map((s) => ({ place_id: s.place_id, display_name: s.display_name, center: null, geo_place_id: s.geo_place_id, source: s.source === "admin" ? "admin" as const : "google" as const }));
    } else {
      mode = "auto";
      secondaries = autoDerive();
    }
  }

  // ALWAYS reconcile: never let the final primary appear as a secondary.
  secondaries = secondaries.filter((s) => s.place_id !== finalPrimaryPid);

  return { primary, finalPrimaryPid, secondaries, mode, evidence, unchanged };
}

/** Validate + resolve explicit admin secondary ids. Fetches place details for centers/types. */
async function validateExplicit(
  ids: unknown[],
  finalPrimaryPid: string | null,
  evidenceIds: Set<string>,
  resolved: Resolved,
  gfSecondaryIds: Set<string>,
): Promise<Array<{ place_id: string; display_name: string; center: LatLng | null; geo_place_id: string | null; source: "admin" }>> {
  const fetched: CityCandidate[] = [];
  const centers = new Map<string, { display_name: string; center: LatLng }>();
  for (const raw of ids) {
    if (typeof raw !== "string" || !raw) continue;
    const cached = resolved.cityPlaceMap.get(raw);
    if (cached) {
      fetched.push({ placeId: raw, displayName: cached.display_name, types: ["locality"], country: "IN" });
      centers.set(raw, cached);
      continue;
    }
    const cp = await fetchPlaceDetails(raw);
    const country = countryOf(cp) ?? "IN";
    fetched.push({ placeId: cp.id, displayName: cp.displayName ?? "", types: cp.types, country });
    if (cp.location) centers.set(cp.id, { display_name: cp.displayName ?? "", center: cp.location });
  }
  const validated = validateAdminSecondaries(fetched, finalPrimaryPid, evidenceIds, gfSecondaryIds);
  return validated.map((c) => {
    const m = centers.get(c.placeId);
    return { place_id: c.placeId, display_name: m?.display_name ?? c.displayName, center: m?.center ?? null, geo_place_id: null, source: "admin" as const };
  });
}

function candidateSummary(r: Resolved, fin?: Awaited<ReturnType<typeof computeFinalGeography>>) {
  const primaryPid = fin?.primary?.placeId ?? r.primaryCity?.place_id ?? null;
  const primaryName = fin?.primary
    ? (r.cityPlaceMap.get(fin.primary.placeId)?.display_name ?? r.primaryCity?.display_name ?? "")
    : r.primaryCity?.display_name ?? "";
  return {
    property: {
      place_id: r.place.id,
      latitude: r.pin.lat, longitude: r.pin.lng, ...r.address,
      building_name: r.hasBuilding ? r.place.displayName : null,
      building_source: r.hasBuilding ? "google" : null,
      owner_building_required: !r.hasBuilding,
    },
    primary_city: primaryPid ? { place_id: primaryPid, display_name: primaryName } : null,
    city_unresolved: !primaryPid,
    // full Google semantic city-evidence set for this pin (admin UI offers ONLY these)
    city_candidates: r.cityEvidence.map((c) => ({ place_id: c.placeId, display_name: c.displayName })),
    secondary_cities: (fin?.secondaries ?? []).map((s) => ({ place_id: s.place_id, display_name: s.display_name })),
    secondary_city_mode: fin?.mode ?? "auto",
    areas: r.areaCands.map((a) => ({ place_id: a.place_id, display_name: a.display_name, preselect: a.preselect })),
    road: r.roadCand ? { place_id: r.roadCand.place_id, display_name: r.roadCand.display_name } : null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS_HEADERS });

  // ── Fixed-input live-key smoke probe (no user input, no secrets returned) ──
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("smoke") === "1") {
    try {
      const rg = await reverseGeocode(12.9716, 77.5946); // Bengaluru
      const anyPlaceId = rg.cityCandidate?.place_id ?? rg.areas[0]?.place_id ?? null;
      let placeOk = false;
      if (anyPlaceId) { const p = await fetchPlaceDetails(anyPlaceId); placeOk = !!p.id; }
      return json({
        ok: placeOk && rg.rawResultsCount > 0,
        reverse_geocode: rg.rawResultsCount > 0,
        address_descriptors: rg.areas.length >= 0,
        place_details: placeOk,
        country: rg.country,
      });
    } catch (e) {
      return json({ ok: false, cause: (e as Error).message }, 200);
    }
  }

  if (req.method !== "POST") return errResp("method_not_allowed", 405);

  try {
    const user = await getAuthUser(req);
    if (!user) return errResp("unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode ?? "";
    const propertyId: string = body.property_id ?? "";
    if (!propertyId) return errResp("property_id_required", 400);

    const prop = await loadProperty(propertyId);
    if (!prop) return errResp("property_not_found", 404);

    const actor = await deriveActor(user.id);
    // lifecycle: owner ⇒ owns + draft/changes_requested; admin ⇒ existing admin lifecycle
    if (actor === "owner") {
      if (prop.owner_id !== user.id) return errResp("forbidden", 403);
      if (!["draft", "changes_requested"].includes(prop.status)) return errResp("locked", 403);
    }

    if (mode === "update_building_name") {
      const r = await srRpc("update_property_building_name", {
        p_property_id: propertyId, p_actor_user_id: user.id, p_actor_type: actor,
        p_building_name: typeof body.building_name === "string" ? body.building_name : null,
      });
      if (!r.ok) { const t = await r.text(); console.error("update_building_name failed", t); return errResp("update_failed", 400); }
      return json({ ok: true, property_id: propertyId });
    }

    if (mode === "resolve" || mode === "confirm") {
      const placeId: string = body.place_id ?? "";
      const pin: LatLng | null = (typeof body.lat === "number" && typeof body.lng === "number")
        ? { lat: body.lat, lng: body.lng } : null;
      if (!placeId || !pin) return errResp("search_again", 400);

      let resolved: Resolved;
      try {
        resolved = await resolveGeography(placeId, pin);
      } catch (e) {
        const m = (e as Error).message;
        if (["search_again", "outside_service_area", "place_not_found"].includes(m)) {
          return errResp(m === "place_not_found" ? "search_again" : m, 400);
        }
        console.error("resolve error", m);
        return errResp("google_unavailable", 503);
      }

      const persisted = await loadPersistedGeo(propertyId);
      let fin: Awaited<ReturnType<typeof computeFinalGeography>>;
      try {
        fin = await computeFinalGeography(actor, body, resolved, persisted);
      } catch (e) {
        if (e instanceof CityClassifyError) return errResp(e.code, 400);
        const m = (e as Error).message;
        if (m === "place_not_found") return errResp("city_not_associated", 400);
        console.error("finalize error", m);
        return errResp("google_unavailable", 503);
      }

      const summary = candidateSummary(resolved, fin);

      if (mode === "resolve") return json({ ok: true, property_id: propertyId, ...summary });

      // confirm — recompute authoritative allowed set; accept only owner selections from it.
      if (!fin.primary) return errResp("city_unresolved", 400);
      const finalPrimaryName = resolved.cityPlaceMap.get(fin.primary.placeId)?.display_name
        ?? resolved.primaryCity?.display_name ?? "";

      // building: server precedence — credible Google building wins over any client name.
      const optionalType = NO_SOCIETY_TYPES.has(prop.property_type ?? "");
      let buildingName: string | null;
      if (resolved.hasBuilding) buildingName = resolved.place.displayName;
      else {
        const owner = typeof body.building_name === "string" ? body.building_name.trim() : "";
        buildingName = owner || null;
        if (!buildingName && !optionalType) return errResp("building_name_required", 400);
      }

      // Association entries: reuse an existing geo_place_id (preserve path) OR upsert a new one.
      type AssocEntry = {
        role: "primary_city" | "secondary_city" | "area_road"; source: string; confidence: string | null;
        reuseGeoPlaceId?: string; upsert?: { place_id: string; display_name: string; kind: string; center: LatLng };
      };
      const entries: AssocEntry[] = [];

      // primary_city — from the FINAL primary (Google or admin override), reconciled server-side.
      {
        const m = resolved.cityPlaceMap.get(fin.primary.placeId);
        if (m) entries.push({ role: "primary_city", source: fin.primary.source, confidence: "high", upsert: { place_id: fin.primary.placeId, display_name: m.display_name, kind: "city", center: m.center } });
        else if (persisted.primary?.place_id === fin.primary.placeId) entries.push({ role: "primary_city", source: fin.primary.source, confidence: "high", reuseGeoPlaceId: persisted.primary.geo_place_id });
        else return errResp("city_unresolved", 400);
      }

      // secondary_city — Google-derived (auto, untamperable), preserved admin (reused), or explicit admin.
      for (const s of fin.secondaries) {
        if (s.geo_place_id) entries.push({ role: "secondary_city", source: s.source, confidence: null, reuseGeoPlaceId: s.geo_place_id });
        else if (s.center) entries.push({ role: "secondary_city", source: s.source, confidence: null, upsert: { place_id: s.place_id, display_name: s.display_name, kind: "city", center: s.center } });
      }

      const allowedAreaIds = new Set(resolved.areaCands.map((a) => a.place_id));
      const selectedAreas: string[] = Array.isArray(body.selected_area_ids) ? body.selected_area_ids : [];
      for (const a of resolved.areaCands) {
        if (a.preselect || selectedAreas.includes(a.place_id)) {
          entries.push({ role: "area_road", source: "google", confidence: a.containment === "WITHIN" ? "high" : "medium", upsert: { place_id: a.place_id, display_name: a.display_name, kind: "area", center: a.center } });
        }
      }
      if (resolved.roadCand && selectedAreas.includes(resolved.roadCand.place_id)) {
        entries.push({ role: "area_road", source: "google", confidence: "medium", upsert: { place_id: resolved.roadCand.place_id, display_name: resolved.roadCand.display_name, kind: "road", center: resolved.roadCand.center } });
      }
      // reject any selected id not in the allowed set (tamper guard) — except the owner extra below
      for (const id of selectedAreas) {
        if (!allowedAreaIds.has(id) && id !== resolved.roadCand?.place_id && id !== (body.extra_area_id ?? "")) {
          return errResp("search_again", 400);
        }
      }

      // owner/admin one extra area/road (outside suggestions) — verify + India + plausibility
      const extraId: string = body.extra_area_id ?? "";
      if (extraId) {
        try {
          const ep = await fetchPlaceDetails(extraId);
          const eCountry = ep.addressComponents.find((c) => c.types.includes("country"))?.shortText;
          const kind = ep.types.includes("route") ? "road" : "area";
          const isAreaish = ep.types.includes("route") || ep.types.some((t) => t.startsWith("sublocality") || t === "neighborhood" || t === "locality") || !isBuildingResult(ep.types) === false;
          if (!ep.location || (eCountry ?? "IN").toUpperCase() !== "IN" || !isAreaish) return errResp("implausible_area", 400);
          const maxM = kind === "road" ? 10000 : 3000;
          if (haversine(pin, ep.location) > maxM) return errResp("implausible_area", 400);
          entries.push({ role: "area_road", source: actor === "admin" ? "admin" : "owner", confidence: null, upsert: { place_id: ep.id, display_name: ep.displayName ?? "", kind, center: ep.location } });
        } catch {
          return errResp("implausible_area", 400);
        }
      }

      // mint geo_places (trusted, only for new ones) → association array
      const associations: Array<Record<string, unknown>> = [];
      for (const e of entries) {
        let gid = e.reuseGeoPlaceId;
        if (!gid && e.upsert) {
          const gr = await srRpc("upsert_geo_place", {
            p_place_id: e.upsert.place_id, p_display_name: e.upsert.display_name, p_kind: e.upsert.kind,
            p_center_lat: e.upsert.center.lat, p_center_lng: e.upsert.center.lng,
          });
          if (!gr.ok) { console.error("upsert_geo_place failed", await gr.text()); return errResp("google_unavailable", 503); }
          gid = await gr.json(); // returns uuid
        }
        if (!gid) continue;
        associations.push({ geo_place_id: gid, relationship: e.role, source: e.source, confidence: e.confidence });
      }

      const location = {
        place_id: resolved.place.id, formatted_address: resolved.address.formatted_address,
        latitude: pin.lat, longitude: pin.lng,
        viewport_ne_lat: resolved.place.viewport?.ne.lat ?? null, viewport_ne_lng: resolved.place.viewport?.ne.lng ?? null,
        viewport_sw_lat: resolved.place.viewport?.sw.lat ?? null, viewport_sw_lng: resolved.place.viewport?.sw.lng ?? null,
        city: finalPrimaryName,
        locality: resolved.address.locality, street_address: resolved.address.street_address,
        street_number: resolved.address.street_number, route: resolved.address.route,
        sublocality_1: resolved.address.sublocality_1, sublocality_2: resolved.address.sublocality_2,
        neighborhood: resolved.address.neighborhood, district: resolved.address.district,
        state: resolved.address.state, pincode: resolved.address.pincode,
        building_name: buildingName,
        building_name_source: resolved.hasBuilding ? "google" : (buildingName ? (actor === "admin" ? "admin" : "owner") : null),
        secondary_city_mode: fin.mode,
      };

      const ar = await srRpc("apply_property_location", {
        p_property_id: propertyId, p_actor_user_id: user.id, p_actor_type: actor,
        p_location: location, p_associations: associations,
      });
      if (!ar.ok) { console.error("apply_property_location failed", await ar.text()); return errResp("save_failed", 400); }

      return json({ ok: true, property_id: propertyId, confirmed: true });
    }

    return errResp("bad_mode", 400);
  } catch (e) {
    console.error("unhandled", (e as Error).message);
    return errResp("google_unavailable", 503);
  }
});
