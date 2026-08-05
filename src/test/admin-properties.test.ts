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
import {
  formatLocalityCity,
  bucketApplications,
  resolveAdminPrice,
  getStatusTargetsFor,
  buildStatusUpdatePayload,
  ADMIN_STATUS_TARGETS,
} from "@/pages/admin/adminPropertyHelpers";

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

// ── adminPropertyHelpers ─────────────────────────────────────────────────────

describe("buildStatusUpdatePayload", () => {
  it("restore (archived → draft) targets draft and clears stale listing timestamps", () => {
    const payload = buildStatusUpdatePayload("draft");
    expect(payload.status).toBe("draft");
    // never "unlisted"
    expect(payload.status).not.toBe("unlisted");
    expect(payload.listed_at).toBeNull();
    expect(payload.availability_confirmed_at).toBeNull();
  });

  it("clears timestamps for any transition into draft OR pending_review", () => {
    for (const target of ["draft", "pending_review"]) {
      const payload = buildStatusUpdatePayload(target);
      expect(payload.listed_at).toBeNull();
      expect(payload.availability_confirmed_at).toBeNull();
    }
  });

  it("does NOT clear timestamps for listed / unlisted / archived targets", () => {
    for (const target of ["listed", "unlisted", "archived"]) {
      const payload = buildStatusUpdatePayload(target);
      expect(payload.status).toBe(target);
      expect("listed_at" in payload).toBe(false);
      expect("availability_confirmed_at" in payload).toBe(false);
    }
  });
});

describe("resolveAdminPrice", () => {
  const base = { id: "p1", listed_rent: 30000, sale_price: 9000000 };

  it("sale listing uses sale_price, tagged Sale", () => {
    const r = resolveAdminPrice({ ...base, status: "listed", listing_type: "sale" }, new Map());
    expect(r.kind).toBe("Sale");
    expect(r.amount).toContain("90"); // ₹90 Lakh
  });

  it("rent listing uses listed_rent, tagged Rent", () => {
    const r = resolveAdminPrice({ ...base, status: "listed", listing_type: "rent" }, new Map());
    expect(r.kind).toBe("Rent");
    expect(r.amount).toContain("30,000");
  });

  it("null listing_type falls back to rent", () => {
    const r = resolveAdminPrice({ ...base, status: "listed", listing_type: null }, new Map());
    expect(r.kind).toBe("Rent");
    expect(r.amount).toContain("30,000");
  });

  it("occupied rental listing uses final agreed rent override", () => {
    const finalRent = new Map([["p1", 32000]]);
    const r = resolveAdminPrice({ ...base, status: "occupied", listing_type: "rent" }, finalRent);
    expect(r.kind).toBe("Rent");
    expect(r.amount).toContain("32,000");
  });

  it("sale listing NEVER uses a final-rent override", () => {
    const finalRent = new Map([["p1", 32000]]);
    const r = resolveAdminPrice({ ...base, status: "occupied", listing_type: "sale" }, finalRent);
    expect(r.kind).toBe("Sale");
    expect(r.amount).not.toContain("32,000");
  });

  it("missing/non-positive price shows an em dash", () => {
    const r = resolveAdminPrice(
      { id: "p2", status: "draft", listing_type: "rent", listed_rent: null, sale_price: null },
      new Map(),
    );
    expect(r.amount).toBe("—");
  });
});

describe("bucketApplications", () => {
  const rows = (statuses: string[]) => statuses.map((status) => ({ property_id: "p1", status }));

  it("maps every known status into the correct bucket", () => {
    const accepted = ["owner_accepted", "payment_pending", "payment_received", "kyc_pending", "kyc_passed", "kyc_failed", "agreement_pending", "lease_active"];
    const rejected = ["owner_rejected", "platform_rejected"];
    const pending = ["submitted", "platform_review", "sent_to_owner", "owner_countered", "tenant_countered", "on_hold"];

    const map = bucketApplications(rows([...accepted, ...rejected, ...pending]));
    const b = map.get("p1")!;
    expect(b.accepted).toBe(accepted.length);
    expect(b.rejected).toBe(rejected.length);
    expect(b.pending).toBe(pending.length);
    expect(b.total).toBe(accepted.length + rejected.length + pending.length);
  });

  it("excludes draft / withdrawn / expired from the total", () => {
    const map = bucketApplications(rows(["draft", "withdrawn", "expired"]));
    expect(map.has("p1")).toBe(false); // no bucket created — nothing counted
  });

  it("total always equals accepted + pending + rejected", () => {
    const map = bucketApplications(rows(["owner_accepted", "submitted", "owner_rejected", "draft"]));
    const b = map.get("p1")!;
    expect(b.total).toBe(b.accepted + b.pending + b.rejected);
    expect(b.total).toBe(3);
  });

  it("counts an unknown/future status as pending so the total reconciles", () => {
    const map = bucketApplications(rows(["some_future_status"]));
    const b = map.get("p1")!;
    expect(b.pending).toBe(1);
    expect(b.total).toBe(1);
  });
});

describe("formatLocalityCity", () => {
  it("both values → 'locality, city'", () => {
    expect(formatLocalityCity("Powai", "Mumbai")).toBe("Powai, Mumbai");
  });
  it("duplicate values (case/whitespace-insensitive) → shown once", () => {
    expect(formatLocalityCity("Powai", "powai ")).toBe("Powai");
  });
  it("locality only", () => {
    expect(formatLocalityCity("Powai", null)).toBe("Powai");
  });
  it("city only", () => {
    expect(formatLocalityCity(null, "Mumbai")).toBe("Mumbai");
  });
  it("neither → em dash", () => {
    expect(formatLocalityCity(null, null)).toBe("—");
    expect(formatLocalityCity("", "  ")).toBe("—");
  });
});

describe("status targets", () => {
  it("ADMIN_STATUS_TARGETS is exactly the 5 curated Commons values", () => {
    expect([...ADMIN_STATUS_TARGETS]).toEqual(["draft", "pending_review", "listed", "unlisted", "archived"]);
  });

  it("never offers changes_requested, edit_pending_review, or legacy PM statuses", () => {
    const all = new Set<string>(ADMIN_STATUS_TARGETS);
    for (const bad of ["changes_requested", "edit_pending_review", ...LEGACY_PM_STATUSES]) {
      expect(all.has(bad)).toBe(false);
    }
  });

  it("getStatusTargetsFor excludes the current status", () => {
    expect(getStatusTargetsFor("listed")).not.toContain("listed");
    expect(getStatusTargetsFor("listed")).toContain("unlisted");
  });

  it("getStatusTargetsFor returns [] for edit_pending_review", () => {
    expect(getStatusTargetsFor("edit_pending_review")).toEqual([]);
  });

  it("getStatusTargetsFor returns exactly ['draft'] for archived (restore-only)", () => {
    expect(getStatusTargetsFor("archived")).toEqual(["draft"]);
  });
});
