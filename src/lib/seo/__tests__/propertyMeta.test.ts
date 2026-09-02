import { describe, it, expect } from "vitest";
import {
  type PropertySeoRow,
  isPresent,
  passesIndexabilityGate,
  listingWord,
  priceValue,
  priceText,
  formatINR,
  buildPropertyTitle,
  buildOgTitle,
  buildPropertyDescription,
  buildOgDescription,
  buildPropertyCanonical,
  htmlEscape,
} from "@/lib/seo/propertyMeta";

const complete: PropertySeoRow = {
  listing_type: "rent",
  building_name: "Prestige Lakeside Habitat",
  locality: "Whitefield",
  city: "Bengaluru",
  listed_rent: 45000,
  sale_price: null,
};

describe("isPresent", () => {
  it("treats null/undefined/empty/whitespace as absent", () => {
    expect(isPresent(null)).toBe(false);
    expect(isPresent(undefined)).toBe(false);
    expect(isPresent("")).toBe(false);
    expect(isPresent("   ")).toBe(false);
    expect(isPresent("x")).toBe(true);
    expect(isPresent(0)).toBe(true);
  });
});

describe("passesIndexabilityGate (complete record)", () => {
  it("passes when building + locality + city + rent + price are all valid", () => {
    expect(passesIndexabilityGate(complete)).toBe(true);
  });

  it("passes a sale record with sale_price", () => {
    expect(
      passesIndexabilityGate({
        ...complete,
        listing_type: "sale",
        listed_rent: null,
        sale_price: 9500000,
      }),
    ).toBe(true);
  });

  it("trims and passes a padded building name", () => {
    expect(passesIndexabilityGate({ ...complete, building_name: "  Prestige Lakeside Habitat  " })).toBe(true);
  });

  it("fails when any place field is missing or blank", () => {
    expect(passesIndexabilityGate({ ...complete, building_name: null })).toBe(false);
    expect(passesIndexabilityGate({ ...complete, building_name: "   " })).toBe(false);
    expect(passesIndexabilityGate({ ...complete, locality: "" })).toBe(false);
    expect(passesIndexabilityGate({ ...complete, city: null })).toBe(false);
  });

  it("fails on an unrecognized listing_type", () => {
    expect(passesIndexabilityGate({ ...complete, listing_type: null })).toBe(false);
    expect(passesIndexabilityGate({ ...complete, listing_type: "lease" })).toBe(false);
  });

  it("fails when the matching price is missing (rent w/o listed_rent, sale w/o sale_price)", () => {
    expect(passesIndexabilityGate({ ...complete, listed_rent: null })).toBe(false);
    expect(passesIndexabilityGate({ ...complete, listed_rent: 0 })).toBe(false);
    expect(
      passesIndexabilityGate({ ...complete, listing_type: "sale", listed_rent: null, sale_price: null }),
    ).toBe(false);
  });
});

describe("listingWord / priceValue", () => {
  it("maps recognized types and picks the matching price", () => {
    expect(listingWord(complete)).toBe("Rent");
    expect(priceValue(complete)).toBe(45000);
    expect(listingWord({ ...complete, listing_type: "sale", listed_rent: null, sale_price: 9500000 })).toBe("Sale");
    expect(priceValue({ ...complete, listing_type: "sale", listed_rent: null, sale_price: 9500000 })).toBe(9500000);
    expect(listingWord({ ...complete, listing_type: "x" })).toBeNull();
  });
});

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(45000)).toBe("₹45,000");
    expect(formatINR(9500000)).toBe("₹95,00,000");
    expect(formatINR(500)).toBe("₹500");
  });
});

describe("title / description / canonical (gate-passing form)", () => {
  it("title is the fixed full form with | Reeve", () => {
    expect(buildPropertyTitle(complete)).toBe(
      "Prestige Lakeside Habitat for Rent in Whitefield, Bengaluru | Reeve",
    );
  });

  it("meta description omits price and availability", () => {
    const d = buildPropertyDescription(complete);
    expect(d).toBe("Prestige Lakeside Habitat for rent in Whitefield, Bengaluru — view this property on Reeve.");
    expect(d).not.toMatch(/45,000|₹/);
  });

  it("canonical is absolute www; never apex", () => {
    const c = buildPropertyCanonical("abc-123");
    expect(c).toBe("https://www.reeve.in/property/abc-123");
    expect(c).not.toMatch(/https:\/\/reeve\.in/);
  });
});

describe("Open Graph values", () => {
  it("og:title drops the | Reeve suffix", () => {
    expect(buildOgTitle(complete)).toBe("Prestige Lakeside Habitat for Rent in Whitefield, Bengaluru");
  });

  it("og:description is price-led with no building-name repeat", () => {
    const og = buildOgDescription(complete);
    expect(og).toBe("₹45,000/month · View this property on Reeve");
    expect(og).not.toMatch(/Prestige/);
  });

  it("sale og:description has no /month", () => {
    const og = buildOgDescription({ ...complete, listing_type: "sale", listed_rent: null, sale_price: 9500000 });
    expect(og).toBe("₹95,00,000 · View this property on Reeve");
  });

  it("priceText adds /month for rent only", () => {
    expect(priceText(complete)).toBe("₹45,000/month");
    expect(priceText({ ...complete, listing_type: "sale", listed_rent: null, sale_price: 9500000 })).toBe("₹95,00,000");
  });
});

describe("htmlEscape (adversarial)", () => {
  it("neutralizes quotes, angle brackets, and ampersands", () => {
    const hostile = `A & B "</title><script>alert(1)</script>`;
    const out = htmlEscape(hostile);
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("</title>");
    expect(out).not.toContain('"');
    expect(out).toContain("&amp;");
    expect(out).toContain("&lt;");
    expect(out).toContain("&quot;");
  });

  it("does not double-escape a legitimate ampersand at the value level", () => {
    // Builders keep values raw; escaping happens once at the edge serializer.
    expect(buildOgTitle({ ...complete, building_name: "A & B Residency" })).toBe(
      "A & B Residency for Rent in Whitefield, Bengaluru",
    );
    expect(htmlEscape("A & B Residency")).toBe("A &amp; B Residency");
  });
});
