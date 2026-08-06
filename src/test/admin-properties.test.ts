/**
 * Focused pure-function coverage for the admin Properties page helpers.
 *
 * Contact-request status→bucket mapping lives only in the get_admin_properties_page
 * SQL (single source of truth) and is verified with read-only SQL, not here.
 */
import { describe, it, expect } from "vitest";
import { STATUS_FILTER_OPTIONS } from "@/pages/admin/Properties";
import {
  formatLocalityCity,
  resolveAdminPrice,
  getStatusTargetsFor,
  buildStatusUpdatePayload,
  ADMIN_STATUS_TARGETS,
  parsePageParam,
  totalPages,
  getPageWindow,
  validateSort,
  validateListingType,
  MAX_PAGE,
  ADMIN_PAGE_SIZE,
} from "@/pages/admin/adminPropertyHelpers";

describe("STATUS_FILTER_OPTIONS (dropdown shape)", () => {
  it("starts with All and includes Commons statuses + legacy bucket", () => {
    const values = STATUS_FILTER_OPTIONS.map((o) => o.value);
    expect(values[0]).toBe("all");
    for (const v of ["draft", "pending_review", "changes_requested", "listed", "edit_pending_review", "unlisted", "archived", "legacy_pm"]) {
      expect(values).toContain(v);
    }
  });
});

describe("buildStatusUpdatePayload", () => {
  it("restore (archived → draft) targets draft and clears stale listing timestamps", () => {
    const payload = buildStatusUpdatePayload("draft");
    expect(payload.status).toBe("draft");
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
    expect(r.amount).toContain("90");
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
    for (const bad of ["changes_requested", "edit_pending_review", "occupied", "off_market", "inactive"]) {
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

describe("parsePageParam", () => {
  it("valid positive integer passes through", () => {
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam("1")).toBe(1);
  });
  it("zero / negative / NaN → 1", () => {
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam(null)).toBe(1);
  });
  it("fractional / infinite → 1", () => {
    expect(parsePageParam("1.5")).toBe(1);
    expect(parsePageParam("Infinity")).toBe(1);
  });
  it("above MAX_PAGE (offset would overflow int) → 1", () => {
    expect(parsePageParam(String(MAX_PAGE + 1))).toBe(1);
    expect(parsePageParam("9999999999999")).toBe(1);
    // sanity: (MAX_PAGE-1)*pageSize stays within int4
    expect((MAX_PAGE - 1) * ADMIN_PAGE_SIZE).toBeLessThanOrEqual(2_147_483_647);
  });
});

describe("totalPages", () => {
  it("0 results → 1 page", () => {
    expect(totalPages(0)).toBe(1);
  });
  it("full and partial pages", () => {
    expect(totalPages(25)).toBe(1);
    expect(totalPages(26)).toBe(2);
    expect(totalPages(143)).toBe(6); // 143/25 = 5.72 → 6
  });
});

describe("getPageWindow", () => {
  it("small totals show every page", () => {
    expect(getPageWindow(1, 3)).toEqual([1, 2, 3]);
  });
  it("large totals collapse with ellipses around current ±2", () => {
    expect(getPageWindow(5, 20)).toEqual([1, "ellipsis", 3, 4, 5, 6, 7, "ellipsis", 20]);
  });
  it("current near the start has no leading ellipsis", () => {
    expect(getPageWindow(1, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });
  it("current near the end has no trailing ellipsis", () => {
    expect(getPageWindow(20, 20)).toEqual([1, "ellipsis", 18, 19, 20]);
  });
});

describe("validateSort", () => {
  it("accepts the three real sorts", () => {
    expect(validateSort("latest")).toBe("latest");
    expect(validateSort("views")).toBe("views");
    expect(validateSort("contact")).toBe("contact");
  });
  it("invalid / null → latest", () => {
    expect(validateSort("price_asc")).toBe("latest");
    expect(validateSort(null)).toBe("latest");
  });
});

describe("validateListingType", () => {
  it("Buy maps to sale, Rent maps to rent", () => {
    expect(validateListingType("sale")).toBe("sale");
    expect(validateListingType("rent")).toBe("rent");
  });
  it("invalid / null → all", () => {
    expect(validateListingType("condo")).toBe("all");
    expect(validateListingType(null)).toBe("all");
  });
});
