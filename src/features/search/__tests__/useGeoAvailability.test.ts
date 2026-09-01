import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGeoAvailability } from "../hooks/useGeoAvailability";
import { availableGeoIds } from "../data/geoSuggestClient";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("../data/geoSuggestClient", async () => {
  const actual = await vi.importActual<typeof import("../data/geoSuggestClient")>("../data/geoSuggestClient");
  return { ...actual, availableGeoIds: vi.fn() };
});

beforeEach(() => vi.clearAllMocks());

describe("useGeoAvailability", () => {
  it("mode null → idle, no RPC call", async () => {
    const { result } = renderHook(() => useGeoAvailability(["a", "b"], null));
    expect(result.current.availState).toBe("idle");
    expect(vi.mocked(availableGeoIds)).not.toHaveBeenCalled();
  });

  it("empty candidates → idle, no RPC call", () => {
    const { result } = renderHook(() => useGeoAvailability([], "rent"));
    expect(result.current.availState).toBe("idle");
    expect(vi.mocked(availableGeoIds)).not.toHaveBeenCalled();
  });

  it("success → exposes the available id Set", async () => {
    vi.mocked(availableGeoIds).mockResolvedValue(new Set(["a"]));
    const { result } = renderHook(() => useGeoAvailability(["a", "b"], "rent"));
    await waitFor(() => expect(result.current.availState).toBe("success"));
    expect(result.current.availableIds.has("a")).toBe(true);
    expect(result.current.availableIds.has("b")).toBe(false);
  });

  it("error → state 'error' (callers fail open)", async () => {
    vi.mocked(availableGeoIds).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useGeoAvailability(["a"], "rent"));
    await waitFor(() => expect(result.current.availState).toBe("error"));
  });

  it("passes rootGeoPlaceId through for Area checks", async () => {
    vi.mocked(availableGeoIds).mockResolvedValue(new Set(["loc"]));
    renderHook(() => useGeoAvailability(["loc"], "rent", "root-1"));
    await waitFor(() =>
      expect(vi.mocked(availableGeoIds)).toHaveBeenCalledWith(["loc"], "rent", expect.anything(), "root-1"),
    );
  });

  it("mode change → 'loading' synchronously (previous success Set not reused)", async () => {
    let resolveBuy: (s: Set<string>) => void = () => {};
    vi.mocked(availableGeoIds)
      .mockResolvedValueOnce(new Set(["a"])) // rent → available
      .mockImplementationOnce(() => new Promise<Set<string>>((r) => { resolveBuy = r; })); // buy pending

    const { result, rerender } = renderHook(
      ({ mode }: { mode: "rent" | "buy" }) => useGeoAvailability(["a"], mode),
      { initialProps: { mode: "rent" as const } },
    );
    await waitFor(() => expect(result.current.availState).toBe("success"));
    expect(result.current.availableIds.has("a")).toBe(true);

    rerender({ mode: "buy" });
    // Synchronous: no effect has run yet, but the derived state must already be loading.
    expect(result.current.availState).toBe("loading");
    expect(result.current.availableIds.has("a")).toBe(false);

    resolveBuy(new Set());
    await waitFor(() => expect(result.current.availState).toBe("success"));
    expect(result.current.availableIds.has("a")).toBe(false);
  });

  it("A→B→A: a late A response after switching away and back is NOT exposed", async () => {
    let resolveA1: (s: Set<string>) => void = () => {};
    vi.mocked(availableGeoIds)
      .mockImplementationOnce(() => new Promise<Set<string>>((r) => { resolveA1 = r; })) // A cycle 1 (pending)
      .mockResolvedValueOnce(new Set(["b"])) // B
      .mockResolvedValueOnce(new Set(["a2"])); // A cycle 2

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useGeoAvailability(ids, "rent"),
      { initialProps: { ids: ["a"] } },
    );
    rerender({ ids: ["b"] });
    await waitFor(() => expect(result.current.availableIds.has("b")).toBe(true));

    rerender({ ids: ["a"] });
    expect(result.current.availState).toBe("loading"); // A cycle 2 in flight; cycle-1 must not apply

    resolveA1(new Set(["a"])); // late cycle-1 response — must be ignored
    await Promise.resolve();
    expect(result.current.availableIds.has("a")).toBe(false);

    await waitFor(() => expect(result.current.availableIds.has("a2")).toBe(true));
  });

  it("COMPLETED A → B → A: a previously-completed A result is not reused; loading until new A commits", async () => {
    let resolveB: (s: Set<string>) => void = () => {};
    let resolveA2: (s: Set<string>) => void = () => {};
    vi.mocked(availableGeoIds)
      .mockResolvedValueOnce(new Set(["a1"])) // A cycle 1 COMPLETES
      .mockImplementationOnce(() => new Promise<Set<string>>((r) => { resolveB = r; })) // B pending
      .mockImplementationOnce(() => new Promise<Set<string>>((r) => { resolveA2 = r; })); // A cycle 2 pending

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useGeoAvailability(ids, "rent"),
      { initialProps: { ids: ["a"] } },
    );
    await waitFor(() => expect(result.current.availState).toBe("success"));
    expect(result.current.availableIds.has("a1")).toBe(true);

    rerender({ ids: ["b"] });
    expect(result.current.availState).toBe("loading");

    rerender({ ids: ["a"] }); // back to the SAME (recurring) key A before B finished
    expect(result.current.availState).toBe("loading"); // completed A must NOT reappear
    expect(result.current.availableIds.has("a1")).toBe(false);

    resolveA2(new Set(["a2"]));
    await waitFor(() => expect(result.current.availableIds.has("a2")).toBe(true));
    void resolveB;
  });

  it("stale response cannot overwrite a newer candidate set", async () => {
    let resolveFirst: (s: Set<string>) => void = () => {};
    vi.mocked(availableGeoIds)
      .mockImplementationOnce(() => new Promise<Set<string>>((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce(new Set(["b"]));

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useGeoAvailability(ids, "rent"),
      { initialProps: { ids: ["a"] } },
    );
    // Switch candidates before the first request resolves.
    rerender({ ids: ["b"] });
    await waitFor(() => expect(result.current.availState).toBe("success"));
    expect(result.current.availableIds.has("b")).toBe(true);

    // Late first response must be ignored (different generation).
    resolveFirst(new Set(["a"]));
    await Promise.resolve();
    expect(result.current.availableIds.has("a")).toBe(false);
  });
});
