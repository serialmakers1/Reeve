// Pure, dependency-light resolution logic for the Phase-2 location engine.
// NO Deno / Google / DB I/O here — unit-testable with vitest fixtures.
// index.ts performs all network/DB work and feeds these deterministic helpers.

import { isCanonicalCityType } from "./geoClassify.ts";
import type { FinalPinResolution, PlaceDetails, LatLng } from "./types.ts";

export type BuildingOutcome = "SAME" | "UNCERTAIN" | "CONFLICT" | "NOT_APPLICABLE";
export type IndiaStatus = "confirmed" | "outside" | "unresolved";
export type FinalKind = "search_region" | "settlement" | "locality" | "road";

// Credible building/property place types (mirror index.ts BUILDING_TYPES) — a verified
// Google displayName may become a building name ONLY for these; geographic-only → NOT_APPLICABLE.
const BUILDING_TYPES = new Set(["premise", "subpremise", "establishment", "point_of_interest"]);
const GEOGRAPHIC_ONLY = new Set([
  "locality", "sublocality", "sublocality_level_1", "sublocality_level_2", "neighborhood",
  "colloquial_area", "route", "street_address", "street_number", "intersection",
  "postal_code", "postal_town", "administrative_area_level_1", "administrative_area_level_2",
  "administrative_area_level_3", "country", "political", "plus_code",
]);
export function isCredibleBuilding(p: PlaceDetails | null): boolean {
  if (!p || !p.displayName) return false;
  const t = p.types ?? [];
  if (t.length === 0) return false;
  return t.some((x) => BUILDING_TYPES.has(x)) && t.some((x) => !GEOGRAPHIC_ONLY.has(x));
}

// Building plausibility constants (deterministic, type-tunable — no scoring/ML).
const SAME_MAX_M = 150;       // small correction still SAME when address consistent
const UNCERTAIN_MAX_M = 750;  // beyond this + inconsistency → CONFLICT

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
function inViewport(pin: LatLng, p: PlaceDetails, pad = 0.005): boolean {
  const v = p.viewport;
  if (!v) return false;
  return pin.lat >= v.sw.lat - pad && pin.lat <= v.ne.lat + pad &&
         pin.lng >= v.sw.lng - pad && pin.lng <= v.ne.lng + pad;
}

export interface FactualAddress {
  country: string | null; country_code: string | null; state: string | null; district: string | null;
  pincode: string | null; city: string | null; locality: string | null;
  sublocality_1: string | null; sublocality_2: string | null; neighborhood: string | null;
  route: string | null; street_number: string | null; street_address: string | null;
  formatted_address: string | null; plus_code: string | null;
}

const nn = (s: string | undefined | null): string | null => {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
};

/** Deterministic Indian factual mapping from the final-pin reverse geocode (rural-tolerant).
 *  `rootDisplayName` = the deterministically chosen settlement (chooseRootSettlement) display name;
 *  city falls back to it (NOT to arbitrary cityResults[0] order), else stays null (don't fabricate). */
export function mapFactual(rg: FinalPinResolution, rootDisplayName?: string | null): FactualAddress {
  const long = (t: string) => nn(rg.components.find((c) => c.types.includes(t))?.long_name);
  const short = (t: string) => nn(rg.components.find((c) => c.types.includes(t))?.short_name);
  const route = long("route");
  const street_number = long("street_number");
  const sublocality_1 = long("sublocality_level_1");
  const sublocality_2 = long("sublocality_level_2");
  const neighborhood = long("neighborhood");
  const city = long("locality") ?? nn(rootDisplayName);
  const street_address = [street_number, route].filter(Boolean).join(" ").trim() || route || null;
  return {
    country: long("country"), country_code: short("country"),
    state: long("administrative_area_level_1"), district: long("administrative_area_level_2"),
    pincode: long("postal_code"), city,
    locality: sublocality_1 ?? neighborhood ?? sublocality_2,
    sublocality_1, sublocality_2, neighborhood,
    route, street_number, street_address,
    formatted_address: nn(rg.formatted_address), plus_code: nn(rg.plus_code),
  };
}

/** India status from the final-pin reverse geocode (caller handles `transient` before calling). */
export function indiaStatus(rg: FinalPinResolution): IndiaStatus {
  if (rg.status !== "ok") return "unresolved"; // zero_results / transient → unresolved (never "outside")
  const cc = (rg.country ?? "").toUpperCase();
  if (!cc) return "unresolved";
  return cc === "IN" ? "confirmed" : "outside";
}

