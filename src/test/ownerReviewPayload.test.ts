import { describe, it, expect } from "vitest";
import {
  normalizeReviewPayload,
  isReviewEmpty,
  reviewEquals,
  toSubmitArgs,
  type ReviewLiveBaseline,
} from "@/lib/ownerReviewPayload";

const baseline: ReviewLiveBaseline = {
  scalars: { building_notes: "ABC", bhk: "2BHK" },
  amenities: { building: ["lift", "gym"] },
  furnishing_detail: [{ item: "bed", count: 1 }, { item: "study table", count: 1 }],
};

describe("normalizeReviewPayload", () => {
  it("keeps a real scalar add/replace, drops a no-op retract to live value", () => {
    const changed = normalizeReviewPayload({ building_notes: "XYZ" }, [], baseline);
    expect(changed.scalars).toEqual({ building_notes: "XYZ" });
    const retract = normalizeReviewPayload({ building_notes: "ABC" }, [], baseline);
    expect(retract.scalars).toEqual({}); // equals live → dropped
  });

  it("drops a clearing value (handled by the live-clear path, not review)", () => {
    const cleared = normalizeReviewPayload({ building_notes: "   " }, [], baseline);
    expect(cleared.scalars).toEqual({});
  });

  it("keeps only new custom additions (not already-live ones)", () => {
    const n = normalizeReviewPayload(
      { amenities_add: ["gym", "rooftop lounge"], furnishing_add: [{ item: "study table" }, { item: "hammock" }] },
      [],
      baseline,
    );
    expect(n.amenities_add).toEqual(["rooftop lounge"]); // 'gym' is already live
    expect(n.furnishing_add.map((e) => e.item)).toEqual(["hammock"]); // 'study table' already live
  });

  it("reports empty for a fully-retracted payload", () => {
    expect(isReviewEmpty(normalizeReviewPayload({ building_notes: "ABC" }, [], baseline))).toBe(true);
    expect(isReviewEmpty(normalizeReviewPayload({ building_notes: "XYZ" }, [], baseline))).toBe(false);
  });

  it("reviewEquals ignores ordering", () => {
    const a = normalizeReviewPayload({ amenities_add: ["a", "b"] }, [{ url: "u1" }, { url: "u2" }], null);
    const b = normalizeReviewPayload({ amenities_add: ["b", "a"] }, [{ url: "u2" }, { url: "u1" }], null);
    expect(reviewEquals(a, b)).toBe(true);
  });
});

describe("toSubmitArgs → deployed RPC contract", () => {
  it("maps internal names to p_field_changes.amenities / furnishing_detail / p_photo_changes.add", () => {
    const n = normalizeReviewPayload(
      { building_notes: "XYZ", amenities_add: ["rooftop lounge"], furnishing_add: [{ item: "hammock" }] },
      [{ url: "https://images.reeve.in/properties/x/photos/1.jpg", section: "Hall" }],
      baseline,
    );
    const args = toSubmitArgs(n);
    expect(args.p_field_changes.building_notes).toBe("XYZ");
    expect(args.p_field_changes.amenities).toEqual({ building: ["rooftop lounge"] });
    expect(args.p_field_changes.furnishing_detail).toEqual([{ item: "hammock" }]);
    expect(args.p_photo_changes.add[0].url).toContain("images.reeve.in");
    // internal names must NEVER be RPC keys
    expect("amenities_add" in args.p_field_changes).toBe(false);
    expect("furnishing_add" in args.p_field_changes).toBe(false);
    expect("photo_add" in args.p_field_changes).toBe(false);
  });

  it("omits amenities/furnishing keys entirely when there are no additions", () => {
    const args = toSubmitArgs(normalizeReviewPayload({ building_notes: "XYZ" }, [], baseline));
    expect("amenities" in args.p_field_changes).toBe(false);
    expect("furnishing_detail" in args.p_field_changes).toBe(false);
  });
});
