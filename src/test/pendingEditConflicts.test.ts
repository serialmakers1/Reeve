import { describe, it, expect } from "vitest";
import { extractPendingConflictKeys } from "@/lib/pendingEditConflicts";

describe("extractPendingConflictKeys", () => {
  it("maps scalar review keys to themselves", () => {
    const keys = extractPendingConflictKeys({
      field_changes: { building_notes: "x", bhk: "3BHK", rera_registration_number: "R1" },
    });
    expect(keys).toEqual(new Set(["building_notes", "bhk", "rera_registration_number"]));
  });

  it("maps custom-addition deltas to their whole column", () => {
    const keys = extractPendingConflictKeys({
      field_changes: { amenities_building_add: ["rooftop"], furnishing_detail_add: [{ item: "hammock" }] },
    });
    expect(keys).toEqual(new Set(["amenities", "furnishing_detail"]));
  });

  it("mixes scalar + delta keys and ignores base_values / photo_changes", () => {
    const keys = extractPendingConflictKeys({
      field_changes: { building_notes: "x", furnishing_detail_add: [{ item: "hammock" }] },
      base_values: { building_notes: "old" },
      photo_changes: { add: [{ url: "u" }] },
    } as never);
    expect(keys).toEqual(new Set(["building_notes", "furnishing_detail"]));
  });

  it("returns empty for absent/empty payload", () => {
    expect(extractPendingConflictKeys(null)).toEqual(new Set());
    expect(extractPendingConflictKeys(undefined)).toEqual(new Set());
    expect(extractPendingConflictKeys({})).toEqual(new Set());
    expect(extractPendingConflictKeys({ field_changes: {} })).toEqual(new Set());
  });
});
