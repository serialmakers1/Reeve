/**
 * Prompt 12 (D-164) — pure-function coverage for admin properties filter/search.
 *
 * The React page (Properties.tsx) wires these into shadcn Select + Input; the
 * behavior we care about (which rows survive a filter/search) is exercised
 * here without pulling in Radix + jsdom + supabase-mock scaffolding.
 */
import { describe, it, expect } from "vitest";
import {
  filterPropertiesBySearch,
  LEGACY_PM_STATUSES,
  STATUS_FILTER_OPTIONS,
} from "@/pages/admin/Properties";

type Row = Parameters<typeof filterPropertiesBySearch>[0][number];

const owner = (full_name: string | null, email: string | null, phone: string | null) => ({
  full_name, email, phone,
});

const fixture: Row[] = [
  { building_name: "Sunshine Apartments", owner: owner("Priya Menon", "priya@example.com", "+919812345678") },
  { building_name: "Lakeside Villas", owner: owner("Rahul Sharma", "rahul@example.com", "+919111222333") },
  { building_name: "Green Meadows", owner: owner(null, "unknown@example.com", null) },
  { building_name: "Serene Heights", owner: null },
];

describe("filterPropertiesBySearch (Prompt 12)", () => {
  it("returns all rows when query is empty or whitespace", () => {
    expect(filterPropertiesBySearch(fixture, "")).toHaveLength(4);
    expect(filterPropertiesBySearch(fixture, "   ")).toHaveLength(4);
  });

  it("matches building_name (case-insensitive substring)", () => {
    const hits = filterPropertiesBySearch(fixture, "sunshine");
    expect(hits.map((r) => r.building_name)).toEqual(["Sunshine Apartments"]);
    const hitsUpper = filterPropertiesBySearch(fixture, "LAKE");
    expect(hitsUpper.map((r) => r.building_name)).toEqual(["Lakeside Villas"]);
  });

  it("matches owner full_name", () => {
    const hits = filterPropertiesBySearch(fixture, "priya");
    expect(hits.map((r) => r.building_name)).toEqual(["Sunshine Apartments"]);
  });

  it("matches owner email", () => {
    const hits = filterPropertiesBySearch(fixture, "unknown@example");
    expect(hits.map((r) => r.building_name)).toEqual(["Green Meadows"]);
  });

  it("matches owner phone (partial)", () => {
    const hits = filterPropertiesBySearch(fixture, "9111222");
    expect(hits.map((r) => r.building_name)).toEqual(["Lakeside Villas"]);
  });

  it("returns nothing for a term that matches no row", () => {
    expect(filterPropertiesBySearch(fixture, "nonexistent-xyz")).toHaveLength(0);
  });

  it("handles owner: null (no crash, row excluded from owner-only matches)", () => {
    // "serene" only matches the building_name of the null-owner row.
    const hits = filterPropertiesBySearch(fixture, "serene");
    expect(hits.map((r) => r.building_name)).toEqual(["Serene Heights"]);
  });
});

describe("STATUS_FILTER_OPTIONS + LEGACY_PM_STATUSES (Prompt 12 shape contract)", () => {
  it("first option is 'All' and Commons statuses appear individually plus legacy_pm bucket", () => {
    const values = STATUS_FILTER_OPTIONS.map((o) => o.value);
    expect(values[0]).toBe("all");
    expect(values).toContain("draft");
    expect(values).toContain("pending_review");
    expect(values).toContain("changes_requested");
    expect(values).toContain("listed");
    expect(values).toContain("edit_pending_review");
    expect(values).toContain("unlisted");
    expect(values).toContain("archived");
    expect(values).toContain("legacy_pm");
  });

  it("LEGACY_PM_STATUSES lists exactly the pre-Commons statuses", () => {
    expect([...LEGACY_PM_STATUSES].sort()).toEqual(
      [
        "agreement_pending",
        "expiring",
        "inactive",
        "inspected",
        "inspection_accepted",
        "inspection_proposed",
        "inspection_scheduled",
        "occupied",
        "off_market",
        "turnover",
      ].sort(),
    );
  });
});
