import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import type { SearchMode } from "@/features/search/domain/searchMode";
import { formatIndianRupee } from "@/features/search/domain/formatCurrency";

/**
 * A single decision fact. `concept` is the stable de-duplication key (never the
 * visible text); `group` scopes the "one per group first" selection pass; `label`
 * is the formatted display string.
 */
export interface ComparisonFact {
  concept: string;
  group: string;
  label: string;
}

interface Candidate {
  group: string;
  concept: string;
  priority: number; // lower = higher priority
  label: string;
}

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  fully_furnished: "Fully furnished",
};

const POSSESSION_STATUS_LABELS: Record<string, string> = {
  ready_to_move: "Ready to move",
  under_construction: "Under construction",
  new_launch: "New launch",
};

const MAX_FACTS = 3;

/** Comma-group a whole number (Indian/standard thousands) for area labels. */
function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

function possessionDateLabel(possessionDate: string | null): string | null {
  if (!possessionDate) return null;
  try {
    const d = new Date(possessionDate);
    if (Number.isNaN(d.getTime())) return null;
    const month = d.toLocaleString("en-IN", { month: "short" });
    return `Possession: ${month} ${d.getFullYear()}`;
  } catch {
    return null;
  }
}

// ── Candidate builders ────────────────────────────────────────────────────────

/** Space: carpet area OR super built-up area (single `size` concept). */
function spaceCandidate(result: SearchPropertyResult): Candidate | null {
  if (result.carpetAreaSqft) {
    return { group: "space", concept: "size", priority: 0, label: `${fmt(result.carpetAreaSqft)} sq.ft carpet` };
  }
  if (result.superBuiltUpSqft) {
    return { group: "space", concept: "size", priority: 1, label: `${fmt(result.superBuiltUpSqft)} sq.ft super built-up` };
  }
  return null;
}

/** Parking: 4W preferred over 2W (single `parking` concept). */
function parkingCandidate(result: SearchPropertyResult, priority: number): Candidate | null {
  if (result.parking4w && result.parking4w !== "none") {
    return { group: "utility", concept: "parking", priority, label: "4W parking" };
  }
  if (result.parking2w && result.parking2w !== "none") {
    return { group: "utility", concept: "parking", priority: priority + 0.1, label: "2W parking" };
  }
  return null;
}

function rentCandidates(result: SearchPropertyResult): Candidate[] {
  const c: (Candidate | null)[] = [];

  // Space
  c.push(spaceCandidate(result));

  // Move-in friction: zero brokerage → brokerage value → deposit → lock-in
  if (result.rentBrokerageType === "zero") {
    c.push({ group: "moveInFriction", concept: "brokerage", priority: 0, label: "Zero brokerage" });
  } else if (result.rentBrokerageFixed && result.rentBrokerageFixed > 0) {
    c.push({ group: "moveInFriction", concept: "brokerage", priority: 1, label: `${formatIndianRupee(result.rentBrokerageFixed)} brokerage` });
  } else if (result.rentBrokerageMonths && result.rentBrokerageMonths > 0) {
    const m = result.rentBrokerageMonths;
    c.push({ group: "moveInFriction", concept: "brokerage", priority: 1, label: `${m} mo brokerage` });
  }
  if (result.securityDepositAmount && result.securityDepositAmount > 0) {
    c.push({ group: "moveInFriction", concept: "move_in_cost", priority: 2, label: `${formatIndianRupee(result.securityDepositAmount)} deposit` });
  }
  if (result.lockInMonths && result.lockInMonths > 0) {
    c.push({ group: "moveInFriction", concept: "lockin", priority: 3, label: `${result.lockInMonths} mo lock-in` });
  } else if (result.lockInMonths === 0) {
    c.push({ group: "moveInFriction", concept: "lockin", priority: 3, label: "No lock-in" });
  }

  // Utility: furnishing → parking → pets
  if (result.furnishing && FURNISHING_LABELS[result.furnishing]) {
    c.push({ group: "utility", concept: "furnishing", priority: 0, label: FURNISHING_LABELS[result.furnishing] });
  }
  c.push(parkingCandidate(result, 1));
  if (result.petPolicy === "allowed") {
    c.push({ group: "utility", concept: "pets", priority: 2, label: "Pets allowed" });
  }

  return c.filter((x): x is Candidate => x !== null);
}