export function candidateKey(kind: FinalKind, providerPlaceId: string | null, normalizedName?: string): string {
  return providerPlaceId ? `${kind}:google:${providerPlaceId}` : `${kind}:name:${(normalizedName ?? "").toLowerCase()}`;
}

const normLoc = (s: string | null | undefined): string => (s ?? "").trim().toLowerCase();

export interface CityResult { place_id: string; display_name: string; types: string[] }

/**
 * ONE shared deterministic root-settlement rule (used by BOTH preview and commit) — operates on
 * the raw reverse-geocode cityResults (which carry Google `types`) so a different Google result
 * ORDER across the two independent calls can never shift the chosen root. Prefer a `locality`-typed
 * result over `administrative_area_level_3`; stable tie-break on provider place_id (never array order).
 * Returns the chosen cityResult (its `place_id` is a GOOGLE id — the Reeve UUID comes from the resolver).
 */
export function chooseRootSettlement(cityResults: CityResult[]): CityResult | null {
  const canon = (cityResults ?? []).filter((c) => isCanonicalCityType(c.types));
  if (canon.length === 0) return null;
  const rank = (c: CityResult) => (c.types.includes("locality") ? 0 : 1);
  return [...canon].sort((a, b) => rank(a) - rank(b) || (a.place_id < b.place_id ? -1 : a.place_id > b.place_id ? 1 : 0))[0];
}

export interface PreviewCandidate {
  candidate_key: string;
  kind: FinalKind;
  display_name: string;
  provider: "google" | null;
  provider_place_id: string | null;
  evidence_type: string;
  recommendation: "recommended" | "suggestion";
  root_eligible: boolean;
}

/**
 * Classify canonical/discovery candidates from the final-pin reverse geocode.
 * Recommended (persistable): canonical-city settlements, WITHIN descriptor localities, legitimate route.
 * Suggestion-only: OUTSKIRTS descriptor areas. NEAR + non-canonical-city results are excluded.
 * Search Region is NEVER derived here (curated only, added server-side from settlement.search_region_id).
 */
export function classifyCandidates(rg: FinalPinResolution): PreviewCandidate[] {
  const out: PreviewCandidate[] = [];
  const seen = new Set<string>();
  const push = (c: PreviewCandidate) => { if (!seen.has(c.candidate_key)) { seen.add(c.candidate_key); out.push(c); } };

  // Settlements — only canonical-city typed reverse-geocode results.
  for (const cr of rg.cityResults) {
    if (!isCanonicalCityType(cr.types)) continue;
    push({
      candidate_key: candidateKey("settlement", cr.place_id), kind: "settlement",
      display_name: cr.display_name || "", provider: "google", provider_place_id: cr.place_id,
      evidence_type: "provider_address", recommendation: "recommended", root_eligible: true,
    });
  }
  // Localities — Address Descriptor areas (with place_id). WITHIN = recommended, OUTSKIRTS = suggestion.
  for (const a of rg.areas) {
    if (a.containment === "NEAR") continue;
    push({
      candidate_key: candidateKey("locality", a.place_id), kind: "locality",
      display_name: a.display_name || "", provider: "google", provider_place_id: a.place_id,
      evidence_type: "provider_descriptor",
      recommendation: a.containment === "WITHIN" ? "recommended" : "suggestion", root_eligible: false,
    });
  }
  // Road — legitimate route result with a place_id.
  if (rg.routeCandidate) {
    push({
      candidate_key: candidateKey("road", rg.routeCandidate.place_id), kind: "road",
      display_name: rg.routeCandidate.display_name || "", provider: "google",
      provider_place_id: rg.routeCandidate.place_id, evidence_type: "provider_route",
      recommendation: "recommended", root_eligible: false,
    });
  }

  // Provider-less locality from factual sublocality/neighborhood (Google may omit descriptor areas).
  const comp = (t: string) => normLoc(rg.components.find((c) => c.types.includes(t))?.long_name);
  const localityName = comp("sublocality_level_1") || comp("neighborhood") || comp("sublocality_level_2");
  if (localityName) {
    const root = chooseRootSettlement(rg.cityResults);
    const existing = out.find((c) => c.kind === "locality" && normLoc(c.display_name) === localityName);
    if (existing && existing.recommendation === "recommended") {
      // a WITHIN descriptor locality already covers it — keep it, add nothing.
    } else if (existing) {
      // only a suggestion-only (OUTSKIRTS) descriptor exists + factual corroborates → upgrade, don't duplicate.
      existing.recommendation = "recommended";
    } else {
      // No settlement root ⇒ provider-less locality would be globally ambiguous → suggestion-only (never persisted).
      const anchor = root?.place_id ?? "";
      push({
        candidate_key: `locality:name:${anchor}:${localityName}`, kind: "locality",
        display_name: rg.components.find((c) => c.types.includes("sublocality_level_1"))?.long_name
          ?? rg.components.find((c) => c.types.includes("neighborhood"))?.long_name
          ?? rg.components.find((c) => c.types.includes("sublocality_level_2"))?.long_name ?? localityName,
        provider: null, provider_place_id: null, evidence_type: "provider_address",
        recommendation: root ? "recommended" : "suggestion", root_eligible: false,
      });
    }
  }
  return out;
}

