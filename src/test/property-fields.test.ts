/**
 * Regression tests for the Phase 1.5 Prompt 2 field spec (D-128).
 * Guarantees the spec stays self-consistent as Prompts 3–5 wire it in
 * and Prompts 7–10 add India / rent-sale fields.
 */
import { describe, it, expect } from "vitest";
import {
  PROPERTY_FIELDS,
  OWNER_FORM_SECTIONS,
  formatFieldValue,
  getFieldLabel,
  getFieldsForSurface,
  getOwnerFieldsGrouped,
  isFieldVisible,
  validateSpec,
} from "@/config/property-fields";

describe("property-fields spec", () => {
  it("passes validateSpec()", () => {
    expect(validateSpec(PROPERTY_FIELDS)).toEqual([]);
  });

  it("has no duplicate keys", () => {
    const keys = PROPERTY_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes every required-owner field cited by the submit trigger", () => {
    const required = [
      "locality",
      "building_name",
      "bhk",
      "listed_rent",
      "security_deposit_amount",
      "furnishing",
      "available_from",
    ];
    for (const key of required) {
      const field = PROPERTY_FIELDS.find((f) => f.key === key);
      expect(field, `missing spec entry for ${key}`).toBeDefined();
      expect(field?.requiredOwner, `${key} must be requiredOwner`).toBe(true);
    }
  });

  it("locks all Tier 1 fields per commons-status-flow.md", () => {
    const tier1 = ["building_name", "street_address", "city", "state", "pincode", "bhk", "property_type"];
    for (const key of tier1) {
      const field = PROPERTY_FIELDS.find((f) => f.key === key);
      expect(field?.tier, `${key} must be tier=locked`).toBe("locked");
    }
  });

  it("groups owner fields by section", () => {
    const grouped = getOwnerFieldsGrouped(PROPERTY_FIELDS);
    expect(grouped.get("location")?.map((f) => f.key)).toContain("building_name");
    expect(grouped.get("rent_deposit")?.map((f) => f.key)).toContain("security_deposit_amount");
    expect(grouped.get("inside")?.map((f) => f.key)).toContain("furnishing");
    // Sale section wired in Prompt 10a (D-161, 8 fields) + Phase 1.5 addendum
    // (D-166) added sale_brokerage_pct → 9.
    expect(grouped.get("sale")?.length).toBe(9);
  });

  it("filters by surface", () => {
    const publicFields = getFieldsForSurface(PROPERTY_FIELDS, "public_detail");
    expect(publicFields.some((f) => f.key === "listed_rent")).toBe(true);
    expect(publicFields.some((f) => f.key === "flat_number")).toBe(false);

    const adminFields = getFieldsForSurface(PROPERTY_FIELDS, "admin_form");
    expect(adminFields.some((f) => f.key === "flat_number")).toBe(true);
  });

  it("resolves surface-specific labels", () => {
    const streetAddress = PROPERTY_FIELDS.find((f) => f.key === "street_address")!;
    expect(getFieldLabel(streetAddress, "owner_form")).toBe("Full address");
    expect(getFieldLabel(streetAddress, "public_detail")).toBe("Address");
  });

  it("formats values with custom + option-based formatters", () => {
    const rent = PROPERTY_FIELDS.find((f) => f.key === "listed_rent")!;
    expect(formatFieldValue(rent, 40000)).toBe("₹40,000/mo");
    expect(formatFieldValue(rent, null)).toBe("—");

    const bhk = PROPERTY_FIELDS.find((f) => f.key === "bhk")!;
    expect(formatFieldValue(bhk, "2BHK")).toBe("2 BHK");
  });

  it("respects visibleWhen predicates", () => {
    // F1-B3c: gas_type is now gated on listing_type (rent-only) rather than
    // utility_gas_included — the supply type describes property infrastructure
    // regardless of who pays the bill.
    const gasType = PROPERTY_FIELDS.find((f) => f.key === "gas_type")!;
    expect(isFieldVisible(gasType, { listing_type: "rent" })).toBe(true);
    expect(isFieldVisible(gasType, { listing_type: "sale" })).toBe(false);
  });

  it("defines every owner form section including sale placeholder", () => {
    for (const key of Object.keys(OWNER_FORM_SECTIONS)) {
      expect(OWNER_FORM_SECTIONS[key as keyof typeof OWNER_FORM_SECTIONS].label).toBeTruthy();
    }
  });

  // Prompt 8 (D-159) — India fields wired end-to-end. Guardrails so the
  // water_storage CHECK-string options stay in sync with commons-schema.md §19.
  it("water_storage exposes exactly the 4 CHECK-enforced options", () => {
    const water = PROPERTY_FIELDS.find((f) => f.key === "water_storage")!;
    expect(water).toBeDefined();
    expect(water.input).toBe("select");
    expect(water.options?.map((o) => o.value).sort()).toEqual(
      ["both", "none", "overhead_only", "sump_only"].sort(),
    );
  });

  it("parking_count fields are omitted from public audiences (compound-formatter renders them)", () => {
    for (const key of ["parking_2w_count", "parking_4w_count"]) {
      const f = PROPERTY_FIELDS.find((x) => x.key === key)!;
      expect(f, `missing spec entry for ${key}`).toBeDefined();
      expect(f.audiences).not.toContain("public_detail");
    }
  });

  it("annual_rent_increase_pct public formatter matches D-136 copy", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "annual_rent_increase_pct")!;
    expect(f.display?.(5)).toBe("5% annually");
    expect(f.display?.(null)).toBe("");
  });

  // Prompt 10a (D-161) — rent/sale wire.
  it("listing_type is Tier-1 locked, required for owner, and has both enum values", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "listing_type")!;
    expect(f).toBeDefined();
    expect(f.tier).toBe("locked");
    expect(f.requiredOwner).toBe(true);
    expect(f.options?.map((o) => o.value).sort()).toEqual(["rent", "sale"]);
  });

  it("possession_date is visibleWhen possession_status === 'under_construction'", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "possession_date")!;
    expect(f.visibleWhen).toBeDefined();
    expect(isFieldVisible(f, { possession_status: "under_construction" })).toBe(true);
    expect(isFieldVisible(f, { possession_status: "ready_to_move" })).toBe(false);
    expect(isFieldVisible(f, { possession_status: "new_launch" })).toBe(false);
  });

  it("rent-only fields hide on sale listings", () => {
    for (const key of ["notice_period_months", "annual_rent_increase_pct"]) {
      const f = PROPERTY_FIELDS.find((x) => x.key === key)!;
      expect(f.visibleWhen, `${key} missing visibleWhen`).toBeDefined();
      expect(isFieldVisible(f, { listing_type: "sale" })).toBe(false);
      expect(isFieldVisible(f, { listing_type: "rent" })).toBe(true);
      // Legacy rows without listing_type default to rent-visible (fail-safe).
      expect(isFieldVisible(f, {})).toBe(true);
    }
  });

  it("all 8 sale-only fields ownerSection === 'sale' and audiences include all 3 surfaces", () => {
    const saleFields = [
      "sale_price",
      "price_negotiable",
      "expected_price_per_sqft",
      "possession_status",
      "possession_date",
      "rera_registration_number",
      "khata_type",
      "property_tax_paid_upto",
    ];
    for (const key of saleFields) {
      const f = PROPERTY_FIELDS.find((x) => x.key === key)!;
      expect(f, `missing spec entry for ${key}`).toBeDefined();
      expect(f.ownerSection).toBe("sale");
      expect(f.audiences).toEqual(expect.arrayContaining(["owner_form", "admin_form", "public_detail"]));
    }
  });

  it("sale-required fields per D-160 trigger contract", () => {
    for (const key of ["sale_price", "possession_status"]) {
      const f = PROPERTY_FIELDS.find((x) => x.key === key)!;
      expect(f.requiredOwner, `${key} must be requiredOwner`).toBe(true);
    }
  });

  // Prompt 10b (D-162) — public grid extended with sale-side rows.
  it("PUBLIC_DETAILS_GRID_KEYS includes the 5 sale-side rows and excludes the bespoke sale price fields", async () => {
    const mod = await import("@/config/property-fields");
    const keys = mod.PUBLIC_DETAILS_GRID_KEYS as readonly string[];
    for (const key of [
      "possession_status",
      "possession_date",
      "rera_registration_number",
      "khata_type",
      "property_tax_paid_upto",
    ]) {
      expect(keys, `${key} should be in PUBLIC_DETAILS_GRID_KEYS`).toContain(key);
    }
    for (const key of ["sale_price", "price_negotiable", "expected_price_per_sqft"]) {
      expect(keys, `${key} rendered bespoke in prominent price block; must not be in grid`).not.toContain(key);
    }
  });

  // Phase 1.5 addendum (D-166) + Sync Prompt 3 (D-169) — move-in charges + brokerage split.
  it("all addendum spec entries exist with expected shape (post D-169 brokerage split)", () => {
    for (const key of ["move_in_charges_amount", "rent_brokerage_type", "rent_brokerage_fixed_amount", "rent_brokerage_months", "sale_brokerage_pct"]) {
      const f = PROPERTY_FIELDS.find((x) => x.key === key);
      expect(f, `missing spec entry for ${key}`).toBeDefined();
      expect(f!.audiences).toEqual(expect.arrayContaining(["owner_form", "admin_form", "public_detail"]));
      expect(f!.editableBy).toEqual(expect.arrayContaining(["owner", "admin"]));
      expect(f!.visibleWhen, `${key} must define visibleWhen`).toBeDefined();
    }
  });

  it("D-169: old rent_brokerage_amount entry is removed from spec", () => {
    expect(PROPERTY_FIELDS.find((x) => x.key === "rent_brokerage_amount")).toBeUndefined();
  });

  it("rent_brokerage_fixed_amount visibleWhen: rent listings + type=fixed only", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "rent_brokerage_fixed_amount")!;
    expect(isFieldVisible(f, { listing_type: "sale", rent_brokerage_type: "fixed" })).toBe(false);
    expect(isFieldVisible(f, { listing_type: "rent", rent_brokerage_type: "none" })).toBe(false);
    expect(isFieldVisible(f, { listing_type: "rent", rent_brokerage_type: "months" })).toBe(false);
    expect(isFieldVisible(f, { listing_type: "rent", rent_brokerage_type: "fixed" })).toBe(true);
    // Legacy null listing_type counts as rent (fail-safe per D-161)
    expect(isFieldVisible(f, { rent_brokerage_type: "fixed" })).toBe(true);
  });

  it("rent_brokerage_months visibleWhen: rent listings + type=months only", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "rent_brokerage_months")!;
    expect(isFieldVisible(f, { listing_type: "sale", rent_brokerage_type: "months" })).toBe(false);
    expect(isFieldVisible(f, { listing_type: "rent", rent_brokerage_type: "fixed" })).toBe(false);
    expect(isFieldVisible(f, { listing_type: "rent", rent_brokerage_type: "months" })).toBe(true);
    expect(isFieldVisible(f, { rent_brokerage_type: "months" })).toBe(true);
  });

  it("sale_brokerage_pct is sale-only (strict equality — sale is opt-in)", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "sale_brokerage_pct")!;
    expect(isFieldVisible(f, { listing_type: "sale" })).toBe(true);
    expect(isFieldVisible(f, { listing_type: "rent" })).toBe(false);
    expect(isFieldVisible(f, { listing_type: null })).toBe(false); // legacy defaults to rent
    expect(isFieldVisible(f, {})).toBe(false);
    // CHECK 0-10 mirrored on spec.max
    expect(f.max).toBe(10);
  });

  it("addendum fields are NOT in PUBLIC_DETAILS_GRID_KEYS (bespoke public rendering per D-166/D-169)", async () => {
    const mod = await import("@/config/property-fields");
    const keys = mod.PUBLIC_DETAILS_GRID_KEYS as readonly string[];
    for (const key of ["move_in_charges_amount", "rent_brokerage_type", "rent_brokerage_fixed_amount", "rent_brokerage_months", "sale_brokerage_pct"]) {
      expect(keys, `${key} must render bespoke in rent/sale Card, not the details grid`).not.toContain(key);
    }
  });

  // Sync Prompt 3 (D-169) — gas_type gets 'none' option; pet_policy stays canonical.
  it("gas_type spec has 3 options including 'none' (maps to NULL on save)", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "gas_type")!;
    const values = f.options?.map((o) => o.value).sort();
    expect(values).toEqual(["cylinder", "none", "pipeline"]);
    expect(f.options?.find((o) => o.value === "none")?.label).toBe("None");
  });

  it("pet_policy spec exposes exactly the 4 canonical options (post Sync P1 data cleanup)", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "pet_policy")!;
    expect(f.input).toBe("select");
    expect(f.options?.map((o) => o.value).sort()).toEqual(["all_welcome", "case_by_case", "not_allowed", "small_only"]);
  });

  // Sync Prompt 1 (D-167) — audience corrections.
  it("security_deposit_months audiences include owner_form + public_detail (matches actual usage)", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "security_deposit_months")!;
    expect(f).toBeDefined();
    expect(f.audiences).toEqual(expect.arrayContaining(["owner_form", "admin_form", "public_detail"]));
    expect(f.editableBy).toEqual(expect.arrayContaining(["owner", "admin"]));
  });

  // Sync Prompt 2 (D-168) — datePickerOptions on all 3 date fields.
  it("available_from has warnOnPast + maxDaysFromNow=90 in datePickerOptions", () => {
    const f = PROPERTY_FIELDS.find((x) => x.key === "available_from")!;
    expect(f.datePickerOptions).toBeDefined();
    expect(f.datePickerOptions?.warnOnPast).toBe("Available from is in the past — is this correct?");
    expect(f.datePickerOptions?.maxDaysFromNow).toBe(90);
  });

  it("possession_date and property_tax_paid_upto have datePickerOptions defined (empty ok)", () => {
    for (const key of ["possession_date", "property_tax_paid_upto"]) {
      const f = PROPERTY_FIELDS.find((x) => x.key === key)!;
      expect(f.datePickerOptions, `${key} must declare datePickerOptions (marks it as date-picker in SpecField)`).toBeDefined();
      expect(f.datePickerOptions?.warnOnPast).toBeUndefined();
      expect(f.datePickerOptions?.maxDaysFromNow).toBeUndefined();
    }
  });

  it("state and pincode audiences exclude public_detail (no render site yet)", () => {
    for (const key of ["state", "pincode"]) {
      const f = PROPERTY_FIELDS.find((x) => x.key === key)!;
      expect(f, `missing spec entry for ${key}`).toBeDefined();
      expect(f.audiences, `${key} should not claim public_detail until a render site exists`).not.toContain("public_detail");
      expect(f.audiences).toEqual(expect.arrayContaining(["owner_form", "admin_form"]));
    }
  });
});
