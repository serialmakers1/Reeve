// Pure, dependency-free geo-classification helpers for the trusted location flow.
// NO Deno / Google / network imports — so this module is unit-testable with vitest.
// index.ts wires these into the Edge Function; all Google/DB I/O stays there.
//
// Canonical-city convention (Prompt 4A, preserved from Reeve's autocomplete
// `includedPrimaryTypes: ["locality","administrative_area_level_3"]`):
//   city  ⇔ types include `locality` OR `administrative_area_level_3`.
//   `postal_town` and `administrative_area_level_2` are NOT cities.
// This is Reeve's deliberate India convention — do NOT widen it in 4A.

export type CityErrorCode =
  | "city_not_associated" // selected city is not in Google's semantic evidence for this pin
  | "secondary_is_primary" // a secondary equals the final primary
  | "too_many_secondaries" // explicit admin set has >2 unique cities (never silently truncated)
  | "owner_cannot_set_secondaries"; // non-admin sent the admin-only secondary field

export class CityClassifyError extends Error {
  code: CityErrorCode;
  constructor(code: CityErrorCode) {
    super(code);
    this.code = code;
  }
}

/** A canonical city entity candidate (from reverse-geocode results or Address Descriptors). */
export interface CityCandidate {
  placeId: string;
  displayName: string;
  types: string[];
  /** ISO country short code, e.g. "IN". */
  country: string | null;
  /** Address-Descriptor containment, when the candidate came from a descriptor area. */
  containment?: "WITHIN" | "OUTSKIRTS" | "NEAR" | null;
}

const CANONICAL_CITY_TYPES = ["locality", "administrative_area_level_3"] as const;

/** Reeve's canonical-city predicate — the SINGLE source of truth (evidence + validators). */
export function isCanonicalCityType(types: string[] | null | undefined): boolean {
  if (!types || types.length === 0) return false;
  return CANONICAL_CITY_TYPES.some((t) => types.includes(t));
}

function isIndia(country: string | null | undefined): boolean {
  // Reverse-geocode/Place country is expected present; treat absent as non-India (strict).
  return (country ?? "").toUpperCase() === "IN";
}

/** Deterministic rank: WITHIN before OUTSKIRTS before unknown; NEAR is excluded upstream. */
function containmentRank(c: CityCandidate["containment"]): number {
  if (c === "WITHIN") return 0;
  if (c === "OUTSKIRTS") return 1;
  return 2; // reverse-geocode results (no containment) rank after explicit WITHIN/OUTSKIRTS
}

/**
 * Build the Google SEMANTIC city-evidence set for a pin: canonical India City entities,
 * deduped by place_id, deterministically ranked (WITHIN → OUTSKIRTS → other, then stable
 * by first-seen order). NEAR candidates MUST be filtered out by the caller before this.
 * Never uses viewport/radius — membership is semantic only.
 */
export function buildCityEvidenceSet(candidates: CityCandidate[]): CityCandidate[] {
  const byId = new Map<string, { cand: CityCandidate; order: number }>();
  candidates.forEach((cand, order) => {
    if (cand.containment === "NEAR") return;
    if (!cand.placeId) return;
    if (!isCanonicalCityType(cand.types)) return;
    if (!isIndia(cand.country)) return;
    const existing = byId.get(cand.placeId);
    // keep the strongest containment evidence for a given place_id
    if (!existing || containmentRank(cand.containment) < containmentRank(existing.cand.containment)) {
      byId.set(cand.placeId, { cand, order: existing ? existing.order : order });
    }
  });
  return [...byId.values()]
    .sort((a, b) => {
      const r = containmentRank(a.cand.containment) - containmentRank(b.cand.containment);
      return r !== 0 ? r : a.order - b.order;
    })
    .map((v) => v.cand);
}

export interface PrimaryDecision {
  placeId: string;
  source: "google" | "admin";
}

