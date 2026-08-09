import { describe, it, expect } from "vitest";
import {
  getOwnerEditPolicy,
  getOwnerEditPolicyForPayload,
  OWNER_REVIEW_CLEAR_IS_LIVE,
} from "@/config/property-fields";

describe("owner edit policy", () => {
  it("classifies LIVE structured/commercial fields", () => {
    for (const k of [
      "listed_rent", "sale_price", "available_from", "floor_number", "bathrooms",
      "parking_2w", "utility_water_included", "gas_type", "furnishing", "pet_policy",
      "streetview_show_in_listing", "possession_status",
    ]) {
      expect(getOwnerEditPolicy(k)).toBe("live");
    }
  });

  it("classifies REVIEW fields", () => {
    for (const k of [
      "building_notes", "building_rules", "parking_notes", "rera_registration_number",
      "youtube_walkthrough_url", "bhk", "property_type", "amenities", "furnishing_detail",
    ]) {
      expect(getOwnerEditPolicy(k)).toBe("review");
    }
  });

  it("fails closed to admin_only for identity/legacy/unknown columns", () => {
    for (const k of [
      "building_name", "street_address", "city", "latitude", "place_id", "landmark",
      "listing_type", "lister_role", "google_maps_url", "title", "description",
      "some_new_unclassified_column",
    ]) {
      expect(getOwnerEditPolicy(k)).toBe("admin_only");
    }
  });

  it("marks removal-asymmetric review text as clear-is-live", () => {
    expect(OWNER_REVIEW_CLEAR_IS_LIVE.has("building_notes")).toBe(true);
    expect(OWNER_REVIEW_CLEAR_IS_LIVE.has("rera_registration_number")).toBe(true);
    expect(OWNER_REVIEW_CLEAR_IS_LIVE.has("bhk")).toBe(false);
  });

  it("payload routing takes the strictest policy (admin_only > review > live)", () => {
    expect(getOwnerEditPolicyForPayload(["listed_rent"])).toBe("live");
    expect(getOwnerEditPolicyForPayload(["listed_rent", "building_notes"])).toBe("review");
    expect(getOwnerEditPolicyForPayload(["listed_rent", "building_name"])).toBe("admin_only");
    expect(getOwnerEditPolicyForPayload(["building_notes", "city"])).toBe("admin_only");
  });
});
