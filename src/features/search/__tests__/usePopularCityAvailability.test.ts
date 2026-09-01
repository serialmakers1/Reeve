import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePopularCityAvailability } from "../hooks/usePopularCityAvailability";
import { suggestGeo, availableGeoIds, type GeoSuggestRow } from "../data/geoSuggestClient";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

vi.mock("../data/geoSuggestClient", async () => {
  const actual = await vi.importActual<typeof import("../data/geoSuggestClient")>(
    "../data/geoSuggestClient",
  );
  // Keep real exports (incl. selectCanonicalCityCandidate) but mock the two RPC-backed fns.
  return { ...actual, suggestGeo: vi.fn(), availableGeoIds: vi.fn() };
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

    const { result } = renderHook(() => usePopularCityAvailability(["Bengaluru"], null));

    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));
    expect(result.current.availability["Bengaluru"].token?.geoPlaceId).toBe("uuid-ben");
  });

  it("returns unavailable when suggestGeo returns empty array (zero rows)", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([]);

    const { result } = renderHook(() => usePopularCityAvailability(["Indore"], null));

    await waitFor(() => expect(result.current.availability["Indore"].status).toBe("unavailable"));
    expect(result.current.availability["Indore"].token).toBeUndefined();
  });

  it("returns unavailable when rows are ambiguous (selectCanonicalCityCandidate returns null)", async () => {
    // Two rows with different IDs — selectCanonicalCityCandidate returns null for ambiguous
    vi.mocked(suggestGeo).mockResolvedValue([
      settlementRow("uuid-a1", "Mumbai"),
      settlementRow("uuid-a2", "Mumbai"),
    ]);

    const { result } = renderHook(() => usePopularCityAvailability(["Mumbai"], null));

    await waitFor(() => expect(result.current.availability["Mumbai"].status).toBe("unavailable"));
    expect(result.current.availability["Mumbai"].token).toBeUndefined();
  });

  it("returns error when suggestGeo throws (network/RPC failure)", async () => {
    vi.mocked(suggestGeo).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => usePopularCityAvailability(["Chennai"], null));

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
      usePopularCityAvailability(["Bengaluru", "Indore", "Hyderabad"], null),
    );

    await waitFor(() => {
      expect(result.current.availability["Bengaluru"].status).toBe("available");
      expect(result.current.availability["Indore"].status).toBe("unavailable");
      expect(result.current.availability["Hyderabad"].status).toBe("error");
    });
  });

  it("does not re-resolve cities on rerender (calls suggestGeo exactly once per city)", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);

    const { result, rerender } = renderHook(() => usePopularCityAvailability(["Bengaluru"], null));
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

    const { result } = renderHook(() => usePopularCityAvailability(["Bengaluru", "Delhi"], null));

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

  // ── Phase 3: inventory- and mode-aware availability ──────────────────────────
  it("mode set: resolved token WITH inventory → available; WITHOUT → unavailable", async () => {
    vi.mocked(suggestGeo).mockImplementation(async (args) => {
      const q = args.query.toLowerCase();
      if (q === "bengaluru") return [settlementRow("uuid-ben", "Bengaluru")];
      return [settlementRow("uuid-pune", "Pune")];
    });
    vi.mocked(availableGeoIds).mockResolvedValue(new Set(["uuid-ben"])); // only Bengaluru has inventory

    const { result } = renderHook(() => usePopularCityAvailability(["Bengaluru", "Pune"], "rent"));

    await waitFor(() => {
      expect(result.current.availability["Bengaluru"].status).toBe("available");
      expect(result.current.availability["Pune"].status).toBe("unavailable");
    });
    // Pune resolved (has a token) but is filtered out by inventory, not name resolution.
    expect(result.current.availability["Pune"].token?.geoPlaceId).toBe("uuid-pune");
  });

  it("mode set: availability RPC error → fail open (resolved cities shown available)", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);
    vi.mocked(availableGeoIds).mockRejectedValue(new Error("rpc down"));

    const { result } = renderHook(() => usePopularCityAvailability(["Bengaluru"], "rent"));

    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));
  });

  it("mode null → does not call availableGeoIds; resolved token stays available", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);

    const { result } = renderHook(() => usePopularCityAvailability(["Bengaluru"], null));
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));
    expect(vi.mocked(availableGeoIds)).not.toHaveBeenCalled();
  });

  it("mode switch rent→buy rechecks availability (tokens cached, availability re-queried)", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);
    vi.mocked(availableGeoIds)
      .mockResolvedValueOnce(new Set(["uuid-ben"])) // rent: available
      .mockResolvedValueOnce(new Set()); // buy: no inventory

    const { result, rerender } = renderHook(
      ({ mode }: { mode: "rent" | "buy" }) => usePopularCityAvailability(["Bengaluru"], mode),
      { initialProps: { mode: "rent" as const } },
    );
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));

    rerender({ mode: "buy" });
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("unavailable"));

    // Token resolution happened once; availability was checked per mode.
    expect(vi.mocked(suggestGeo)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(availableGeoIds)).toHaveBeenCalledTimes(2);
  });

  it("mode change → statuses are 'loading' synchronously (not the previous mode's)", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);
    let resolveBuy: (s: Set<string>) => void = () => {};
    // Keyed by mode arg (2nd param) so async call ordering can't misassign results.
    vi.mocked(availableGeoIds).mockImplementation(async (_ids, mode) =>
      mode === "rent" ? new Set(["uuid-ben"]) : new Promise<Set<string>>((r) => { resolveBuy = r; }),
    );

    const { result, rerender } = renderHook(
      ({ mode }: { mode: "rent" | "buy" }) => usePopularCityAvailability(["Bengaluru"], mode),
      { initialProps: { mode: "rent" as const } },
    );
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));

    rerender({ mode: "buy" });
    expect(result.current.availability["Bengaluru"].status).toBe("loading"); // synchronous derivation

    await waitFor(() => expect(vi.mocked(availableGeoIds)).toHaveBeenCalledTimes(2)); // buy call issued
    resolveBuy(new Set());
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("unavailable"));
  });

  it("rent→buy→rent: a late buy compute cannot overwrite the current rent statuses", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);
    let resolveBuy: (s: Set<string>) => void = () => {};
    vi.mocked(availableGeoIds).mockImplementation(async (_ids, mode) =>
      mode === "rent" ? new Set(["uuid-ben"]) : new Promise<Set<string>>((r) => { resolveBuy = r; }),
    );

    const { result, rerender } = renderHook(
      ({ mode }: { mode: "rent" | "buy" }) => usePopularCityAvailability(["Bengaluru"], mode),
      { initialProps: { mode: "rent" as const } },
    );
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));

    rerender({ mode: "buy" });
    rerender({ mode: "rent" });
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));

    // Late buy resolves EMPTY — must not flip the current rent status to unavailable (gen mismatch drops it).
    resolveBuy(new Set());
    await Promise.resolve();
    expect(result.current.availability["Bengaluru"].status).toBe("available");
  });

  it("COMPLETED rent → buy → rent: a previously-completed rent is not reused; loading until new rent commits", async () => {
    vi.mocked(suggestGeo).mockResolvedValue([settlementRow("uuid-ben", "Bengaluru")]);
    let resolveRent2: (s: Set<string>) => void = () => {};
    let rentCalls = 0;
    vi.mocked(availableGeoIds).mockImplementation(async (_ids, mode) => {
      if (mode === "rent") {
        rentCalls += 1;
        return rentCalls === 1
          ? new Set(["uuid-ben"]) // rent #1 COMPLETES → available
          : new Promise<Set<string>>((r) => { resolveRent2 = r; }); // rent #2 pending
      }
      return new Promise<Set<string>>(() => {}); // buy never resolves
    });

    const { result, rerender } = renderHook(
      ({ mode }: { mode: "rent" | "buy" }) => usePopularCityAvailability(["Bengaluru"], mode),
      { initialProps: { mode: "rent" as const } },
    );
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));

    rerender({ mode: "buy" });
    expect(result.current.availability["Bengaluru"].status).toBe("loading");

    rerender({ mode: "rent" }); // recurring rent key, before buy finished
    expect(result.current.availability["Bengaluru"].status).toBe("loading"); // completed rent must NOT reappear

    await waitFor(() => expect(rentCalls).toBe(2)); // new rent request issued
    resolveRent2(new Set(["uuid-ben"]));
    await waitFor(() => expect(result.current.availability["Bengaluru"].status).toBe("available"));
  });
});