/**
 * Determine the final Primary City place_id.
 *  - actor "owner": an override string only applies when Google left the city unresolved
 *    (owners cannot override a resolved city, and cannot use the null reset).
 *  - actor "admin": an override string wins even over a resolved Google city, but ONLY when
 *    it is in today's evidence set OR equals the grandfathered persisted admin primary.
 *    `null` = explicit "use Google-detected city". Omitted (`undefined`) = grandfathering:
 *    keep an existing admin primary; else today's Google primary; else preserve the persisted
 *    primary (validated elsewhere) — represented here by `persistedPrimaryPid`.
 * @param overridePid  undefined = omitted, null = reset-to-google, string = explicit choice
 * @param evidenceIds  place_ids in today's semantic city-evidence set
 * @param grandfatheredAdminPrimaryPid  persisted source='admin' primary for an UNCHANGED target
 * @param persistedPrimaryPid  currently-stored primary place_id (unchanged target), any source
 */
export function pickPrimaryCityPid(
  actor: "owner" | "admin",
  googleCityPid: string | null,
  overridePid: string | null | undefined,
  evidenceIds: Set<string>,
  grandfatheredAdminPrimaryPid: string | null = null,
  persistedPrimaryPid: string | null = null,
): PrimaryDecision | null {
  if (actor === "admin") {
    if (typeof overridePid === "string" && overridePid) {
      if (evidenceIds.has(overridePid) || overridePid === grandfatheredAdminPrimaryPid) {
        return { placeId: overridePid, source: "admin" };
      }
      throw new CityClassifyError("city_not_associated");
    }
    if (overridePid === null) {
      // explicit reset to Google
      return googleCityPid ? { placeId: googleCityPid, source: "google" } : null;
    }
    // omitted → grandfathering precedence
    if (grandfatheredAdminPrimaryPid) return { placeId: grandfatheredAdminPrimaryPid, source: "admin" };
    if (googleCityPid) return { placeId: googleCityPid, source: "google" };
    if (persistedPrimaryPid) return { placeId: persistedPrimaryPid, source: "google" };
    return null;
  }
  // owner
  if (googleCityPid) return { placeId: googleCityPid, source: "google" };
  if (typeof overridePid === "string" && overridePid && evidenceIds.has(overridePid)) {
    return { placeId: overridePid, source: "google" };
  }
  if (persistedPrimaryPid) return { placeId: persistedPrimaryPid, source: "google" };
  return null;
}

/**
 * AUTO secondary derivation: the evidence set minus the final Primary, deterministic,
 * capped at 2. Input `evidence` is already ranked by buildCityEvidenceSet.
 */
export function deriveSecondaryCities(
  evidence: CityCandidate[],
  finalPrimaryPid: string | null,
): CityCandidate[] {
  const out: CityCandidate[] = [];
  const seen = new Set<string>();
  for (const c of evidence) {
    if (c.placeId === finalPrimaryPid) continue;
    if (seen.has(c.placeId)) continue;
    seen.add(c.placeId);
    out.push(c);
    if (out.length === 2) break;
  }
  return out;
}

/**
 * Validate an EXPLICIT admin secondary set. Rejects (never truncates):
 *  - any city equal to the final Primary       → secondary_is_primary
 *  - any non-city / non-India entity           → city_not_associated
 *  - any id not in evidence AND not grandfathered admin secondary → city_not_associated
 *  - more than 2 UNIQUE cities after dedupe     → too_many_secondaries
 * Returns the deduped, validated list (order preserved).
 * @param grandfatheredAdminSecondaryIds persisted source='admin' secondaries for UNCHANGED target
 */
export function validateAdminSecondaries(
  fetched: CityCandidate[],
  finalPrimaryPid: string | null,
  evidenceIds: Set<string>,
  grandfatheredAdminSecondaryIds: Set<string> = new Set(),
): CityCandidate[] {
  const seen = new Set<string>();
  const unique: CityCandidate[] = [];
  for (const c of fetched) {
    if (!c.placeId) continue;
    if (seen.has(c.placeId)) continue; // dedupe silently (same id twice is not an error)
    seen.add(c.placeId);
    unique.push(c);
  }
  for (const c of unique) {
    if (c.placeId === finalPrimaryPid) throw new CityClassifyError("secondary_is_primary");
    if (!isCanonicalCityType(c.types) || !isIndia(c.country)) {
      throw new CityClassifyError("city_not_associated");
    }
    if (!evidenceIds.has(c.placeId) && !grandfatheredAdminSecondaryIds.has(c.placeId)) {
      throw new CityClassifyError("city_not_associated");
    }
  }
  if (unique.length > 2) throw new CityClassifyError("too_many_secondaries");
  return unique;
}
