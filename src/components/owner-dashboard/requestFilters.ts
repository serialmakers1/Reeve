/**
 * Pure filtering + sorting for the owner Requests tab.
 *
 * Reads ONLY the frozen tenant_profile_snapshot stored on each contact request
 * (+ row status/created_at) — never the tenant's live profile. Null-safe: an
 * active filter means "must match a present value", so rows missing that field
 * simply don't match; with no filters active, every row is shown.
 */

import { parseISO, isValid } from "date-fns";
import {
  OCCUPATION_OPTIONS,
  GENDER_OPTIONS,
  DIET_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  STAY_OPTIONS,
  PET_TYPE_OPTIONS,
  BUYING_PURPOSE_OPTIONS,
  PURCHASE_TIMELINE_OPTIONS,
  FUNDING_STAGE_OPTIONS,
} from "@/lib/preferenceHelpers";

export type CrStatus = "pending" | "approved" | "declined" | "withdrawn" | "auto_cancelled";
export type SnapshotMode = "rent" | "buy";
export type TriState = "any" | "yes" | "no";

export const STATUS_OPTIONS: { value: CrStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "auto_cancelled", label: "Auto-cancelled" },
];

export const DATE_RANGE_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;
export type DateRange = (typeof DATE_RANGE_OPTIONS)[number]["value"];

export type SortKey =
  | "pending_first"
  | "newest"
  | "oldest"
  | "earliest_move_in"
  | "purchase_timeline"
  | "funding_readiness";

export interface RequestFilters {
  // common
  status: CrStatus[];
  dateRange: DateRange;
  ageMin: number | null;
  ageMax: number | null;
  occupation: string[];
  foreignNational: TriState;
  // rent
  moveInBefore: string | null; // ISO date (yyyy-MM-dd)
  residentsMin: number | null;
  pets: TriState;
  petTypes: string[];
  expectedStay: string[];
  gender: string[];
  diet: string[];
  maritalStatus: string[];
  // sale/buy
  buyingPurpose: string[];
  purchaseTimeline: string[];
  fundingStage: string[];
}

export const EMPTY_FILTERS: RequestFilters = {
  status: [],
  dateRange: "any",
  ageMin: null,
  ageMax: null,
  occupation: [],
  foreignNational: "any",
  moveInBefore: null,
  residentsMin: null,
  pets: "any",
  petTypes: [],
  expectedStay: [],
  gender: [],
  diet: [],
  maritalStatus: [],
  buyingPurpose: [],
  purchaseTimeline: [],
  fundingStage: [],
};

// ── Snapshot shapes (mirror submit-contact-request buildRent/BuySnapshot) ──────
interface RentalPrefsSnapshot {
  age?: number | string | null;
  gender?: string | null;
  number_of_occupants?: number | null;
  occupation?: string | null;
  expected_stay_duration?: string | null;
  move_in_by?: string | null;
  marital_status?: string | null;
  diet_preference?: string | null;
  has_pets?: boolean | null;
  pet_types?: string[] | null;
  is_foreign_citizen?: boolean | null;
}
interface BuyingPrefsSnapshot {
  age?: number | string | null;
  occupation?: string | null;
  is_foreign_citizen?: boolean | null;
  buying_purpose?: string | null;
  purchase_timeline?: string | null;
  funding_stage?: string | null;
}
interface TenantSnapshot {
  rental_preferences?: RentalPrefsSnapshot | null;
  buying_preferences?: BuyingPrefsSnapshot | null;
}
export interface FilterableRequest {
  id: string;
  status: CrStatus;
  created_at: string;
  tenant_profile_snapshot: TenantSnapshot | null;
}

export function snapshotMode(listingType?: string | null): SnapshotMode {
  return listingType === "sale" ? "buy" : "rent";
}

const VALID = {
  occupation: new Set(OCCUPATION_OPTIONS.map((o) => o.value)),
  gender: new Set(GENDER_OPTIONS.map((o) => o.value)),
  diet: new Set(DIET_OPTIONS.map((o) => o.value)),
  marital: new Set(MARITAL_STATUS_OPTIONS.map((o) => o.value)),
  stay: new Set(STAY_OPTIONS.map((o) => o.value)),
  petType: new Set(PET_TYPE_OPTIONS.map((o) => o.value)),
  buyingPurpose: new Set(BUYING_PURPOSE_OPTIONS.map((o) => o.value)),
  purchaseTimeline: new Set(PURCHASE_TIMELINE_OPTIONS.map((o) => o.value)),
  fundingStage: new Set(FUNDING_STAGE_OPTIONS.map((o) => o.value)),
  status: new Set(STATUS_OPTIONS.map((o) => o.value)),
};

