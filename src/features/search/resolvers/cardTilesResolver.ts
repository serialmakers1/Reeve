import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import { formatIndianRupee } from "@/features/search/domain/formatCurrency";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";

/**
 * Pure presentation resolver for the vibrant vertical SearchPropertyCard.
 * No JSX, no React. Produces typed tile/segment descriptors the card renders
 * declaratively. The horizontal (Split) card does NOT use any of this — it keeps
 * its existing resolveComparisonFacts / resolveContextualSignal rendering.
 */

// ── Shared type guard ─────────────────────────────────────────────────────────
/** Narrows `number | null | undefined` reliably (bare Number.isFinite does not). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// ── Scheme + icon keys ────────────────────────────────────────────────────────
export type TileScheme =
  | "deposit"
  | "paidBrokerage"
  | "zeroBrokerage"
  | "lockin"
  | "availableFrom"
  | "area"
  | "furnishing"
  | "petsAllowed"
  | "petsRestricted"
  | "neutralRestriction"
  | "video"
  | "readyToMove"
  | "possessionDate"
  | "buildingAge"
  | "openToOffers"
  | "saleBrokerage"
  | "parking"
  | "floor"
  | "bath";

export type IconKey =
  | "wallet"
  | "rupee"
  | "lockin"
  | "calendar"
  | "area"
  | "bath"
  | "floor"
  | "parking"
  | "furnishing"
  | "pets"
  | "video"
  | "readyToMove"
  | "openToOffers"
  | "percent"
  | "buildingAge"
  | "listerOwner"
  | "listerBroker"
  | "listerManager"
  | "listerBuilder"
  | "response"
  | "confirmed"
  | "listed";

export interface CardTile {
  concept: string;
  iconKey: IconKey;
  scheme: TileScheme;
  line1: string;
  line2?: string;
  ariaLabel?: string;
}

export type FooterSegmentKind = "lister" | "response" | "confirmed" | "listed";

export interface FooterSegment {
  key: FooterSegmentKind;
  iconKey: IconKey;
  scheme: "footerLister" | "footerResponse" | "footerConfirmed" | "footerListed";
  text: string;
  ariaLabel: string;
}

export interface FreshnessInfo {
  kind: "confirmed" | "listed";
  days: number;
  text: string;
  ariaLabel: string;
}

// ── Labels ────────────────────────────────────────────────────────────────────
const LISTER_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  broker: "Broker",
  property_manager: "Property Manager",
  builder: "Builder",
};

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  fully_furnished: "Fully furnished",
};

/** Single shared source for the lister-role label (used by component + footer resolver). */
export function resolveListerRoleLabel(role: string): string {
  return LISTER_ROLE_LABELS[role] ?? formatEnumLabel("lister_role", role);
}

// ── Number helpers ────────────────────────────────────────────────────────────
function pluralMonths(n: number): string {
  return `${n} month${n === 1 ? "" : "s"}`;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

// ── Freshness ─────────────────────────────────────────────────────────────────
/** Owns the ONLY date math for the card. Returns null on invalid/missing dates. */
function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
}

export function resolveFreshnessInfo(result: SearchPropertyResult): FreshnessInfo | null {
  // Rent prefers availability confirmation; Sale (and rent fallback) uses listedAt.
  if (result.listingMode === "rent" && result.availabilityConfirmedAt) {
    const d = daysAgo(result.availabilityConfirmedAt);
    if (d !== null) {
      return {
        kind: "confirmed",
        days: d,
        text: d === 0 ? "Confirmed today" : `Confirmed ${d}d`,
        ariaLabel:
          d === 0
            ? "Availability confirmed today"
            : `Availability confirmed ${d} day${d === 1 ? "" : "s"} ago`,
      };
    }
  }
  const d = daysAgo(result.listedAt);
  if (d !== null) {
    return {
      kind: "listed",
      days: d,
      text: d === 0 ? "Listed today" : `Listed ${d}d`,
      ariaLabel: d === 0 ? "Listed today" : `Listed ${d} day${d === 1 ? "" : "s"} ago`,
    };
  }
  return null;
}

// ── Deposit tile (Rent) ───────────────────────────────────────────────────────
/** Explicit finite 0 stays visible as ₹0; null/NaN/Infinity/negative omit. */
export function resolveDepositTile(result: SearchPropertyResult): CardTile | null {
  const amount = result.securityDepositAmount;
  if (!isFiniteNumber(amount) || amount < 0) return null;
  return {
    concept: "deposit",
    iconKey: "wallet",
    scheme: "deposit",
    line1: "Security deposit",
    line2: formatIndianRupee(amount),
  };
}

