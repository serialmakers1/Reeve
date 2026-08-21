import { describe, it, expect } from "vitest";
import { buildGoogleMapsLink, type GoogleMapsLinkInput } from "@/lib/googleMapsLink";

describe("buildGoogleMapsLink", () => {
  it("uses coordinates only; ignores place_id even if present in input", () => {
    // Cast through unknown to reproduce the stale-bug scenario and prove it never leaks.
    const url = buildGoogleMapsLink({
      place_id: "ChIJ_test",
      latitude: 12.9716,
      longitude: 77.5946,
      formatted_address: "somewhere",
    } as unknown as GoogleMapsLinkInput);
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=12.9716%2C77.5946");
    expect(url).not.toContain("query_place_id");
  });

  it("falls back to formatted_address when coordinates missing; ignores place_id", () => {
    const url = buildGoogleMapsLink({
      place_id: "ChIJ_abc",
      latitude: null,
      longitude: null,
      formatted_address: "Prestige Lakeside, Bengaluru",
    } as unknown as GoogleMapsLinkInput);
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=Prestige%20Lakeside%2C%20Bengaluru");
    expect(url).not.toContain("query_place_id");
  });

  it("uses coordinates without a place_id (no query_place_id param)", () => {
    const url = buildGoogleMapsLink({ latitude: 19.076, longitude: 72.8777 });
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=19.076%2C72.8777");
    expect(url).not.toContain("query_place_id");
  });

  it("assembles an address from parts when nothing better exists", () => {
    const url = buildGoogleMapsLink({
      building_name: "Green Villa",
      street_address: "1st Main Rd",
      locality: "Koramangala",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560095",
    });
    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Green Villa, 1st Main Rd, Koramangala, Bengaluru, Karnataka, 560095"),
    );
  });

  it("ignores whitespace-only parts when assembling", () => {
    const url = buildGoogleMapsLink({
      building_name: "  ",
      city: "Pune",
      state: "  ",
    });
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=Pune");
  });

  it("returns null when no usable location data exists", () => {
    expect(buildGoogleMapsLink({})).toBeNull();
    expect(buildGoogleMapsLink({ formatted_address: "   " })).toBeNull();
    expect(buildGoogleMapsLink({ latitude: NaN, longitude: 5 })).toBeNull();
  });

  it("never includes flat/unit identifiers in the URL", () => {
    // flat_number / lister_flat_number are intentionally not part of the input
    // type — cast through unknown to prove they can never leak into the URL.
    const input = {
      latitude: 1,
      longitude: 2,
      flat_number: "A-101",
      lister_flat_number: "B-202",
    } as unknown as Parameters<typeof buildGoogleMapsLink>[0];
    const url = buildGoogleMapsLink(input);
    expect(url).not.toContain("A-101");
    expect(url).not.toContain("B-202");
  });
});