// Ordering indices (soonest / most-ready first); unknown → large.
const TIMELINE_INDEX = new Map<string, number>(PURCHASE_TIMELINE_OPTIONS.map((o, i) => [o.value, i]));
const FUNDING_INDEX = new Map<string, number>(FUNDING_STAGE_OPTIONS.map((o, i) => [o.value, i]));
const STATUS_RANK: Record<CrStatus, number> = {
  pending: 0, approved: 1, declined: 2, withdrawn: 3, auto_cancelled: 4,
};

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function parseDate(v: string | null | undefined): number | null {
  if (!v) return null;
  const d = parseISO(v);
  return isValid(d) ? d.getTime() : null;
}
function withinDays(createdAt: string, days: number): boolean {
  const t = parseDate(createdAt) ?? Date.parse(createdAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

// ── Filtering ─────────────────────────────────────────────────────────────────
export function filterRequests<T extends FilterableRequest>(
  rows: T[],
  f: RequestFilters,
  mode: SnapshotMode,
): T[] {
  return rows.filter((row) => {
    // Common — status / date (independent of snapshot).
    if (f.status.length > 0 && !f.status.includes(row.status)) return false;
    if (f.dateRange !== "any") {
      const days = f.dateRange === "7d" ? 7 : 30;
      if (!withinDays(row.created_at, days)) return false;
    }

    const snap = row.tenant_profile_snapshot;
    const prefs = (mode === "buy" ? snap?.buying_preferences : snap?.rental_preferences) ?? null;

    // Common snapshot-based
    if (f.ageMin != null || f.ageMax != null) {
      const age = toNum(prefs?.age);
      if (age == null) return false;
      if (f.ageMin != null && age < f.ageMin) return false;
      if (f.ageMax != null && age > f.ageMax) return false;
    }
    if (f.occupation.length > 0) {
      if (!prefs?.occupation || !f.occupation.includes(prefs.occupation)) return false;
    }
    if (f.foreignNational !== "any") {
      const want = f.foreignNational === "yes";
      if (prefs?.is_foreign_citizen == null || prefs.is_foreign_citizen !== want) return false;
    }

    if (mode === "rent") {
      const rp = prefs as RentalPrefsSnapshot | null;
      if (f.moveInBefore) {
        const before = parseDate(f.moveInBefore);
        const move = parseDate(rp?.move_in_by);
        if (before == null || move == null || move > before) return false;
      }
      if (f.residentsMin != null) {
        const occ = toNum(rp?.number_of_occupants);
        if (occ == null || occ < f.residentsMin) return false;
      }
      if (f.pets !== "any") {
        const want = f.pets === "yes";
        if (rp?.has_pets == null || rp.has_pets !== want) return false;
      }
      if (f.pets === "yes" && f.petTypes.length > 0) {
        const pt = rp?.pet_types;
        if (!Array.isArray(pt) || !pt.some((x) => f.petTypes.includes(x))) return false;
      }
      if (f.expectedStay.length > 0) {
        if (!rp?.expected_stay_duration || !f.expectedStay.includes(rp.expected_stay_duration)) return false;
      }
      if (f.gender.length > 0) {
        if (!rp?.gender || !f.gender.includes(rp.gender)) return false;
      }
      if (f.diet.length > 0) {
        if (!rp?.diet_preference || !f.diet.includes(rp.diet_preference)) return false;
      }
      if (f.maritalStatus.length > 0) {
        if (!rp?.marital_status || !f.maritalStatus.includes(rp.marital_status)) return false;
      }
    } else {
      const bp = prefs as BuyingPrefsSnapshot | null;
      if (f.buyingPurpose.length > 0) {
        if (!bp?.buying_purpose || !f.buyingPurpose.includes(bp.buying_purpose)) return false;
      }
      if (f.purchaseTimeline.length > 0) {
        if (!bp?.purchase_timeline || !f.purchaseTimeline.includes(bp.purchase_timeline)) return false;
      }
      if (f.fundingStage.length > 0) {
        if (!bp?.funding_stage || !f.fundingStage.includes(bp.funding_stage)) return false;
      }
    }
    return true;
  });
}

// ── Sorting ───────────────────────────────────────────────────────────────────
// Stable tiebreak: created_at DESC, then id — so cards never jump.
function tiebreak(a: FilterableRequest, b: FilterableRequest): number {
  const ta = parseDate(a.created_at) ?? 0;
  const tb = parseDate(b.created_at) ?? 0;
  if (tb !== ta) return tb - ta;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
const LAST = Number.MAX_SAFE_INTEGER;

export function sortRequests<T extends FilterableRequest>(
  rows: T[],
  sortKey: SortKey,
): T[] {
  const arr = [...rows];
  arr.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "newest":
        cmp = (parseDate(b.created_at) ?? 0) - (parseDate(a.created_at) ?? 0);
        break;
      case "oldest":
        cmp = (parseDate(a.created_at) ?? 0) - (parseDate(b.created_at) ?? 0);
        break;
      case "earliest_move_in": {
        const ma = parseDate(a.tenant_profile_snapshot?.rental_preferences?.move_in_by) ?? LAST;
        const mb = parseDate(b.tenant_profile_snapshot?.rental_preferences?.move_in_by) ?? LAST;
        cmp = ma - mb;
        break;
      }
      case "purchase_timeline": {
        const ia = TIMELINE_INDEX.get(a.tenant_profile_snapshot?.buying_preferences?.purchase_timeline ?? "") ?? LAST;
        const ib = TIMELINE_INDEX.get(b.tenant_profile_snapshot?.buying_preferences?.purchase_timeline ?? "") ?? LAST;
        cmp = ia - ib;
        break;
      }
      case "funding_readiness": {
        const ia = FUNDING_INDEX.get(a.tenant_profile_snapshot?.buying_preferences?.funding_stage ?? "") ?? LAST;
        const ib = FUNDING_INDEX.get(b.tenant_profile_snapshot?.buying_preferences?.funding_stage ?? "") ?? LAST;
        cmp = ia - ib;
        break;
      }
      case "pending_first":
      default:
        cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        break;
    }
    if (cmp !== 0) return cmp;
    return tiebreak(a, b);
  });
  return arr;
}

