import { describe, it, expect } from "vitest";
import {
  hydratePersistedReviewPayload,
  normalizeReviewPayload,
  reviewEquals,
  type ReviewLiveBaseline,
} from "@/lib/ownerReviewPayload";

// Simulates the refresh/reload contract: a persisted pending edit-request payload
// (deployed shape) is re-read on remount and must reconstruct the same "Under review"
// state — not dirty, staged photos intact and not duplicated.
const LIVE: ReviewLiveBaseline = {
  scalars: { building_notes: "old about", bhk: "2BHK" },
  amenities: { building: ["lift"] },
  furnishing_detail: [{ item: "sofa" }],
};

// deterministic id generator for tests
let seq = 0;
const genId = () => `t${seq++}`;

const PERSISTED = {
  field_changes: {
    building_notes: "brand new about",
    bhk: "3BHK",
    amenities_building_add: ["rooftop garden"],
    furnishing_detail_add: [{ item: "hammock" }],
  },
  base_values: { building_notes: "old about", bhk: "2BHK" },
  photo_changes: { add: [{ url: "https://images.reeve.in/properties/p/photos/new1.jpg", section: "living", is_floor_plan: false }] },
};

describe("hydratePersistedReviewPayload (reload contract)", () => {
  it("maps deployed *_add keys back to internal draft names + scalar proposals", () => {
    seq = 0;
    const h = hydratePersistedReviewPayload(PERSISTED, genId);
    expect(h.draftFc.building_notes).toBe("brand new about");
    expect(h.draftFc.bhk).toBe("3BHK");
    expect(h.draftFc.amenities_add).toEqual(["rooftop garden"]);
    expect(h.draftFc.furnishing_add).toEqual([{ item: "hammock" }]);
    expect(h.proposedScalars).toEqual({ building_notes: "brand new about", bhk: "3BHK" });
    expect(h.addAmenities).toEqual(["rooftop garden"]);
    expect(h.addFurnishing).toEqual([{ item: "hammock" }]);
  });

  it("reconstructs staged photos with a temp id, exactly once (no duplication)", () => {
    seq = 0;
    const h = hydratePersistedReviewPayload(PERSISTED, genId);
    expect(h.staged).toHaveLength(1);
    expect(h.staged[0]).toEqual({
      temp_id: "t0",
      url: "https://images.reeve.in/properties/p/photos/new1.jpg",
      section: "living",
      is_floor_plan: false,
    });
  });

  it("round-trips to a non-dirty state: re-normalizing the hydrated draft equals the saved baseline", () => {
    seq = 0;
    const h = hydratePersistedReviewPayload(PERSISTED, genId);
    const pendingBaseline = normalizeReviewPayload(h.draftFc, h.staged, LIVE);
    // A reload with no new edits: the reconstructed draft must equal the baseline (not dirty).
    seq = 0;
    const reloaded = hydratePersistedReviewPayload(PERSISTED, genId);
    const reloadedNormalized = normalizeReviewPayload(reloaded.draftFc, reloaded.staged, LIVE);
    expect(reviewEquals(reloadedNormalized, pendingBaseline)).toBe(true);
  });

  it("does not confuse a newer unsent edit with the persisted baseline (dirty detection still works)", () => {
    seq = 0;
    const h = hydratePersistedReviewPayload(PERSISTED, genId);
    const pendingBaseline = normalizeReviewPayload(h.draftFc, h.staged, LIVE);
    // owner types a further change after reload
    const newerDraft = { ...h.draftFc, building_rules: "no pets" };
    const newerNormalized = normalizeReviewPayload(newerDraft, h.staged, LIVE);
    expect(reviewEquals(newerNormalized, pendingBaseline)).toBe(false);
  });

  it("handles an empty / absent payload", () => {
    expect(hydratePersistedReviewPayload(null).staged).toEqual([]);
    expect(hydratePersistedReviewPayload(undefined).draftFc).toEqual({});
    expect(hydratePersistedReviewPayload({}).proposedScalars).toEqual({});
  });
});
