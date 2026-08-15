// confirm-property-location — trusted owner/admin location flow (Prompt 2).
// Browser never establishes canonical geography: this Edge Function server-verifies
// Google Place IDs + reverse-geocode (Address Descriptors), enforces India, validates
// the final pin against the selected Place, recomputes the allowed candidate set, and
// persists atomically via service-role RPCs. verify_jwt=false + manual JWT.

import {
  fetchPlaceDetails,
  reverseGeocode,
  reverseGeocodeFinalPin,
  streetViewMetadata,
  type PlaceDetails,
  type LatLng,
} from "./google.ts";
import {
  isCanonicalCityType,
  buildCityEvidenceSet,
  type CityCandidate,
} from "./geoClassify.ts";
import {
  mapFactual,
  indiaStatus,
  classifyCandidates,
  buildingDecision,
  chooseRootSettlement,
  buildFinalAssociations,
  computeBuildingIntent,
  classifyExtraPlace,
  resolveAdminDiscovery,
  type PreviewCandidate,
  type FinalKind,
  type AdminAddInput,
} from "./resolvePin.ts";

const MAX_EXTRA_PLACES = 5;

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

interface PropertyRow {
  owner_id: string; status: string; property_type: string | null;
  building_name: string | null; building_name_source: string | null; place_id: string | null;
  streetview_pano_id: string | null;
}
async function loadProperty(propertyId: string): Promise<PropertyRow | null> {
  const r = await srSelect(
    `properties?id=eq.${propertyId}&select=owner_id,status,property_type,building_name,building_name_source,place_id,streetview_pano_id`,
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0] ?? null;
}

// ── Phase 2 engine helpers (use_pin / commit_pin) ──────────────────────────────
const NEW_OWNER_STATUSES = new Set(["draft", "changes_requested"]);

function validCoord(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Fresh Google resolution shared by use_pin (preview) and commit_pin (write). */
async function engineResolve(placeId: string | null, pin: LatLng) {
  let place: PlaceDetails | null = null;
  let placeFetchFailed = false;
  if (placeId) {
    try { place = await fetchPlaceDetails(placeId); } catch { placeFetchFailed = true; }
  }
  const rg = await reverseGeocodeFinalPin(pin.lat, pin.lng);
  return { place, placeFetchFailed, rg };
}

/** Read-only: attach an existing canonical geo_place_id to a candidate (NO write, NO resolver). */
async function existingGeoPlaceId(providerPlaceId: string): Promise<string | null> {
  const r = await srSelect(
    `geo_provider_refs?provider=eq.google&provider_place_id=eq.${encodeURIComponent(providerPlaceId)}&select=geo_place_id`,
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0]?.geo_place_id ?? null;
}

interface GeoPlaceRow { id: string; kind: string; search_region_id: string | null }
async function loadGeoPlace(id: string): Promise<GeoPlaceRow | null> {
  const r = await srSelect(`geo_places?id=eq.${id}&select=id,kind,search_region_id`);
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0] ?? null;
}

const EXPECTED_RESOLVER_CONFLICT = /ambiguous canonical match|incompatible with requested/i;
function isExpectedCanonicalResolutionConflict(msg: string): boolean {
  return EXPECTED_RESOLVER_CONFLICT.test(msg);
}

type EnrichedCandidate = PreviewCandidate & { geo_place_id: string | null };

/** Canonicalize a candidate via the trusted resolver (may throw expected conflict). Returns geo_place uuid.
 *  `parentGeoPlaceId` is a REEVE UUID (never a Google place_id); anchor pin used for provider-less rows. */
