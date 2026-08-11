import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { resolveLocation, confirmLocation } from "@/lib/location/confirmLocationClient";

// Capture the JSON body of the last fetch call.
function lastBody(): Record<string, unknown> {
  const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
  return JSON.parse((call![1] as RequestInit).body as string);
}

describe("confirmLocationClient — 4-state wire contract", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, property_id: "p", confirmed: true }),
    })) as unknown as typeof fetch;
  });
  afterEach(() => vi.restoreAllMocks());

  it("omits city_place_id / secondary_city_place_ids when not provided", async () => {
    await confirmLocation("tok", { propertyId: "p", placeId: "pl", lat: 1, lng: 2 });
    const b = lastBody();
    expect("city_place_id" in b).toBe(false);
    expect("secondary_city_place_ids" in b).toBe(false);
    // baseline fields always present
    expect(b.selected_area_ids).toEqual([]);
    expect(b.extra_area_id).toBeNull();
  });

  it("serializes null (present, not omitted) for both override keys", async () => {
    await confirmLocation("tok", { propertyId: "p", placeId: "pl", lat: 1, lng: 2, cityPlaceId: null, secondaryCityPlaceIds: null });
    const b = lastBody();
    expect("city_place_id" in b).toBe(true);
    expect(b.city_place_id).toBeNull();
    expect("secondary_city_place_ids" in b).toBe(true);
    expect(b.secondary_city_place_ids).toBeNull();
  });

  it("sends explicit values and empty array as-is", async () => {
    await confirmLocation("tok", { propertyId: "p", placeId: "pl", lat: 1, lng: 2, cityPlaceId: "ghn", secondaryCityPlaceIds: [] });
    const b = lastBody();
    expect(b.city_place_id).toBe("ghn");
    expect(b.secondary_city_place_ids).toEqual([]);

    await confirmLocation("tok", { propertyId: "p", placeId: "pl", lat: 1, lng: 2, secondaryCityPlaceIds: ["a", "b"] });
    expect(lastBody().secondary_city_place_ids).toEqual(["a", "b"]);
  });

  it("resolveLocation carries the same 4-state override semantics", async () => {
    await resolveLocation("tok", "p", "pl", 1, 2);
    expect("city_place_id" in lastBody()).toBe(false);

    await resolveLocation("tok", "p", "pl", 1, 2, { cityPlaceId: null });
    const b = lastBody();
    expect("city_place_id" in b).toBe(true);
    expect(b.city_place_id).toBeNull();

    await resolveLocation("tok", "p", "pl", 1, 2, { secondaryCityPlaceIds: ["x"] });
    expect(lastBody().secondary_city_place_ids).toEqual(["x"]);
  });
});
