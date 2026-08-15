import { describe, it, expect } from "vitest";
import { SEARCH_PAGE_SIZE } from "@/features/search/data/searchContracts";
import type { SearchPropertiesInput } from "@/features/search/data/searchContracts";
import type { SearchPropertyRpcRow } from "@/features/search/data/searchResultContract";

describe("search contracts", () => {
  it("SEARCH_PAGE_SIZE is 20", () => {
    expect(SEARCH_PAGE_SIZE).toBe(20);
  });

  it("SearchPropertiesInput accepts a valid rent input", () => {
    const input: SearchPropertiesInput = {
      mode: "rent",
      geoPlaceIds: ["11111111-1111-1111-1111-111111111111"],
      distanceKm: null,
      propertyTypes: [],
      minPrice: null,
      maxPrice: null,
      bhk: ["2BHK"],
      furnishing: [],
      possessionStatus: [],
      availableBy: null,
      listedWithin: 7,
      availabilityConfirmedWithin: null,
      maxDeposit: null,
      maxLockIn: null,
      maxNotice: null,
      maxAnnualIncrease: null,
      maxMoveInCharges: null,
      petPolicy: [],
      maxBrokerage: null,
      rentBrokerageMaxFixed: null,
      rentBrokerageMaxMonths: null,
      zeroRentBrokerage: null,
      minCarpetArea: null,
      maxCarpetArea: null,
      minSuperBuiltUp: null,
      maxSuperBuiltUp: null,
      possessionBefore: null,
      negotiable: null,
      buyBrokerageMaxPct: null,
      reraDisclosed: null,
      khataType: [],
      propertyTaxPaid: null,
      parking4w: [],
      parking2w: [],
      amenities: [],
      hasVideoWalkthrough: null,
      minResponseRate: null,
      hasExperienceFeedback: null,
      sort: "newest",
      cursor: null,
      limit: 20,
    };
    expect(input.mode).toBe("rent");
    expect(input.cursor).toBeNull();
  });

  it("SearchPropertyRpcRow has no isFavourited field", () => {
    type Keys = keyof SearchPropertyRpcRow;
    type HasFav = "isFavourited" extends Keys ? true : false;
    const _check: HasFav = false;
    expect(_check).toBe(false);
  });
});