// ── Secondary Rent term: brokerage(amount) → lock-in → none ───────────────────
export function resolveSecondaryRentTerm(result: SearchPropertyResult): CardTile | null {
  const fixed = result.rentBrokerageFixed;
  if (fixed === 0) {
    return { concept: "brokerage", iconKey: "rupee", scheme: "zeroBrokerage", line1: "Zero brokerage" };
  }
  if (isFiniteNumber(fixed) && fixed > 0) {
    return {
      concept: "brokerage",
      iconKey: "rupee",
      scheme: "paidBrokerage",
      line1: "Brokerage",
      line2: formatIndianRupee(fixed),
    };
  }
  // Brokerage amount null/invalid → lock-in.
  const lock = result.lockInMonths;
  if (lock === 0) {
    return { concept: "lockin", iconKey: "lockin", scheme: "lockin", line1: "No lock-in" };
  }
  if (isFiniteNumber(lock) && lock > 0) {
    return {
      concept: "lockin",
      iconKey: "lockin",
      scheme: "lockin",
      line1: "Lock-in period",
      line2: pluralMonths(lock),
    };
  }
  return null;
}

// ── Feature candidate builders ────────────────────────────────────────────────
interface Candidate {
  group: string;
  concept: string;
  priority: number;
  tile: CardTile;
}

function areaCandidate(result: SearchPropertyResult): Candidate | null {
  if (isFiniteNumber(result.carpetAreaSqft) && result.carpetAreaSqft > 0) {
    return {
      group: "space",
      concept: "size",
      priority: 0,
      tile: { concept: "size", iconKey: "area", scheme: "area", line1: `${fmtInt(result.carpetAreaSqft)} sq ft`, line2: "Carpet" },
    };
  }
  if (isFiniteNumber(result.superBuiltUpSqft) && result.superBuiltUpSqft > 0) {
    return {
      group: "space",
      concept: "size",
      priority: 1,
      tile: { concept: "size", iconKey: "area", scheme: "area", line1: `${fmtInt(result.superBuiltUpSqft)} sq ft`, line2: "Super built-up" },
    };
  }
  return null;
}

function bathCandidate(result: SearchPropertyResult, group: string, priority: number): Candidate | null {
  if (isFiniteNumber(result.bathrooms) && result.bathrooms > 0) {
    const n = result.bathrooms;
    return {
      group,
      concept: "bath",
      priority,
      tile: { concept: "bath", iconKey: "bath", scheme: "bath", line1: `${n} bath${n === 1 ? "" : "s"}` },
    };
  }
  return null;
}

function floorCandidate(result: SearchPropertyResult, group: string, priority: number): Candidate | null {
  const f = result.floorNumber;
  if (!isFiniteNumber(f) || f < 0) return null;
  if (f === 0) {
    return { group, concept: "floor", priority, tile: { concept: "floor", iconKey: "floor", scheme: "floor", line1: "Ground floor" } };
  }
  const line1 =
    isFiniteNumber(result.totalFloors) && result.totalFloors > 0 ? `Floor ${f} of ${result.totalFloors}` : `Floor ${f}`;
  return { group, concept: "floor", priority, tile: { concept: "floor", iconKey: "floor", scheme: "floor", line1 } };
}

function parkingCountLabel(count: number | null): string | undefined {
  return isFiniteNumber(count) && count > 0 ? `${count} space${count === 1 ? "" : "s"}` : undefined;
}

function parkingCandidate(result: SearchPropertyResult, group: string, priority: number): Candidate | null {
  // Status-driven (present and not "none"); count is additive when finite > 0.
  if (result.parking4w && result.parking4w !== "none") {
    const prefix = result.parking4w === "covered" ? "Covered " : result.parking4w === "uncovered" ? "Open " : "";
    return {
      group,
      concept: "parking",
      priority,
      tile: { concept: "parking", iconKey: "parking", scheme: "parking", line1: `${prefix}car parking`.replace(/^car/, "Car"), line2: parkingCountLabel(result.parking4wCount) },
    };
  }
  if (result.parking2w && result.parking2w !== "none") {
    return {
      group,
      concept: "parking",
      priority: priority + 0.1,
      tile: { concept: "parking", iconKey: "parking", scheme: "parking", line1: "Bike parking", line2: parkingCountLabel(result.parking2wCount) },
    };
  }
  return null;
}

function furnishingCandidate(result: SearchPropertyResult, group: string, priority: number): Candidate | null {
  if (result.furnishing && FURNISHING_LABELS[result.furnishing]) {
    return {
      group,
      concept: "furnishing",
      priority,
      tile: { concept: "furnishing", iconKey: "furnishing", scheme: "furnishing", line1: FURNISHING_LABELS[result.furnishing] },
    };
  }
  return null;
}

