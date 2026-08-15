import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchPropertyResult } from "./searchResultContract";
import type { SearchPropertyRpcRow } from "./searchResultContract";
import { mapRpcRowToResult } from "./searchResultContract";
import type { SearchCursor, SearchSortKey } from "@/features/search/domain/searchTypes";
import type { SearchPropertiesInput } from "./searchContracts";
import { SEARCH_PAGE_SIZE } from "./searchContracts";
import { propertyTypesToCsv } from "@/features/search/domain/propertyTypes";

export interface SearchPropertiesResult {
  results: SearchPropertyResult[];
  nextCursor: SearchCursor | null;
  hasNextPage: boolean;
  /** True total over the fully-filtered, pre-cursor relation (Prompt 3 v2). */
  totalCount: number;
}

/**
 * Calls the search_compact_properties RPC and returns a paginated result.
 * Fetches limit+1 rows to detect hasNextPage without a count query.
 */
export async function searchProperties(
  input: SearchPropertiesInput,
  supabaseClient: SupabaseClient,
): Promise<SearchPropertiesResult> {
  const fetchLimit = input.limit + 1;

  const cursorNewest =
    input.cursor?.sort === "newest" ? input.cursor : null;
  const cursorPrice =
    input.cursor?.sort === "price_asc" || input.cursor?.sort === "price_desc"
      ? input.cursor
      : null;
  const cursorAvail =
    input.cursor?.sort === "availability_confirmed" ? input.cursor : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc("search_compact_properties_v3", {
    p_listing_type: input.mode === "buy" ? "sale" : "rent",
    p_geo_place_ids: input.geoPlaceIds.length > 0 ? input.geoPlaceIds : null,
    p_distance_km: input.distanceKm,
    p_property_type: propertyTypesToCsv(input.propertyTypes),
    p_min_price: input.minPrice,
    p_max_price: input.maxPrice,
    p_bhk: input.bhk.length > 0 ? input.bhk : null,
    p_furnishing: input.furnishing.length > 0 ? input.furnishing : null,
    p_possession_status: input.possessionStatus.length > 0 ? input.possessionStatus : null,
    p_available_by: input.availableBy,
    p_listed_within_days: input.listedWithin,
    p_availability_confirmed_within_days: input.availabilityConfirmedWithin,
    p_max_deposit: input.maxDeposit,
    p_max_lock_in_months: input.maxLockIn,
    p_max_notice_days: input.maxNotice,
    p_max_annual_increase: input.maxAnnualIncrease,
    p_max_move_in_charges: input.maxMoveInCharges,
    p_pet_policy: input.petPolicy.length > 0 ? input.petPolicy : null,
    p_zero_rent_brokerage: input.zeroRentBrokerage,
    p_max_rent_brokerage_fixed: input.rentBrokerageMaxFixed,
    p_min_carpet_area: input.minCarpetArea,
    p_max_carpet_area: input.maxCarpetArea,
    p_min_super_built_up: input.minSuperBuiltUp,
    p_max_super_built_up: input.maxSuperBuiltUp,
    p_possession_before: input.possessionBefore,
    p_negotiable: input.negotiable,
    p_max_sale_brokerage_pct: input.buyBrokerageMaxPct,
    p_rera_disclosed: input.reraDisclosed,
    p_khata_type: input.khataType.length > 0 ? input.khataType : null,
    p_property_tax_paid: input.propertyTaxPaid,
    p_parking_4w: input.parking4w.length > 0 ? input.parking4w : null,
    p_parking_2w: input.parking2w.length > 0 ? input.parking2w : null,
    p_amenities: input.amenities.length > 0 ? input.amenities : null,
    p_has_video_walkthrough: input.hasVideoWalkthrough,
    p_min_response_rate: input.minResponseRate,
    p_has_experience_feedback: input.hasExperienceFeedback,
    p_sort: input.sort,
    p_cursor_listed_at: cursorNewest?.listedAt ?? cursorPrice?.listedAt ?? cursorAvail?.listedAt ?? null,
    p_cursor_id: input.cursor?.id ?? null,
    p_cursor_price_amount: cursorPrice?.priceAmount ?? null,
    p_cursor_availability_confirmed_at: cursorAvail?.availabilityConfirmedAt ?? null,
    p_limit: fetchLimit,
  });

  if (error) throw error;

  const rawRows = (data ?? []) as (SearchPropertyRpcRow & { total_count?: number | string })[];
  const hasNextPage = rawRows.length > input.limit;
  const pageRows = hasNextPage ? rawRows.slice(0, input.limit) : rawRows;

  // total_count is a constant column on every row; 0 when the page is empty.
  const totalCount = rawRows.length > 0 ? Number(rawRows[0].total_count ?? 0) : 0;

  const results = pageRows.map((row) => mapRpcRowToResult(row, 0, 0, false));

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor: SearchCursor | null =
    hasNextPage && lastRow ? buildSearchCursor(lastRow, input.sort) : null;

  return { results, nextCursor, hasNextPage, totalCount };
}

/**
 * Overlays view and comment counts from get_property_counts into results.
 * Returns a new array; does not mutate the input.
 */
export async function overlayPropertyCounts(
  results: SearchPropertyResult[],
  supabaseClient: SupabaseClient,
): Promise<SearchPropertyResult[]> {
  if (results.length === 0) return results;

  const ids = results.map((r) => r.id);
  const { data, error } = await supabaseClient.rpc("get_property_counts", { p_property_ids: ids });
  if (error) {
    console.warn("overlayPropertyCounts: get_property_counts failed, using zeros", error);
    return results;
  }

  const countMap = new Map<string, { view_count: number; comment_count: number }>();
  for (const row of data ?? []) {
    countMap.set(row.property_id, { view_count: row.view_count, comment_count: row.comment_count });
  }

  return results.map((r) => {
    const counts = countMap.get(r.id);
    if (!counts) return r;
    return { ...r, viewCount: counts.view_count, commentCount: counts.comment_count };
  });
}

/**
 * Pure overlay — stamps isFavourited on each result from the provided set.
 * Returns a new array; does not mutate the input.
 */
export function overlayFavourites(
  results: SearchPropertyResult[],
  favouriteIds: Set<string>,
): SearchPropertyResult[] {
  return results.map((r) => ({ ...r, isFavourited: favouriteIds.has(r.id) }));
}

/**
 * Builds the SearchCursor for the last row of a page, keyed to the active sort.
 */
export function buildSearchCursor(row: SearchPropertyRpcRow, sort: SearchSortKey): SearchCursor {
  if (sort === "newest") {
    return { sort: "newest", listedAt: row.listed_at, id: row.property_id };
  }
  if (sort === "price_asc" || sort === "price_desc") {
    return { sort, listedAt: row.listed_at, id: row.property_id, priceAmount: row.price_amount };
  }
  return {
    sort: "availability_confirmed",
    listedAt: row.listed_at,
    availabilityConfirmedAt: row.availability_confirmed_at,
    id: row.property_id,
  };
}