// ── Sort validity by mode ──────────────────────────────────────────────────────
export function isSortValidForListing(sortKey: SortKey, mode: SnapshotMode): boolean {
  if (sortKey === "earliest_move_in") return mode === "rent";
  if (sortKey === "purchase_timeline" || sortKey === "funding_readiness") return mode === "buy";
  return true;
}

export function availableSorts(mode: SnapshotMode): { value: SortKey; label: string }[] {
  const base: { value: SortKey; label: string }[] = [
    { value: "pending_first", label: "Pending first" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
  ];
  if (mode === "rent") base.push({ value: "earliest_move_in", label: "Earliest move-in" });
  else base.push(
    { value: "purchase_timeline", label: "Purchase timeline" },
    { value: "funding_readiness", label: "Funding readiness" },
  );
  return base;
}

// ── Active count ────────────────────────────────────────────────────────────────
export function countActiveFilters(f: RequestFilters, mode: SnapshotMode): number {
  let n = 0;
  // common
  if (f.status.length) n++;
  if (f.dateRange !== "any") n++;
  if (f.ageMin != null || f.ageMax != null) n++;
  if (f.occupation.length) n++;
  if (f.foreignNational !== "any") n++;
  if (mode === "rent") {
    if (f.moveInBefore) n++;
    if (f.residentsMin != null) n++;
    if (f.pets !== "any") n++;
    if (f.pets === "yes" && f.petTypes.length) n++;
    if (f.expectedStay.length) n++;
    if (f.gender.length) n++;
    if (f.diet.length) n++;
    if (f.maritalStatus.length) n++;
  } else {
    if (f.buyingPurpose.length) n++;
    if (f.purchaseTimeline.length) n++;
    if (f.fundingStage.length) n++;
  }
  return n;
}

// ── Sanitize (drop invalid / mode-incompatible / dependent) ─────────────────────
const keepValid = (vals: string[] | undefined, valid: Set<string>): string[] =>
  Array.isArray(vals) ? vals.filter((v) => valid.has(v)) : [];
const cleanNum = (v: unknown): number | null => {
  const n = toNum(v);
  return n != null && n >= 0 ? n : null;
};

export function sanitizeFilters(input: Partial<RequestFilters> | null | undefined, mode: SnapshotMode): RequestFilters {
  const f = { ...EMPTY_FILTERS, ...(input ?? {}) };
  const out: RequestFilters = {
    ...EMPTY_FILTERS,
    status: keepValid(f.status, VALID.status) as CrStatus[],
    dateRange: (["any", "7d", "30d"] as const).includes(f.dateRange) ? f.dateRange : "any",
    ageMin: cleanNum(f.ageMin),
    ageMax: cleanNum(f.ageMax),
    occupation: keepValid(f.occupation, VALID.occupation),
    foreignNational: (["any", "yes", "no"] as const).includes(f.foreignNational) ? f.foreignNational : "any",
  };

  if (mode === "rent") {
    out.moveInBefore = f.moveInBefore && isValid(parseISO(f.moveInBefore)) ? f.moveInBefore : null;
    out.residentsMin = cleanNum(f.residentsMin);
    out.pets = (["any", "yes", "no"] as const).includes(f.pets) ? f.pets : "any";
    out.petTypes = out.pets === "yes" ? keepValid(f.petTypes, VALID.petType) : [];
    out.expectedStay = keepValid(f.expectedStay, VALID.stay);
    out.gender = keepValid(f.gender, VALID.gender);
    out.diet = keepValid(f.diet, VALID.diet);
    out.maritalStatus = keepValid(f.maritalStatus, VALID.marital);
  } else {
    out.buyingPurpose = keepValid(f.buyingPurpose, VALID.buyingPurpose);
    out.purchaseTimeline = keepValid(f.purchaseTimeline, VALID.purchaseTimeline);
    out.fundingStage = keepValid(f.fundingStage, VALID.fundingStage);
  }

  // Age range coherence.
  if (out.ageMin != null && out.ageMax != null && out.ageMin > out.ageMax) {
    out.ageMax = out.ageMin;
  }
  return out;
}
