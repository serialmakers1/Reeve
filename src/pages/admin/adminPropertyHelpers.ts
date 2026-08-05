/**
 * Pure, testable helpers for the admin Properties page (src/pages/admin/Properties.tsx).
 *
 * Kept free of React / Supabase so the behaviour that matters (status bucketing,
 * price resolution, status-target curation, update payload shape) is unit-tested
 * without jsdom / Radix / supabase-mock scaffolding.
 */
import { formatSalePrice } from "@/utils/property/formatSalePrice";
import { formatIndianRupee } from "@/features/search/domain/formatCurrency";

// ── Locality + city ─────────────────────────────────────────────────────────

/**
 * Clean single-line location string under the building name.
 *   ("Powai", "Mumbai") → "Powai, Mumbai"
 *   (null,   "Mumbai") → "Mumbai"
 *   ("Powai", null)    → "Powai"
 *   (null,   null)     → "—"
 *   ("Powai","powai ") → "Powai"  (equal ignoring case + whitespace → show once)
 */
export function formatLocalityCity(
  locality: string | null | undefined,
  city: string | null | undefined,
): string {
  const loc = locality?.trim() || "";
  const cty = city?.trim() || "";
  if (!loc && !cty) return "—";
  if (!loc) return cty;
  if (!cty) return loc;
  if (loc.toLowerCase() === cty.toLowerCase()) return loc;
  return `${loc}, ${cty}`;
}

// ── Application bucketing ────────────────────────────────────────────────────

export interface AppBucket {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
}

/** Statuses that never enter the operational total. */
const EXCLUDED_APP_STATUSES = new Set(["draft", "withdrawn", "expired"]);

const ACCEPTED_APP_STATUSES = new Set([
  "owner_accepted",
  "payment_pending",
  "payment_received",
  "kyc_pending",
  "kyc_passed",
  "kyc_failed",
  "agreement_pending",
  "lease_active",
]);

const REJECTED_APP_STATUSES = new Set(["owner_rejected", "platform_rejected"]);

// Pending (explicit, for documentation): submitted, platform_review, sent_to_owner,
// owner_countered, tenant_countered, on_hold. Any UNKNOWN/future status also falls
// here so `total` always reconciles rather than silently dropping a row.

export interface AppStatusRow {
  property_id: string;
  status: string;
}

/**
 * Build a per-property {total, accepted, pending, rejected} map.
 * `total` is derived from the three buckets (never an independent count), so the
 * displayed total always equals accepted + pending + rejected.
 */
export function bucketApplications(rows: AppStatusRow[]): Map<string, AppBucket> {
  const map = new Map<string, AppBucket>();
  for (const row of rows) {
    if (EXCLUDED_APP_STATUSES.has(row.status)) continue;

    let bucket = map.get(row.property_id);
    if (!bucket) {
      bucket = { total: 0, accepted: 0, pending: 0, rejected: 0 };
      map.set(row.property_id, bucket);
    }

    if (ACCEPTED_APP_STATUSES.has(row.status)) bucket.accepted += 1;
    else if (REJECTED_APP_STATUSES.has(row.status)) bucket.rejected += 1;
    else bucket.pending += 1; // known-pending OR unknown/future → pending

    bucket.total = bucket.accepted + bucket.pending + bucket.rejected;
  }
  return map;
}

// ── Price resolution ────────────────────────────────────────────────────────

export interface AdminPriceInput {
  id: string;
  status: string;
  listing_type: "rent" | "sale" | null;
  listed_rent: number | null;
  sale_price: number | null;
}

export interface AdminPrice {
  amount: string;
  kind: "Rent" | "Sale";
}

const EM_DASH = "—";

/**
 * Resolve the display price + kind tag for a row.
 * - sale               → sale_price via shared formatSalePrice; never final-rent.
 * - rent / null type   → listed_rent, or occupied final agreed rent when available.
 * Missing / non-positive → "—".
 */
export function resolveAdminPrice(
  p: AdminPriceInput,
  finalRentMap: Map<string, number>,
): AdminPrice {
  if (p.listing_type === "sale") {
    return { amount: formatSalePrice(p.sale_price) ?? EM_DASH, kind: "Sale" };
  }
  // rent or legacy null → rent
  const occupiedRent = p.status === "occupied" ? finalRentMap.get(p.id) : undefined;
  const rent = occupiedRent ?? p.listed_rent;
  const amount = rent != null && rent > 0 ? formatIndianRupee(rent) : EM_DASH;
  return { amount, kind: "Rent" };
}

// ── Status targets + update payload ─────────────────────────────────────────

/** Curated admin-selectable status targets (Commons only, no legacy PM). */
export const ADMIN_STATUS_TARGETS = [
  "draft",
  "pending_review",
  "listed",
  "unlisted",
  "archived",
] as const;

export type AdminStatusTarget = (typeof ADMIN_STATUS_TARGETS)[number];

/**
 * Selectable targets for a given current status, current status always excluded.
 * - edit_pending_review → [] (control hidden; must go through the edit-request flow).
 * - archived            → ["draft"] only (restore-to-Draft; never relist-without-review
 *                          and never a stale-timestamp direct-list/unlist/review).
 */
export function getStatusTargetsFor(currentStatus: string): AdminStatusTarget[] {
  if (currentStatus === "edit_pending_review") return [];
  if (currentStatus === "archived") return ["draft"];
  return ADMIN_STATUS_TARGETS.filter((s) => s !== currentStatus);
}

/**
 * Build the update payload for a status change.
 * Clears stale listing timestamps for any transition back into the pre-listing
 * pipeline (draft OR pending_review) — the DB trigger only fills these when null,
 * so without this a later approval/re-list would reuse an old listed_at /
 * availability confirmation.
 */
export function buildStatusUpdatePayload(target: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { status: target };
  if (target === "draft" || target === "pending_review") {
    payload.listed_at = null;
    payload.availability_confirmed_at = null;
  }
  return payload;
}