/** Final association array from resolved candidates; is_primary only on the chosen root geo_place.
 *  `source` is per-entry: system recommendations stay 'system'; owner-added extras carry 'owner'
 *  (default 'system' keeps the system-recommendation path unchanged). */
export function buildFinalAssociations(
  resolved: Array<{ geo_place_id: string; evidence_type: string; source?: "system" | "owner" }>,
  rootGeoPlaceId: string | null,
): Array<{ geo_place_id: string; is_primary: boolean; source: "system" | "owner"; evidence_type: string }> {
  return resolved.map((a) => ({
    geo_place_id: a.geo_place_id,
    is_primary: !!rootGeoPlaceId && a.geo_place_id === rootGeoPlaceId,
    source: a.source ?? "system",
    evidence_type: a.evidence_type,
  }));
}

// ── Owner-added extra geography (Prompt 3 P2) ──────────────────────────────────
// A "Something is missing" extra is an owner-selected Google Place ID. It is classified into the
// FINAL taxonomy (settlement | locality | road) and gated here. These thresholds MIRROR the canonical
// resolver's kind-scoped proximity safety net in `resolve_canonical_geo_place` (settlement 25 km,
// locality/road 5 km; search_region ungated / not owner-addable) — a single source, NOT an independent
// rule. Distance is ONLY a safety gate — taxonomy must match AND (for a locality) a safe settlement/root
// context must exist at commit (enforced in index.ts). Phase 1/2 prevents same-name localities under
// different settlements from collapsing, so a parentless locality is never acceptable.
export const EXTRA_PLAUSIBILITY_MAX_M: Record<Exclude<FinalKind, "search_region">, number> = {
  settlement: 25000,
  locality: 5000,
  road: 5000,
};

export type ExtraRejectReason =
  | "no_location" | "outside_india" | "building_not_geography" | "unsupported_type" | "implausible_distance";

export interface ExtraClassification { kind: Exclude<FinalKind, "search_region"> | null; reason?: ExtraRejectReason }

/**
 * Classify an owner-selected extra Place into the FINAL taxonomy (settlement | locality | road) or
 * reject. Building-eligible or non-geographic results are rejected (extras are Discovery Geography,
 * never building/provider evidence — those flow only through the building path). `search_region` is
 * never owner-addable. Distance plausibility (vs the exact pin) is a final-model guard, not sufficient
 * on its own. Pure — index.ts fetches Place Details and applies context/parent rules on top.
 */
export function classifyExtraPlace(p: PlaceDetails | null, pin: LatLng): ExtraClassification {
  if (!p || !p.location) return { kind: null, reason: "no_location" };
  const country = (nn(p.addressComponents.find((c) => c.types.includes("country"))?.shortText) ?? "").toUpperCase();
  if (country !== "IN") return { kind: null, reason: "outside_india" };
  // Building-eligible → reject: an owner cannot inject a building as geography.
  if (isCredibleBuilding(p)) return { kind: null, reason: "building_not_geography" };

  const types = p.types ?? [];
  let kind: Exclude<FinalKind, "search_region"> | null = null;
  if (isCanonicalCityType(types)) kind = "settlement";
  else if (types.includes("route")) kind = "road";
  else if (types.some((t) => t.startsWith("sublocality") || t === "neighborhood" || t === "colloquial_area")) kind = "locality";
  else return { kind: null, reason: "unsupported_type" }; // admin_area_1/2, country, postal_code, plus_code, …

  if (haversine(pin, p.location) > EXTRA_PLAUSIBILITY_MAX_M[kind]) return { kind: null, reason: "implausible_distance" };
  return { kind };
}