async function resolveCanonical(
  c: PreviewCandidate,
  opts?: { parentGeoPlaceId?: string | null; anchorLat?: number; anchorLng?: number; anchorQuality?: string },
): Promise<string> {
  const args: Record<string, unknown> = {
    p_kind: c.kind,
    p_display_name: c.display_name || c.provider_place_id || c.kind,
    p_provider: c.provider,                  // null for provider-less
    p_provider_place_id: c.provider_place_id, // null for provider-less
  };
  if (opts?.parentGeoPlaceId) args.p_parent_geo_place_id = opts.parentGeoPlaceId;
  if (typeof opts?.anchorLat === "number") { args.p_lat = opts.anchorLat; args.p_lng = opts.anchorLng; }
  if (opts?.anchorQuality) args.p_anchor_quality = opts.anchorQuality;
  const r = await srRpc("resolve_canonical_geo_place", args);
  if (!r.ok) throw new Error(await r.text());
  return await r.json(); // uuid
}

function previewAssoc(c: EnrichedCandidate) {
  return {
    candidate_key: c.candidate_key, geo_place_id: c.geo_place_id, kind: c.kind,
    display_name: c.display_name, evidence_type: c.evidence_type,
    recommendation: c.recommendation, root_eligible: c.root_eligible,
  };
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

    // ── Phase 2 engine: use_pin (preview, no write) / commit_pin (atomic write) ──
    if (mode === "use_pin" || mode === "commit_pin") {
      if (!validCoord(body.lat, body.lng)) return errResp("invalid_coordinates", 400);
      const pin: LatLng = { lat: body.lat as number, lng: body.lng as number };
      const placeId: string | null = (typeof body.place_id === "string" && body.place_id) ? body.place_id : null;
      // Authorization already enforced above (owner owns + draft/changes_requested; admin) BEFORE any Google call.

      // Owner-added "Something is missing" extras: selected Google place_ids ONLY (never labels/kinds).
      // Validated array, deduped, hard-capped. Absent ⇒ no change.
      if (has(body, "extra_place_ids") && body.extra_place_ids != null && !Array.isArray(body.extra_place_ids)) {
        return errResp("invalid_extra_place_ids", 400);
      }
      const extraIds = Array.isArray(body.extra_place_ids)
        ? [...new Set((body.extra_place_ids as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0))]
        : [];
      if (extraIds.length > MAX_EXTRA_PLACES) return errResp("too_many_extra_places", 400);

      const { place, placeFetchFailed, rg } = await engineResolve(placeId, pin);
      if (rg.status === "transient") {
        return json({ ok: false, property_id: propertyId, resolution_status: "retryable_google", error: { code: "retryable_google" } }, 503);
      }
      // NOTE: the `transient → retryable_google` check above runs BEFORE indiaStatus (which maps
      // transient→"unresolved"), so a provider outage is never mislabeled as india_unresolved.
      const india = indiaStatus(rg);
      const rootCity = chooseRootSettlement(rg.cityResults); // shared deterministic root (preview + commit + factual)
      const factual = mapFactual(rg, rootCity?.display_name ?? null);
      const exact_location = { lat: pin.lat, lng: pin.lng, formatted_address: factual.formatted_address, india_validation: india };

      // India gate FIRST (BOTH modes) — before any building/Street View/candidate work.
      if (india === "outside") return errResp("outside_service_area", 400);
      if (india === "unresolved") {
        return json({ ok: false, property_id: propertyId, exact_location, factual, resolution_status: "india_unresolved", error: { code: "india_unresolved" } }, 200);
      }
      // india === "confirmed" for everything below.

      const building = buildingDecision(place, pin, factual, { placeIdSupplied: !!placeId, placeFetchFailed });
      const svMeta = await streetViewMetadata({ lat: pin.lat, lng: pin.lng });

      // Candidates + READ-ONLY existing-canonical match (no resolver call in preview).
      const cands = classifyCandidates(rg);
      const enriched: EnrichedCandidate[] = [];
      for (const c of cands) {
        const gid = c.provider_place_id ? await existingGeoPlaceId(c.provider_place_id) : null;
        enriched.push({ ...c, geo_place_id: gid });
      }

      // Owner-added extras: FRESH Place Details + taxonomy/plausibility (final rules, never legacy
      // extra_area_id thresholds). Building-eligible/unsupported/outside/too-far are rejected. Same
      // validation in BOTH modes — preview never trusts a prior classification. Safe-parent (root)
      // context for localities is enforced at commit, below.
      type AcceptedExtra = { place: PlaceDetails; kind: "settlement" | "locality" | "road" };
      const acceptedExtras: AcceptedExtra[] = [];
      const rejectedExtras: Array<{ place_id: string; reason: string }> = [];
      for (const eid of extraIds) {
        let ep: PlaceDetails | null = null;
        try { ep = await fetchPlaceDetails(eid); } catch { rejectedExtras.push({ place_id: eid, reason: "not_found" }); continue; }
        const cls = classifyExtraPlace(ep, pin);
        if (!cls.kind) { rejectedExtras.push({ place_id: eid, reason: cls.reason ?? "rejected" }); continue; }
        acceptedExtras.push({ place: ep, kind: cls.kind });
      }
      const settlementExtras = acceptedExtras.filter((e) => e.kind === "settlement");

      // Owner-added extras echoed as recommended discovery (read-only preview; no resolver/write).
      const extraPreviews = acceptedExtras.map((e) => ({
        candidate_key: `${e.kind}:google:${e.place.id}`, geo_place_id: null, kind: e.kind,
        display_name: e.place.displayName ?? "", evidence_type: "owner_added",
        recommendation: "recommended" as const, root_eligible: e.kind === "settlement", source: "owner" as const,
      }));

      if (mode === "use_pin") {
        // Deterministic root (same rule as commit) — never Google array order.
        let root = (rootCity ? enriched.find((c) => c.kind === "settlement" && c.provider_place_id === rootCity.place_id) : null) ?? null;
        let ownerRootPreview: (typeof extraPreviews)[number] | null = null;
        // Missing-root recovery preview: exactly one owner-added settlement may serve as root (rural).
        if (!root && rootCity === null && settlementExtras.length === 1) {
          ownerRootPreview = extraPreviews.find((e) => e.kind === "settlement") ?? null;
        }
        const hasRoot = !!root || !!ownerRootPreview;
        // A locality extra needs a settlement/root context to be persistable — flag if none, and tell
        // the owner why (mirrors the commit-time no_root_context rejection) instead of silently dropping.
        const localityExtrasNeedRoot = !hasRoot && acceptedExtras.some((e) => e.kind === "locality");
        if (localityExtrasNeedRoot) {
          for (const e of acceptedExtras) if (e.kind === "locality") rejectedExtras.push({ place_id: e.place.id, reason: "no_root_context" });
        }
        const rootPreview = root
          ? { candidate_key: root.candidate_key, geo_place_id: root.geo_place_id, kind: root.kind, display_name: root.display_name }
          : ownerRootPreview
          ? { candidate_key: ownerRootPreview.candidate_key, geo_place_id: null, kind: "settlement", display_name: ownerRootPreview.display_name }
          : null;
        // Root-serving owner settlement isn't also an ordinary association; others (localities/roads) are.
        const nonRootExtras = extraPreviews.filter((e) => e !== ownerRootPreview && !(localityExtrasNeedRoot && e.kind === "locality"));
        return json({
          ok: true, property_id: propertyId, exact_location, factual,
          resolution_status: hasRoot ? "complete" : "discovery_incomplete",
          building: { outcome: building.outcome, display_name: building.display_name, source: building.source, provider_place_id: building.provider_place_id },
          discovery: {
            root: rootPreview,
            associations: [...enriched.filter((c) => c.recommendation === "recommended").map(previewAssoc), ...nonRootExtras],
            suggestions: enriched.filter((c) => c.recommendation === "suggestion").map(previewAssoc),
            missing_root: !hasRoot,
            rejected_extras: rejectedExtras,
            ambiguous_root: rootCity === null && settlementExtras.length > 1,
          },
          street_view: { available: svMeta.available, fallback: false, pano_id: svMeta.pano_id },
        });
      }

      // ── commit_pin (WRITE) — india already confirmed above ──
      // Persistable (recommended) vs suggestion-only; selection may only pick within persistable.
      const persistable = enriched.filter((c) => c.recommendation === "recommended");
      const persistableKeys = new Set(persistable.map((c) => c.candidate_key));
      let chosen = persistable;
      if (Array.isArray(body.selected_candidate_keys)) {
        const sel = body.selected_candidate_keys as string[];
        for (const k of sel) if (!persistableKeys.has(k)) return errResp("invalid_candidate_selection", 400);
        chosen = persistable.filter((c) => sel.includes(c.candidate_key));
      }

      // Canonicalize (resolver). Settlement-FIRST so localities can be parented to the Reeve UUID.
      // Catch ONLY expected resolver conflicts → suggestion; other errors fail the whole commit.
      const resolvedAssoc: Array<{ geo_place_id: string; kind: string; evidence_type: string; source: "system" | "owner" }> = [];
      const conflictSuggestions: EnrichedCandidate[] = [];
      let rootSettlementGeoPlaceId: string | null = null;
      // rootCity computed once in the shared block above (same deterministic rule as preview).

      // Dedupe is by canonical geo_place_id: a first write wins, so an owner extra resolving to an
      // already-present SYSTEM candidate keeps the system row (source stays 'system').
      const tryResolve = async (
        c: EnrichedCandidate,
        opts?: { parentGeoPlaceId?: string | null; anchorLat?: number; anchorLng?: number; anchorQuality?: string },
        source: "system" | "owner" = "system",
      ): Promise<string | null> => {
        let gid: string;
        try { gid = await resolveCanonical(c, opts); }
        catch (e) {
          const msg = (e as Error).message;
          if (isExpectedCanonicalResolutionConflict(msg)) { conflictSuggestions.push(c); return null; }
          throw e;
        }
        const gp = await loadGeoPlace(gid);
        const kind = gp?.kind ?? c.kind;
        if (!resolvedAssoc.some((a) => a.geo_place_id === gid)) resolvedAssoc.push({ geo_place_id: gid, kind, evidence_type: c.evidence_type, source });
        if (gp?.kind === "settlement" && gp.search_region_id) { // curated (not proximity) search_region
          const sr = await loadGeoPlace(gp.search_region_id);
          if (sr?.kind === "search_region" && !resolvedAssoc.some((a) => a.geo_place_id === sr.id)) {
            resolvedAssoc.push({ geo_place_id: sr.id, kind: "search_region", evidence_type: "curated_search_region", source: "system" });
          }
        }
        return gid;
      };

      try {
        // 1) settlements first — root is ONLY the deterministic chooseRootSettlement pick (no auto-promotion).
        for (const s of chosen.filter((c) => c.kind === "settlement")) {
          const gid = await tryResolve(s);
          if (gid && rootCity && s.provider_place_id === rootCity.place_id) rootSettlementGeoPlaceId = gid;
        }
        // If the deterministic root wasn't resolved/selected, rootSettlementGeoPlaceId stays null
        // → provider-less locality skipped, missing_root, no other settlement promoted to primary.
        // 2) localities + roads
        for (const c of chosen.filter((x) => x.kind !== "settlement")) {
          if (c.kind === "locality" && c.provider === null) {
            if (!rootSettlementGeoPlaceId) continue; // provider-less locality needs a settlement root
            await tryResolve(c, { parentGeoPlaceId: rootSettlementGeoPlaceId, anchorLat: pin.lat, anchorLng: pin.lng, anchorQuality: "verified_point" });
          } else if (c.kind === "locality") {
            await tryResolve(c, { parentGeoPlaceId: rootSettlementGeoPlaceId ?? undefined });
          } else {
            await tryResolve(c); // road (or other) — no forced settlement parent
          }
        }
      } catch (e) {
        console.error("resolve_canonical error", (e as Error).message);
        return errResp("save_failed", 500);
      }

      // ── Owner-added extras (Something is missing) — resolved with FINAL context rules ──
      // Provenance: source='owner', evidence_type='owner_added'. A locality REQUIRES a settlement/root
      // context (parented + verified_point anchor) — never a parentless/collapsed locality; without a
      // safe root it is rejected. Missing-root recovery: when the pin yielded NO deterministic settlement
      // (rootCity===null) and exactly one owner-added settlement exists, it becomes the primary root.
      const resolveExtra = async (
        e: AcceptedExtra,
        opts?: { parentGeoPlaceId?: string | null; anchorLat?: number; anchorLng?: number; anchorQuality?: string },
      ): Promise<string | null> => {
        const ec: EnrichedCandidate = {
          candidate_key: `${e.kind}:google:${e.place.id}`, kind: e.kind, display_name: e.place.displayName ?? "",
          provider: "google", provider_place_id: e.place.id, evidence_type: "owner_added",
          recommendation: "recommended", root_eligible: e.kind === "settlement", geo_place_id: null,
        };
        return await tryResolve(ec, opts, "owner");
      };
      try {
        const localityExtras = acceptedExtras.filter((e) => e.kind === "locality");
        const roadExtras = acceptedExtras.filter((e) => e.kind === "road");
        // Settlements: missing-root recovery (exactly one, no deterministic root) → primary root; else plain associations.
        if (!rootSettlementGeoPlaceId && rootCity === null && settlementExtras.length === 1) {
          const gid = await resolveExtra(settlementExtras[0]);
          if (gid) rootSettlementGeoPlaceId = gid;
        } else {
          for (const s of settlementExtras) await resolveExtra(s); // >1, or a deterministic root already exists → non-root
        }
        // Localities need a safe settlement/root context; reject (skip) when none.
        for (const l of localityExtras) {
          if (!rootSettlementGeoPlaceId) { rejectedExtras.push({ place_id: l.place.id, reason: "no_root_context" }); continue; }
          await resolveExtra(l, { parentGeoPlaceId: rootSettlementGeoPlaceId, anchorLat: pin.lat, anchorLng: pin.lng, anchorQuality: "verified_point" });
        }
        // Roads: unchanged Phase-2 behavior — no forced settlement parent.
        for (const r of roadExtras) await resolveExtra(r);
      } catch (e) {
        console.error("resolve_canonical extra error", (e as Error).message);
        return errResp("save_failed", 500);
      }

      // Root = the resolved deterministic settlement; a curated search_region may root ONLY when there was
      // no settlement candidate at all (rootCity===null). If rootCity existed but wasn't resolved/selected
      // → no root (missing_root), never auto-promote another settlement.
      const rootAssoc = rootSettlementGeoPlaceId
        ? (resolvedAssoc.find((a) => a.geo_place_id === rootSettlementGeoPlaceId) ?? null)
        : (rootCity ? null : (resolvedAssoc.find((a) => a.kind === "search_region") ?? null));
      const finalAssociations = buildFinalAssociations(resolvedAssoc, rootAssoc?.geo_place_id ?? null);

      const bi = computeBuildingIntent(
        { building_name: prop.building_name, building_name_source: prop.building_name_source, place_id: prop.place_id },
        place, body.building_choice as ("keep" | "clear" | "set" | undefined),
        body.building_name as (string | null | undefined), actor,
      );

      // Street View: final-pin first; SAME-building fallback revalidates the stored pano.
      let sv = { available: svMeta.available, pano_id: svMeta.pano_id, fallback: false };
      if (!svMeta.available && building.outcome === "SAME" && prop.streetview_pano_id) {
        const rev = await streetViewMetadata({ panoId: prop.streetview_pano_id });
        if (rev.available) sv = { available: true, pano_id: prop.streetview_pano_id, fallback: true };
      }

      const hasBuildingPlace = !!bi.place_id;
      const p_location = {
        latitude: pin.lat, longitude: pin.lng, country_code: "IN",
        country: factual.country, state: factual.state, district: factual.district, pincode: factual.pincode,
        city: factual.city, locality: factual.locality, sublocality_1: factual.sublocality_1, sublocality_2: factual.sublocality_2,
        neighborhood: factual.neighborhood, route: factual.route, street_number: factual.street_number,
        street_address: factual.street_address, formatted_address: factual.formatted_address, plus_code: factual.plus_code,
        building_name: bi.building_name, building_name_source: bi.building_name_source, place_id: bi.place_id,
        viewport_ne_lat: hasBuildingPlace && place?.viewport ? place.viewport.ne.lat : null,
        viewport_ne_lng: hasBuildingPlace && place?.viewport ? place.viewport.ne.lng : null,
        viewport_sw_lat: hasBuildingPlace && place?.viewport ? place.viewport.sw.lat : null,
        viewport_sw_lng: hasBuildingPlace && place?.viewport ? place.viewport.sw.lng : null,
      };

      const ar = await srRpc("apply_final_property_location", {
        p_property_id: propertyId, p_actor_user_id: user.id, p_actor_type: actor,
        p_location, p_final_associations: finalAssociations, p_streetview: { available: sv.available, pano_id: sv.pano_id },
      });
      if (!ar.ok) { console.error("apply_final_property_location failed", await ar.text()); return errResp("save_failed", 500); }

      return json({
        ok: true, property_id: propertyId, exact_location, factual,
        resolution_status: rootAssoc ? "complete" : "discovery_incomplete",
        building: { outcome: building.outcome, display_name: bi.building_name, source: bi.building_name_source, provider_place_id: bi.place_id },
        discovery: {
          root: rootAssoc ? { geo_place_id: rootAssoc.geo_place_id, kind: rootAssoc.kind } : null,
          associations: finalAssociations,
          suggestions: [...enriched.filter((c) => c.recommendation === "suggestion"), ...conflictSuggestions].map(previewAssoc),
          missing_root: !rootAssoc,
          rejected_extras: rejectedExtras,
        },
        street_view: { available: sv.available, fallback: sv.fallback, pano_id: sv.pano_id },
      });
    }

    // ── Owner Discovery confirmation — thin trusted wrapper over the service-role lifecycle RPC ──
    if (mode === "confirm_discovery") {
      // Actor is server-derived; owner-only in Prompt 2 (admin finalize is Prompt 3). Ownership +
      // draft/changes_requested lifecycle already enforced in the shared authz block above.
      if (actor !== "owner") return errResp("forbidden", 403);
      const r = await srRpc("confirm_property_discovery_geography", { p_property_id: propertyId });
      if (!r.ok) {
        const t = await r.text();
        console.error("confirm_discovery failed", t);
        // _assert_final_discovery_valid failed (no valid root / pin not confirmed) vs other DB error.
        return errResp("discovery_not_ready", 409);
      }
      return json({ ok: true, property_id: propertyId, confirmed: true });
    }

    // ── Admin Discovery correction (trusted; admin-only). Follows the existing admin edit flow —
    // no new status gate. The trusted engine remains the sole writer of canonical discovery. ──
    if (mode === "admin_update_discovery") {
      if (actor !== "admin") return errResp("forbidden", 403);
      const uniqStr = (v: unknown): string[] =>
        Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0))] : [];
      const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
      const keepIds = uniqStr(body.keep_geo_place_ids);
      const addIds = uniqStr(body.add_geo_place_ids);
      const extraIds = uniqStr(body.extra_place_ids);
      if (addIds.length + extraIds.length > MAX_EXTRA_PLACES) return errResp("too_many_additions", 400);
      const rootGeoPlaceId = strOrNull(body.root_geo_place_id);
      const rootExtraPlaceId = strOrNull(body.root_extra_place_id);

      // Property pin (required for plausibility).
      const prRes = await srSelect(`properties?id=eq.${propertyId}&select=latitude,longitude`);
      const prRow = prRes.ok ? (await prRes.json())?.[0] : null;
      if (!prRow || prRow.latitude == null || prRow.longitude == null) return errResp("no_pin", 400);
      const pin: LatLng = { lat: prRow.latitude, lng: prRow.longitude };

      // Current associations (with kind) — the only source of kept provenance.
      const curRes = await srSelect(
        `property_geo_associations?property_id=eq.${propertyId}&select=geo_place_id,is_primary,source,evidence_type,geo_places(kind)`,
      );
      if (!curRes.ok) return errResp("save_failed", 500);
      const current = ((await curRes.json()) as Array<Record<string, unknown>>).map((r) => ({
        geo_place_id: r.geo_place_id as string,
        kind: (r.geo_places as { kind?: string } | null)?.kind ?? "",
        source: (r.source as string) ?? "system",
        evidence_type: (r.evidence_type as string) ?? "",
        is_primary: r.is_primary === true,
      }));
      const currentIds = new Set(current.map((c) => c.geo_place_id));
      // keep must reference currently-associated rows (server-verified; browser can't import arbitrary rows).
      for (const id of keepIds) if (!currentIds.has(id)) return errResp("not_kept", 400);

      const buildAdminEC = (place: PlaceDetails, kind: FinalKind): EnrichedCandidate => ({
        candidate_key: `${kind}:google:${place.id}`, kind, display_name: place.displayName ?? "",
        provider: "google", provider_place_id: place.id, evidence_type: "admin_override",
        recommendation: "recommended", root_eligible: kind === "settlement", geo_place_id: null,
      });

      try {
        const adds: AdminAddInput[] = [];
        const settlementUUIDs: string[] = [];          // resulting settlements (kept + added) → locality parent + SR context
        const contextSRIds = new Set<string>();        // search_region_ids of resulting settlements/localities
        // seed settlement context from kept rows + load their search_region_ids in one batch
        const keptContextIds = keepIds.filter((id) => {
          const c = current.find((x) => x.geo_place_id === id);
          return c && (c.kind === "settlement" || c.kind === "locality");
        });
        for (const id of keepIds) {
          const c = current.find((x) => x.geo_place_id === id);
          if (c?.kind === "settlement") settlementUUIDs.push(id);
        }
        const batchIds = [...new Set([...keptContextIds, ...addIds])];
        const gpById = new Map<string, { kind: string; search_region_id: string | null; center_lat: number | null; center_lng: number | null }>();
        if (batchIds.length) {
          const gr = await srSelect(`geo_places?id=in.(${batchIds.join(",")})&select=id,kind,search_region_id,center_lat,center_lng`);
          if (gr.ok) for (const g of (await gr.json()) as Array<Record<string, unknown>>) {
            gpById.set(g.id as string, { kind: g.kind as string, search_region_id: (g.search_region_id as string) ?? null, center_lat: (g.center_lat as number) ?? null, center_lng: (g.center_lng as number) ?? null });
          }
        }
        for (const id of keptContextIds) { const sr = gpById.get(id)?.search_region_id; if (sr) contextSRIds.add(sr); }

        // Existing-canonical additions: validate final kind + plausibility; search_region deferred.
        const pendingSR: string[] = [];
        for (const id of addIds) {
          const gp = gpById.get(id);
          if (!gp || !["search_region", "settlement", "locality", "road"].includes(gp.kind)) return errResp("invalid_add", 400);
          if (gp.kind === "search_region") { pendingSR.push(id); continue; }
          if (gp.center_lat == null || gp.center_lng == null) return errResp("invalid_add", 400);
          const maxM = gp.kind === "settlement" ? 25000 : 5000;
          if (haversine(pin, { lat: gp.center_lat, lng: gp.center_lng }) > maxM) return errResp("implausible_add", 400);
          adds.push({ geo_place_id: id, kind: gp.kind });
          if (gp.kind === "settlement") { settlementUUIDs.push(id); if (gp.search_region_id) contextSRIds.add(gp.search_region_id); }
          if (gp.kind === "locality" && gp.search_region_id) contextSRIds.add(gp.search_region_id);
        }

        // Google "Something is missing" extras — fresh Place Details + classify + canonical resolve.
        const classified: Array<{ place: PlaceDetails; kind: FinalKind }> = [];
        for (const eid of extraIds) {
          let ep: PlaceDetails | null = null;
          try { ep = await fetchPlaceDetails(eid); } catch { return errResp("implausible_add", 400); }
          const cls = classifyExtraPlace(ep, pin);
          if (!cls.kind) return errResp("implausible_add", 400);
          classified.push({ place: ep, kind: cls.kind });
        }
        // settlements first (so localities can parent to a resulting settlement UUID)
        for (const e of classified.filter((x) => x.kind === "settlement")) {
          const gid = await resolveCanonical(buildAdminEC(e.place, "settlement"));
          adds.push({ geo_place_id: gid, kind: "settlement" }); settlementUUIDs.push(gid);
        }
        const settlementParent = settlementUUIDs[0] ?? null;
        for (const e of classified.filter((x) => x.kind === "locality")) {
          if (!settlementParent) return errResp("locality_no_context", 400);
          const gid = await resolveCanonical(buildAdminEC(e.place, "locality"), { parentGeoPlaceId: settlementParent, anchorLat: pin.lat, anchorLng: pin.lng, anchorQuality: "verified_point" });
          adds.push({ geo_place_id: gid, kind: "locality" });
        }
        for (const e of classified.filter((x) => x.kind === "road")) {
          const gid = await resolveCanonical(buildAdminEC(e.place, "road"));
          adds.push({ geo_place_id: gid, kind: "road" });
        }

        // search_region additions: allowed only if already associated OR the curated SR of a kept/added settlement/locality.
        for (const id of pendingSR) {
          if (!currentIds.has(id) && !contextSRIds.has(id)) return errResp("invalid_search_region", 400);
          adds.push({ geo_place_id: id, kind: "search_region" });
        }

        // Explicit root: prefer root_geo_place_id; else resolve root_extra_place_id (must be a settlement) into the set.
        let finalRootId: string | null = rootGeoPlaceId;
        if (!finalRootId && rootExtraPlaceId) {
          let rep: PlaceDetails | null = null;
          try { rep = await fetchPlaceDetails(rootExtraPlaceId); } catch { return errResp("invalid_root", 400); }
          const rcls = classifyExtraPlace(rep, pin);
          if (rcls.kind !== "settlement") return errResp("invalid_root", 400);
          const gid = await resolveCanonical(buildAdminEC(rep, "settlement"));
          if (!adds.some((a) => a.geo_place_id === gid) && !keepIds.includes(gid)) adds.push({ geo_place_id: gid, kind: "settlement" });
          finalRootId = gid;
        }

        const decision = resolveAdminDiscovery({ current, keepIds, adds, rootGeoPlaceId: finalRootId });
        if ("error" in decision) return errResp(decision.error, 400);

        const rr = await srRpc("replace_property_discovery_geography", { p_property_id: propertyId, p_associations: decision.payload });
        if (!rr.ok) { console.error("admin_update_discovery replace failed", await rr.text()); return errResp("save_failed", 500); }
        return json({ ok: true, property_id: propertyId, updated: true });
      } catch (e) {
        console.error("admin_update_discovery error", (e as Error).message);
        return errResp("save_failed", 500);
      }
    }

    // ── Admin Discovery finalization — thin wrapper over the service-role RPC (no status gate). ──
    if (mode === "finalize_discovery") {
      if (actor !== "admin") return errResp("forbidden", 403);
      const r = await srRpc("finalize_property_discovery_geography", { p_property_id: propertyId });
      if (!r.ok) {
        const t = await r.text();
        console.error("finalize_discovery failed", t);
        const code = /exact location not confirmed/.test(t) ? "location_not_confirmed"
          : /exactly one primary|primary association must/.test(t) ? "root_required"
          : /all-final|at least one association/.test(t) ? "discovery_incomplete"
          : "finalize_failed";
        return errResp(code, 409);
      }
      return json({ ok: true, property_id: propertyId, finalized: true });
    }

    return errResp("bad_mode", 400);
  } catch (e) {
    console.error("unhandled", (e as Error).message);
    return errResp("google_unavailable", 503);
  }
});
