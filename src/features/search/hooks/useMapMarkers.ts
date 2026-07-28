import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMapMarkers } from "@/features/search/data/searchDataClient";
import { useSearchState } from "@/features/search/state/useSearchState";
import type { MapMarkersInput } from "@/features/search/data/searchMarkerContract";
import type { RentFilters, BuyFilters } from "@/features/search/domain/searchTypes";

export function useMapMarkers(enabled: boolean) {
  const { state } = useSearchState();
  const bounds = state.mapBounds;
  const mode = state.context.mode;
  const city = state.context.city;

  const rf = state.filters as RentFilters;
  const bf = state.filters as BuyFilters;
  const f = state.filters as RentFilters & BuyFilters;
  const isRent = mode === "rent";

  // Build complete membership-filter input — same mappings as buildSearchInput.ts
  // Constructed unconditionally so it can serve as a stable TanStack query key.
  const input: MapMarkersInput = {
    listingType: isRent ? "rent" : "sale",
    city: city ?? "",
    bounds: bounds ?? { ne: { lat: 0, lng: 0 }, sw: { lat: 0, lng: 0 } },

    // Shared
    locationIds: state.context.locations.map((l) => l.id),
    propertyType: state.context.propertyType ?? null,
    bhk: f.bhk ?? [],
    furnishing: f.furnishing ?? [],
    minPrice: f.minPrice ?? null,
    maxPrice: f.maxPrice ?? null,
    parking4w: f.parking4w ?? [],
    parking2w: f.parking2w ?? [],
    amenities: f.amenities ?? [],
    hasVideoWalkthrough: f.hasVideoWalkthrough ?? null,
    minResponseRate: f.minResponseRate ?? null,
    hasExperienceFeedback: f.hasExperienceFeedback ?? null,

    // Rent-only (pass null/[] when in buy mode to match RPC defaults)
    availableBy: isRent ? (rf.availableBy ?? null) : null,
    listedWithinDays: isRent ? (rf.listedWithin ?? null) : null,
    availabilityConfirmedWithinDays: isRent
      ? (rf.availabilityConfirmedWithin ?? null)
      : null,
    maxDeposit: isRent ? (rf.maxDeposit ?? null) : null,
    maxLockInMonths: isRent ? (rf.maxLockIn ?? null) : null,
    maxNoticeDays: isRent ? (rf.maxNotice ?? null) : null,
    maxAnnualIncrease: isRent ? (rf.maxAnnualIncrease ?? null) : null,
    maxMoveInCharges: isRent ? (rf.maxMoveInCharges ?? null) : null,
    petPolicy: isRent ? (rf.petPolicy ?? []) : [],
    zeroRentBrokerage: isRent ? (rf.zeroRentBrokerage ?? null) : null,
    maxRentBrokerageFixed: isRent ? (rf.maxBrokerage ?? null) : null,

    // Buy-only
    possessionStatus: !isRent ? (bf.possessionStatus ?? []) : [],
    possessionBefore: !isRent ? (bf.possessionBefore ?? null) : null,
    negotiable: !isRent ? (bf.negotiable ?? null) : null,
    minCarpetArea: !isRent ? (bf.minCarpetArea ?? null) : null,
    maxCarpetArea: !isRent ? (bf.maxCarpetArea ?? null) : null,
    minSuperBuiltUp: !isRent ? (bf.minSuperBuiltUp ?? null) : null,
    maxSuperBuiltUp: !isRent ? (bf.maxSuperBuiltUp ?? null) : null,
    maxSaleBrokeragePct: !isRent ? (bf.maxBrokerage ?? null) : null,
    reraDisclosed: !isRent ? (bf.reraDisclosed ?? null) : null,
    khataType: !isRent ? (bf.khataType ?? []) : [],
    propertyTaxPaid: !isRent ? (bf.propertyTaxPaid ?? null) : null,
  };

  return useQuery({
    // Full input object as key — any filter change auto-invalidates the cache
    queryKey: ["map-markers", input],
    queryFn: async () => {
      if (!bounds || !mode || !city) return [];
      return fetchMapMarkers({ ...input, bounds, city }, supabase as any);
    },
    enabled: enabled && !!bounds && !!mode && !!city,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
