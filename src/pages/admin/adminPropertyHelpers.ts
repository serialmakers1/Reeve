/**
 * Pure, testable helpers for the admin Properties page (src/pages/admin/Properties.tsx).
 *
 * Kept free of React / Supabase so the behaviour that matters (price resolution,
 * status-target curation, update payload shape, pagination + sort parsing) is
 * unit-tested without jsdom / Radix / supabase-mock scaffolding.
 *
 * Note: contact-request bucketing lives ONLY in the get_admin_properties_page SQL
 * (single source of truth). The page consumes the already-bucketed counts the RPC
 * returns; there is no JS bucketing helper to drift from the SQL.
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

// ── Contact-request counts (shape only; buckets computed server-side) ────────

export interface ContactRequestCounts {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
}

// ── Price resolution ────────────────────────────────────────────────────────

export interface AdminPriceInput {
  id: string;
  status: string;
  listing_type: string | null;
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

// ── Pagination ──────────────────────────────────────────────────────────────

export const ADMIN_PAGE_SIZE = 25;

/**
 * Largest page whose zero-based offset ((page-1)*ADMIN_PAGE_SIZE) still fits in a
 * Postgres int4. Guards the RPC's integer offset argument from overflow even for
 * values that pass Number.isSafeInteger().
 */
export const MAX_PAGE = Math.floor(2_147_483_647 / ADMIN_PAGE_SIZE) + 1;

/** Parse a URL page param → a positive in-range integer; anything else → 1. */
export function parsePageParam(raw: string | null | undefined): number {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 && value <= MAX_PAGE ? value : 1;
}

/** Total pages for a row count; 0 results still yields 1 page. */
export function totalPages(total: number, size: number = ADMIN_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

export type PageToken = number | "ellipsis";

/**
 * Compact page window: first, last, current and up to two neighbours each side,
 * with "ellipsis" markers for skipped ranges. Small totals show every page.
 */
export function getPageWindow(current: number, total: number): PageToken[] {
  if (total <= 1) return [1];
  const nums = new Set<number>([1, total]);
  for (let d = -2; d <= 2; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) nums.add(p);
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const out: PageToken[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push("ellipsis");
    out.push(n);
    prev = n;
  }
  return out;
}

// ── Sort ────────────────────────────────────────────────────────────────────

export const ADMIN_SORT_OPTIONS = [
  { value: "latest", label: "Latest listed" },
  { value: "views", label: "Highest views" },
  { value: "contact", label: "Most contact requests" },
] as const;

export type AdminSort = "latest" | "views" | "contact";

/** Validate a URL sort param; unknown → "latest". */
export function validateSort(raw: string | null | undefined): AdminSort {
  return raw === "views" || raw === "contact" ? raw : "latest";
}

// ── Listing-type filter ─────────────────────────────────────────────────────

export const LISTING_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sale", label: "Buy" },
  { value: "rent", label: "Rent" },
] as const;

export type ListingTypeFilter = "all" | "sale" | "rent";

/** Validate a URL listing-type param; Buy → "sale", Rent → "rent", else "all". */
export function validateListingType(raw: string | null | undefined): ListingTypeFilter {
  return raw === "sale" || raw === "rent" ? raw : "all";
}
