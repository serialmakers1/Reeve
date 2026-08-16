import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePopularCityAvailability } from "../hooks/usePopularCityAvailability";
import { suggestGeo, type GeoSuggestRow } from "../data/geoSuggestClient";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

vi.mock("../data/geoSuggestClient", async () => {
  const actual = await vi.importActual<typeof import("../data/geoSuggestClient")>(
    "../data/geoSuggestClient",
  );
  // Keep all real exports (including selectCanonicalCityCandidate) but mock suggestGeo.
  return { ...actual, suggestGeo: vi.fn() };
});

const settlementRow = (id: string, name: string): GeoSuggestRow => ({
  id,
  display_name: name,
  kind: "settlement",
  settlement_subtype: "city",
  parent_geo_place_id: null,
  parent_display_name: null,
  search_region_id: null,
  search_region_display_name: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePopularCityAvailability", () => {
  it("returns available with token when suggestGeo returns a safe candidate", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);

    const { result } = renderHook(() => usePopularCityAvailability(["Bengaluru"]));

    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));
    expect(result.current.availability["Bengaluru"].token?.geoPlaceId).toBe("uuid-ben");
  });

  it("returns unavailable when suggestGeo returns empty array (zero rows)", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([]);

    const { result } = renderHook(() => usePopularCityAvailability(["Indore"]));

    await waitFor(() => expect(result.current.availability["Indore"].status).toBe("unavailable"));
    expect(result.current.availability["Indore"].token).toBeUndefined();
  });

  it("returns unavailable when rows are ambiguous (selectCanonicalCityCandidate returns null)", async () => {
    // Two rows with different IDs — selectCanonicalCityCandidate returns null for ambiguous
    vi.mocked(suggestGeo).mockResolvedValue([
      settlementRow("uuid-a1", "Mumbai"),
      settlementRow("uuid-a2", "Mumbai"),
    ]);

    const { result } = renderHook(() => usePopularCityAvailability(["Mumbai"]));

    await waitFor(() => expect(result.current.availability["Mumbai"].status).toBe("unavailable"));
    expect(result.current.availability["Mumbai"].token).toBeUndefined();
  });

  it("returns error when suggestGeo throws (network/RPC failure)", async () => {
    vi.mocked(suggestGeo).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => usePopularCityAvailability(["Chennai"]));

    await waitFor(() => expect(result.current.availability["Chennai"].status).toBe("error"));
    expect(result.current.availability["Chennai"].token).toBeUndefined();
  });

  it("resolves all cities independently with correct per-city status", async () => {
    vi.mocked(suggestGeo).mockImplementation(async (args) => {
      const q = args.query.toLowerCase();
      if (q === "bengaluru") return [settlementRow("uuid-ben", "Bengaluru")];
      if (q === "indore") return [];
      throw new Error("network");
    });

    const { result } = renderHook(() =>
      usePopularCityAvailability(["Bengaluru", "Indore", "Hyderabad"]),
    );

    await waitFor(() => {
      expect(result.current.availability["Bengaluru"].status).toBe("available");
      expect(result.current.availability["Indore"].status).toBe("unavailable");
      expect(result.current.availability["Hyderabad"].status).toBe("error");
    });
  });

  it("does not re-resolve cities on rerender (calls suggestGeo exactly once per city)", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);

    const { result, rerender } = renderHook(() => usePopularCityAvailability(["Bengaluru"]));
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));

    rerender();
    rerender();

    expect(vi.mocked(suggestGeo)).toHaveBeenCalledTimes(1);
  });

  it("retryCity transitions error → loading → available and leaves other cities unchanged", async () => {
    vi.mocked(suggestGeo)
      .mockRejectedValueOnce(new Error("network")) // initial attempt for Bengaluru
      .mockResolvedValueOnce([settlementRow("uuid-del", "Delhi")]) // initial for Delhi (available)
      .mockResolvedValueOnce([settlementRow("uuid-ben", "Bengaluru")]); // retry for Bengaluru

    const { result } = renderHook(() => usePopularCityAvailability(["Bengaluru", "Delhi"]));

    await waitFor(() => {
      expect(result.current.availability["Bengaluru"].status).toBe("error");
      expect(result.current.availability["Delhi"].status).toBe("available");
    });

    act(() => {
      result.current.retryCity("Bengaluru");
    });

    // During retry, Bengaluru transitions to loading
    expect(result.current.availability["Bengaluru"].status).toBe("loading");
    // Delhi is unchanged
    expect(result.current.availability["Delhi"].status).toBe("available");

    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));
    expect(result.current.availability["Bengaluru"].token?.geoPlaceId).toBe("uuid-ben");
    // Delhi still unchanged after retry
    expect(result.current.availability["Delhi"].status).toBe("available");
  });
});
