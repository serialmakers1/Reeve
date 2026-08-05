import { describe, it, expect } from "vitest";
import { formatSearchHeading } from "../state/formatSearchHeading";

describe("formatSearchHeading", () => {
  it("no mode → generic", () => {
    expect(formatSearchHeading({ mode: null, city: null, propertyTypes: [] })).toBe(
      "Search Properties",
    );
  });

  it("rent, 0 types, city", () => {
    expect(formatSearchHeading({ mode: "rent", city: "bengaluru", propertyTypes: [] })).toBe(
      "Rental Properties in Bengaluru",
    );
  });

  it("buy, 0 types, city", () => {
    expect(formatSearchHeading({ mode: "buy", city: "mumbai", propertyTypes: [] })).toBe(
      "Properties for Sale in Mumbai",
    );
  });

  it("rent, 1 type", () => {
    expect(
      formatSearchHeading({ mode: "rent", city: "bengaluru", propertyTypes: ["apartment"] }),
    ).toBe("Apartments for Rent in Bengaluru");
  });

  it("buy, 1 type, no city", () => {
    expect(formatSearchHeading({ mode: "buy", city: null, propertyTypes: ["villa"] })).toBe(
      "Villas for Sale",
    );
  });

  it("rent, 2 types → natural join", () => {
    expect(
      formatSearchHeading({
        mode: "rent",
        city: "pune",
        propertyTypes: ["apartment", "duplex_apartment"],
      }),
    ).toBe("Apartments & Duplex Apartments for Rent in Pune");
  });

  it("3+ types → falls back to generic (no comma-heavy string)", () => {
    expect(
      formatSearchHeading({
        mode: "rent",
        city: "pune",
        propertyTypes: ["apartment", "villa", "plot"],
      }),
    ).toBe("Rental Properties in Pune");
  });
});