function buyCandidates(result: SearchPropertyResult): Candidate[] {
  const c: (Candidate | null)[] = [];

  // Space
  c.push(spaceCandidate(result));

  // Readiness: ready to move → possession date/status
  if (result.possessionStatus === "ready_to_move") {
    c.push({ group: "readiness", concept: "readiness", priority: 0, label: "Ready to move" });
  } else {
    const dateLabel = possessionDateLabel(result.possessionDate);
    if (dateLabel) {
      c.push({ group: "readiness", concept: "readiness", priority: 1, label: dateLabel });
    } else if (result.possessionStatus && POSSESSION_STATUS_LABELS[result.possessionStatus]) {
      c.push({ group: "readiness", concept: "readiness", priority: 2, label: POSSESSION_STATUS_LABELS[result.possessionStatus] });
    }
  }

  // Transaction friction: zero brokerage → brokerage value → negotiable
  if (result.saleBrokeragePct === 0) {
    c.push({ group: "txFriction", concept: "brokerage", priority: 0, label: "Zero brokerage" });
  } else if (result.saleBrokeragePct && result.saleBrokeragePct > 0) {
    c.push({ group: "txFriction", concept: "brokerage", priority: 1, label: `${result.saleBrokeragePct}% brokerage` });
  }
  if (result.priceNegotiable === true) {
    c.push({ group: "txFriction", concept: "negotiable", priority: 2, label: "Negotiable" });
  }

  // Utility: parking → furnishing
  c.push(parkingCandidate(result, 0));
  if (result.furnishing && FURNISHING_LABELS[result.furnishing]) {
    c.push({ group: "utility", concept: "furnishing", priority: 1, label: FURNISHING_LABELS[result.furnishing] });
  }

  return c.filter((x): x is Candidate => x !== null);
}

/**
 * Deterministic top-≤3 fact resolver.
 *
 * Selection: (1) the highest-priority candidate from each group, one per group,
 * in group order, until 3; (2) if still <3, remaining candidates by priority whose
 * concept is not already used. De-duplication is by `concept` (never label), so
 * exclusivity pairs (carpet/super-built-up, 4W/2W, deposit/move-in, brokerage kinds)
 * can never both appear. `excludeConcepts` drops concepts already shown elsewhere on
 * the card (e.g. the contextual-signal chip) so a fact never repeats them.
 */
export function resolveComparisonFacts(
  result: SearchPropertyResult,
  mode: SearchMode,
  excludeConcepts: string[] = [],
): ComparisonFact[] {
  const excluded = new Set(excludeConcepts);
  const candidates = (mode === "rent" ? rentCandidates(result) : buyCandidates(result)).filter(
    (c) => !excluded.has(c.concept),
  );

  // Best (lowest-priority-number) candidate per concept — collapses exclusivity pairs.
  const bestByConcept = new Map<string, Candidate>();
  for (const cand of candidates) {
    const prev = bestByConcept.get(cand.concept);
    if (!prev || cand.priority < prev.priority) bestByConcept.set(cand.concept, cand);
  }
  const pool = [...bestByConcept.values()];

  const selected: Candidate[] = [];
  const usedGroups = new Set<string>();
  const usedConcepts = new Set<string>();

  // Group order = the order groups first appear in the candidate list.
  const groupOrder: string[] = [];
  for (const c of pool) if (!groupOrder.includes(c.group)) groupOrder.push(c.group);

  // Pass 1 — one highest-priority fact per group.
  for (const group of groupOrder) {
    if (selected.length >= MAX_FACTS) break;
    const best = pool
      .filter((c) => c.group === group && !usedConcepts.has(c.concept))
      .sort((a, b) => a.priority - b.priority)[0];
    if (best) {
      selected.push(best);
      usedGroups.add(best.group);
      usedConcepts.add(best.concept);
    }
  }

  // Pass 2 — fill remaining slots with the next best distinct-concept candidates.
  if (selected.length < MAX_FACTS) {
    const rest = pool
      .filter((c) => !usedConcepts.has(c.concept))
      .sort((a, b) => a.priority - b.priority);
    for (const c of rest) {
      if (selected.length >= MAX_FACTS) break;
      selected.push(c);
      usedConcepts.add(c.concept);
    }
  }

  return selected.slice(0, MAX_FACTS).map(({ concept, group, label }) => ({ concept, group, label }));
}