function buildingAgeCandidate(result: SearchPropertyResult, group: string, priority: number): Candidate | null {
  const a = result.buildingAgeYears;
  if (!isFiniteNumber(a) || a < 0) return null;
  const line1 = a === 0 ? "New construction" : `${a}-year-old building`;
  return { group, concept: "buildingAge", priority, tile: { concept: "buildingAge", iconKey: "buildingAge", scheme: "buildingAge", line1 } };
}

function videoCandidate(result: SearchPropertyResult, group: string, priority: number): Candidate | null {
  if (result.hasVideoWalkthrough) {
    return { group, concept: "video", priority, tile: { concept: "video", iconKey: "video", scheme: "video", line1: "Video tour" } };
  }
  return null;
}

/** Rent renter-suitability pet candidate — documented domain only; unknown → null. */
function petCandidate(result: SearchPropertyResult, priority: number): Candidate | null {
  const p = result.petPolicy;
  if (p === "all_welcome" || p === "allowed") {
    return { group: "suitability", concept: "pets", priority, tile: { concept: "pets", iconKey: "pets", scheme: "petsAllowed", line1: "Pets allowed" } };
  }
  if (p === "small_only") {
    return { group: "suitability", concept: "pets", priority: priority + 0.2, tile: { concept: "pets", iconKey: "pets", scheme: "petsRestricted", line1: "Small pets only" } };
  }
  if (p === "case_by_case") {
    return { group: "suitability", concept: "pets", priority: priority + 0.3, tile: { concept: "pets", iconKey: "pets", scheme: "petsRestricted", line1: "Pets case by case" } };
  }
  if (p === "not_allowed") {
    return { group: "suitability", concept: "pets", priority: priority + 0.4, tile: { concept: "pets", iconKey: "pets", scheme: "neutralRestriction", line1: "Pets not allowed" } };
  }
  return null; // null, empty, or any unknown value → no pet tile
}

// ── Possession (Sale) ─────────────────────────────────────────────────────────
function possessionDateText(possessionDate: string | null): string | null {
  if (!possessionDate) return null;
  const ts = Date.parse(possessionDate);
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts);
  const month = d.toLocaleString("en-IN", { month: "short" });
  return `${month} ${d.getFullYear()}`;
}

function possessionCandidate(result: SearchPropertyResult): Candidate | null {
  const status = result.possessionStatus;
  const dateText = possessionDateText(result.possessionDate);

  if (status === "ready_to_move") {
    return { group: "possession", concept: "possession", priority: 0, tile: { concept: "possession", iconKey: "readyToMove", scheme: "readyToMove", line1: "Ready to move" } };
  }
  if (status === "under_construction") {
    return {
      group: "possession",
      concept: "possession",
      priority: 1,
      tile: { concept: "possession", iconKey: "buildingAge", scheme: "possessionDate", line1: "Under construction", line2: dateText ? `Possession ${dateText}` : undefined },
    };
  }
  if (status === "new_launch") {
    return {
      group: "possession",
      concept: "possession",
      priority: 2,
      tile: { concept: "possession", iconKey: "calendar", scheme: "possessionDate", line1: "New launch", line2: dateText ? `Possession ${dateText}` : undefined },
    };
  }
  // Unrecognised/null status → tile only when date valid.
  if (dateText) {
    return { group: "possession", concept: "possession", priority: 3, tile: { concept: "possession", iconKey: "calendar", scheme: "possessionDate", line1: "Possession", line2: dateText } };
  }
  return null;
}

// ── Slot resolution engine ────────────────────────────────────────────────────
/**
 * Select ≤3 tiles across the given ordered slot candidate-lists, one per slot in
 * order, then backfill remaining slots with the next unused-concept candidate.
 * De-dup by concept. `exclude` drops concepts already shown elsewhere on the card.
 */
function selectTiles(slots: (Candidate | null)[][], exclude: Set<string>): CardTile[] {
  const usedConcepts = new Set<string>(exclude);
  const selected: CardTile[] = [];
  const MAX = 3;

  const bestOf = (list: (Candidate | null)[]): Candidate | null =>
    list
      .filter((c): c is Candidate => c !== null && !usedConcepts.has(c.concept))
      .sort((a, b) => a.priority - b.priority)[0] ?? null;

  // Pass 1 — one per slot in order.
  const leftovers: Candidate[] = [];
  for (const slot of slots) {
    if (selected.length >= MAX) break;
    const best = bestOf(slot);
    if (best) {
      selected.push(best.tile);
      usedConcepts.add(best.concept);
    }
    // collect remaining distinct-concept candidates from this slot for backfill
    for (const c of slot) if (c && !usedConcepts.has(c.concept)) leftovers.push(c);
  }

  // Pass 2 — backfill by priority with unused concepts.
  if (selected.length < MAX) {
    leftovers.sort((a, b) => a.priority - b.priority);
    for (const c of leftovers) {
      if (selected.length >= MAX) break;
      if (usedConcepts.has(c.concept)) continue;
      selected.push(c.tile);
      usedConcepts.add(c.concept);
    }
  }

  return selected.slice(0, MAX);
}