// ── Admin Discovery correction (Prompt 3) ──────────────────────────────────────
// Pure decision for admin_update_discovery: given the current associations, the admin's kept UUIDs,
// resolved additions (existing canonical + validated Google extras, all canonicalized upstream), and an
// optional resolved root, build the final association payload for replace_property_discovery_geography.
// index.ts does all I/O (DB reads, Place Details, resolver, search_region-context checks) before calling.
export type AdminDiscoveryError =
  | "not_kept" | "empty_result" | "invalid_kind" | "locality_no_context" | "root_required" | "invalid_root";

export interface AdminAssocInput { geo_place_id: string; kind: string; source: string; evidence_type: string; is_primary?: boolean }
export interface AdminAddInput { geo_place_id: string; kind: string }
export interface AdminFinalAssoc { geo_place_id: string; is_primary: boolean; source: string; evidence_type: string }

const FINAL_KINDS = new Set<string>(["search_region", "settlement", "locality", "road"]);
const ROOT_KINDS = new Set<string>(["search_region", "settlement"]);

export function resolveAdminDiscovery(args: {
  current: AdminAssocInput[];
  keepIds: string[];
  adds: AdminAddInput[];
  rootGeoPlaceId?: string | null;
}): { payload: AdminFinalAssoc[] } | { error: AdminDiscoveryError } {
  const currentById = new Map(args.current.map((c) => [c.geo_place_id, c]));
  const seen = new Set<string>();
  const kindOfId = new Map<string, string>();
  const result: AdminFinalAssoc[] = [];

  // 1) Kept rows — must currently be associated; preserve their source/evidence provenance verbatim.
  for (const id of args.keepIds) {
    const cur = currentById.get(id);
    if (!cur) return { error: "not_kept" };
    if (!FINAL_KINDS.has(cur.kind)) return { error: "invalid_kind" };
    if (seen.has(id)) continue;
    seen.add(id);
    kindOfId.set(id, cur.kind);
    result.push({ geo_place_id: id, is_primary: false, source: cur.source, evidence_type: cur.evidence_type });
  }

  // 2) Added rows — admin provenance; dedup against kept + each other (kept wins).
  for (const a of args.adds) {
    if (!FINAL_KINDS.has(a.kind)) return { error: "invalid_kind" };
    if (seen.has(a.geo_place_id)) continue;
    seen.add(a.geo_place_id);
    kindOfId.set(a.geo_place_id, a.kind);
    result.push({ geo_place_id: a.geo_place_id, is_primary: false, source: "admin", evidence_type: "admin_override" });
  }

  if (result.length === 0) return { error: "empty_result" };
  const kindOf = (id: string) => kindOfId.get(id) ?? "";

  // 3) Locality safe-context: any resulting locality requires a settlement/search_region in the set.
  const hasRootKind = result.some((r) => ROOT_KINDS.has(kindOf(r.geo_place_id)));
  if (result.some((r) => kindOf(r.geo_place_id) === "locality") && !hasRootKind) return { error: "locality_no_context" };

  // 4) Exactly one primary (settlement/search_region). Explicit root must be in the set; else preserve
  //    the current primary if it survives; never silently guess a different root.
  let chosen: string | null = null;
  if (args.rootGeoPlaceId != null) {
    if (!result.some((r) => r.geo_place_id === args.rootGeoPlaceId) || !ROOT_KINDS.has(kindOf(args.rootGeoPlaceId))) {
      return { error: "invalid_root" };
    }
    chosen = args.rootGeoPlaceId;
  } else {
    const curPrimary = args.current.find((c) => c.is_primary)?.geo_place_id ?? null;
    if (curPrimary && result.some((r) => r.geo_place_id === curPrimary) && ROOT_KINDS.has(kindOf(curPrimary))) {
      chosen = curPrimary;
    } else {
      return { error: "root_required" };
    }
  }

  return { payload: result.map((r) => ({ ...r, is_primary: r.geo_place_id === chosen })) };
}

