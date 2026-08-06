/**
 * Listing freshness for owner cards. Pure — no side effects.
 *
 * Everything derives from ONE effective timestamp that mirrors the DB sweep's
 * COALESCE chain, so the card's deadline and confirm-button state can never
 * disagree with the backend:
 *   rent → availability_confirmed_at → current_listed_period_started_at → listed_at
 *   sale → sale_listing_confirmed_at → current_listed_period_started_at → listed_at
 *
 * The confirmation RPC remains authoritative for the actual cooldown — a click
 * either succeeds or returns `cooldown_active`.
 */

export type ListingKind = "rent" | "sale";
export type FreshnessState = "fresh" | "reminder" | "urgent" | "overdue" | "unknown";

export interface FreshnessInput {
  listingType: string | null | undefined;
  availabilityConfirmedAt: string | null | undefined;
  saleListingConfirmedAt: string | null | undefined;
  currentListedPeriodStartedAt: string | null | undefined;
  listedAt: string | null | undefined;
}

export interface Freshness {
  kind: ListingKind;
  state: FreshnessState;
  daysSince: number | null;      // whole days since the effective timestamp
  autoUnlistAt: Date | null;     // effective + 30d (rent) / 60d (sale)
  nextConfirmAt: Date | null;    // effective + 7d (rent) / 15d (sale) cooldown
  confirmEligible: boolean;      // now >= nextConfirmAt (or unknown → true)
}

const DAY_MS = 86_400_000;

// [autoUnlistDays, cooldownDays, reminderStart, urgentStart, overdueStart]
const RULES: Record<ListingKind, { unlist: number; cooldown: number; reminder: number; urgent: number }> = {
  rent: { unlist: 30, cooldown: 7, reminder: 15, urgent: 25 },
  sale: { unlist: 60, cooldown: 15, reminder: 30, urgent: 45 },
};

/** Parse an ISO timestamptz to epoch ms; null/invalid → null. No Date("Y-M-D"). */
function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function computeFreshness(input: FreshnessInput, now: number = Date.now()): Freshness {
  const kind: ListingKind = input.listingType === "sale" ? "sale" : "rent";
  const rule = RULES[kind];

  const confirmMs = toMs(kind === "sale" ? input.saleListingConfirmedAt : input.availabilityConfirmedAt);
  const effectiveMs = confirmMs
    ?? toMs(input.currentListedPeriodStartedAt)
    ?? toMs(input.listedAt);

  if (effectiveMs == null) {
    // All three null — deadline genuinely unknown (rare post-backfill).
    return { kind, state: "unknown", daysSince: null, autoUnlistAt: null, nextConfirmAt: null, confirmEligible: true };
  }

  const daysSince = Math.max(0, Math.floor((now - effectiveMs) / DAY_MS));
  const autoUnlistAt = new Date(effectiveMs + rule.unlist * DAY_MS);
  const nextConfirmAt = new Date(effectiveMs + rule.cooldown * DAY_MS);
  const confirmEligible = now >= nextConfirmAt.getTime();

  let state: FreshnessState = "fresh";
  if (daysSince >= rule.unlist) state = "overdue";
  else if (daysSince >= rule.urgent) state = "urgent";
  else if (daysSince >= rule.reminder) state = "reminder";

  return { kind, state, daysSince, autoUnlistAt, nextConfirmAt, confirmEligible };
}

/** Short en-IN date, e.g. "12 Aug". */
export function formatShortDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