export function resolveRentFeatureTiles(result: SearchPropertyResult, exclude: string[] = []): CardTile[] {
  const s1: (Candidate | null)[] = [
    areaCandidate(result),
    bathCandidate(result, "space", 2),
    floorCandidate(result, "space", 3),
    parkingCandidate(result, "space", 4),
  ];
  const s2: (Candidate | null)[] = [
    furnishingCandidate(result, "condition", 0),
    parkingCandidate(result, "condition", 1),
    floorCandidate(result, "condition", 2),
    bathCandidate(result, "condition", 3),
    buildingAgeCandidate(result, "condition", 4),
  ];
  const s3: (Candidate | null)[] = [
    petCandidate(result, 0),
    videoCandidate(result, "suitability", 1),
    parkingCandidate(result, "suitability", 5),
    floorCandidate(result, "suitability", 6),
    bathCandidate(result, "suitability", 7),
  ];
  return selectTiles([s1, s2, s3], new Set(exclude));
}

export function resolveSaleFeatureTiles(result: SearchPropertyResult, exclude: string[] = []): CardTile[] {
  const s1: (Candidate | null)[] = [
    areaCandidate(result),
    bathCandidate(result, "space", 2),
    floorCandidate(result, "space", 3),
    parkingCandidate(result, "space", 4),
  ];
  const s2: (Candidate | null)[] = [
    possessionCandidate(result),
    furnishingCandidate(result, "possession", 4),
    buildingAgeCandidate(result, "possession", 5),
    parkingCandidate(result, "possession", 6),
    floorCandidate(result, "possession", 7),
  ];
  const s3: (Candidate | null)[] = [
    openToOffersCandidate(result),
    videoCandidate(result, "differentiator", 1),
    saleBrokerageCandidate(result),
    buildingAgeCandidate(result, "differentiator", 5),
    parkingCandidate(result, "differentiator", 6),
  ];
  return selectTiles([s1, s2, s3], new Set(exclude));
}

function openToOffersCandidate(result: SearchPropertyResult): Candidate | null {
  if (result.priceNegotiable === true) {
    return { group: "differentiator", concept: "negotiable", priority: 0, tile: { concept: "negotiable", iconKey: "openToOffers", scheme: "openToOffers", line1: "Open to offers" } };
  }
  return null;
}

/** Sale brokerage differentiator: 0 → Zero brokerage; finite >0 & <=100 → X%; else skip. */
export function resolveSaleBrokerageTile(result: SearchPropertyResult): CardTile | null {
  const pct = result.saleBrokeragePct;
  if (pct === 0) {
    return { concept: "brokerage", iconKey: "percent", scheme: "zeroBrokerage", line1: "Zero brokerage" };
  }
  if (isFiniteNumber(pct) && pct > 0 && pct <= 100) {
    return { concept: "brokerage", iconKey: "percent", scheme: "saleBrokerage", line1: "Brokerage", line2: `${pct}%` };
  }
  return null;
}

function saleBrokerageCandidate(result: SearchPropertyResult): Candidate | null {
  const tile = resolveSaleBrokerageTile(result);
  if (!tile) return null;
  return { group: "differentiator", concept: "brokerage", priority: 2, tile };
}

// ── Footer ────────────────────────────────────────────────────────────────────
export function resolveFooterSegments(
  result: SearchPropertyResult,
  freshness: FreshnessInfo | null,
  roleLabel: string,
): FooterSegment[] {
  const segments: FooterSegment[] = [];

  const listerIcon: IconKey =
    result.listerRole === "owner"
      ? "listerOwner"
      : result.listerRole === "broker"
        ? "listerBroker"
        : result.listerRole === "builder"
          ? "listerBuilder"
          : "listerManager";
  segments.push({
    key: "lister",
    iconKey: listerIcon,
    scheme: "footerLister",
    text: roleLabel,
    ariaLabel: roleLabel,
  });

  const pct = result.responseRatePct;
  if (isFiniteNumber(pct) && pct >= 0 && pct <= 100) {
    segments.push({
      key: "response",
      iconKey: "response",
      scheme: "footerResponse",
      text: `Responds ${pct}%`,
      ariaLabel: `Responds to ${pct} percent of enquiries`,
    });
  }

  if (freshness) {
    segments.push({
      key: freshness.kind,
      iconKey: freshness.kind === "confirmed" ? "confirmed" : "listed",
      scheme: freshness.kind === "confirmed" ? "footerConfirmed" : "footerListed",
      text: freshness.text,
      ariaLabel: freshness.ariaLabel,
    });
  }

  return segments;
}