/**
 * Server-derived building intent (pure). Admin-provenance protection is ALSO enforced in the DB RPC;
 * `address_mode` is derived in the RPC (not here). Owner never emits source 'google'/'admin' from input —
 * a 'google' intent only arises from a server-verified credible building.
 */
export function computeBuildingIntent(
  existing: { building_name: string | null; building_name_source: string | null; place_id: string | null },
  place: PlaceDetails | null,
  choice: "keep" | "clear" | "set" | undefined,
  buildingNameInput: string | null | undefined,
  actor: "owner" | "admin",
): { building_name: string | null; building_name_source: string | null; place_id: string | null } {
  const c = choice ?? "keep";
  // Admin-protection FIRST: an owner can never change/clear an admin-sourced building identity
  // (mirrors the DB protection so the returned intent and the persisted row can never disagree).
  if (existing.building_name_source === "admin" && actor === "owner") return { ...existing };
  if (c === "clear") return { building_name: null, building_name_source: null, place_id: null };
  if (c === "set") {
    const name = (buildingNameInput ?? "").trim();
    // place_id precedence:
    //  - Admin set WITH a freshly server-verified credible building → replace old evidence with the new id.
    //  - Otherwise retain existing provider evidence; else adopt the fresh credible building's id
    //    (so an owner/admin name correction on a NEW Google building doesn't lose it → manual).
    const place_id = (actor === "admin" && isCredibleBuilding(place))
      ? (place as PlaceDetails).id
      : (existing.place_id ?? (isCredibleBuilding(place) ? (place as PlaceDetails).id : null));
    return {
      building_name: name || null,
      building_name_source: name ? (actor === "admin" ? "admin" : "owner") : null,
      place_id,
    };
  }
  // keep / absent — preserve existing provenance; adopt credible Google only on a fresh (null-provenance) property.
  if (existing.building_name_source) return { ...existing };
  if (isCredibleBuilding(place)) {
    return { building_name: (place as PlaceDetails).displayName, building_name_source: "google", place_id: (place as PlaceDetails).id };
  }
  return { ...existing };
}

export interface BuildingEvidence {
  outcome: BuildingOutcome;
  display_name: string | null;
  source: "google" | null;
  provider_place_id: string | null;
}

/**
 * Building SAME/UNCERTAIN/CONFLICT/NOT_APPLICABLE from the FINAL pin vs the selected Place.
 * A verified Google displayName is only a building when the Place types are a credible building.
 * `placeFetchFailed`=true (Place Details unavailable) → UNCERTAIN reduced-evidence when a place_id was supplied.
 */
export function buildingDecision(
  place: PlaceDetails | null,
  pin: LatLng,
  factual: FactualAddress,
  opts?: { placeIdSupplied?: boolean; placeFetchFailed?: boolean },
): BuildingEvidence {
  if (opts?.placeFetchFailed && opts?.placeIdSupplied) {
    return { outcome: "UNCERTAIN", display_name: null, source: null, provider_place_id: null };
  }
  if (!isCredibleBuilding(place)) {
    return { outcome: "NOT_APPLICABLE", display_name: null, source: null, provider_place_id: null };
  }
  const p = place as PlaceDetails;
  const ev: BuildingEvidence = { outcome: "UNCERTAIN", display_name: p.displayName, source: "google", provider_place_id: p.id };
  const dist = p.location ? haversine(pin, p.location) : Infinity;
  const within = inViewport(pin, p);

  // Address consistency: PIN + locality agreement between the place and the final reverse-geocode.
  const placePin = nn(p.addressComponents.find((c) => c.types.includes("postal_code"))?.longText);
  const placeLoc = nn(p.addressComponents.find((c) => c.types.includes("sublocality_level_1"))?.longText)
    ?? nn(p.addressComponents.find((c) => c.types.includes("neighborhood"))?.longText);
  const pinConsistent = !placePin || !factual.pincode || placePin === factual.pincode;
  const locConsistent = !placeLoc || !factual.locality || placeLoc.toLowerCase() === (factual.locality ?? "").toLowerCase();

  if (within || (dist <= SAME_MAX_M && pinConsistent && locConsistent)) ev.outcome = "SAME";
  else if (dist > UNCERTAIN_MAX_M && (!pinConsistent && !locConsistent)) ev.outcome = "CONFLICT";
  else ev.outcome = "UNCERTAIN";
  return ev;
}
