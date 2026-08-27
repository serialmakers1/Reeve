import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockAuth = {
  session: null as { user: { id: string } } | null,
  user: null as { id: string } | null,
  isLoading: false,
};
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth }));

const geo = { approxCity: null as { geoPlaceId: string; kind: string; label: string } | null, status: "idle" as string };
const geoEnabledCalls: boolean[] = [];
vi.mock("../hooks/useVercelGeoCity", () => ({
  useVercelGeoCity: (enabled: boolean) => {
    geoEnabledCalls.push(enabled);
    return geo;
  },
}));

// Prefs client mock (anon tests never hit it, but the module imports it).
vi.mock("../data/searchLocationPrefsClient", () => ({
  fetchLocationPrefs: vi.fn().mockResolvedValue(null),
  saveLocationPrefs: vi.fn().mockResolvedValue(null),
}));

import { useSearchBootstrap } from "../state/useSearchBootstrap";
import { useSearchState } from "../state/useSearchState";
import { confirmSelection, emptyHistory } from "../state/searchLocationHistory";

function wrapperFor(initialUrl: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries: [initialUrl] }, children);
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockAuth.session = null;
  mockAuth.user = null;
  mockAuth.isLoading = false;
  geo.approxCity = null;
  geo.status = "idle";
  geoEnabledCalls.length = 0;
});

describe("useSearchBootstrap precedence", () => {
  it("URL with a city → resolved immediately, IP never enabled", async () => {
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search?type=rent&city=bengaluru"),
    });
    expect(result.current.status).toBe("resolved");
    expect(geoEnabledCalls.every((e) => e === false)).toBe(true);
  });

  it("anonymous memory → resolved, IP never enabled", async () => {
    localStorage.setItem(
      "reeve_search_location_anon_v1",
      JSON.stringify(confirmSelection(emptyHistory(), "mumbai", [], "rent", [], 1)),
    );
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search?type=rent"),
    });
    await waitFor(() => expect(result.current.status).toBe("resolved"));
    expect(geoEnabledCalls.some((e) => e === true)).toBe(false);
  });

  it("logged-in account cache restores immediately (no Supabase wait), IP never enabled", async () => {
    mockAuth.user = { id: "userA" };
    // Exact production envelope shape: {version:1, history:{version:2,...}, serverUpdatedAt}.
    localStorage.setItem(
      "reeve_search_location_account_v1:userA",
      JSON.stringify({
        version: 1,
        history: confirmSelection(emptyHistory(), "bengaluru", [], "buy", ["apartment"], 1),
        serverUpdatedAt: "2026-08-05T00:00:00Z",
      }),
    );
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search?type=rent"),
    });
    await waitFor(() => expect(result.current.status).toBe("resolved"));
    expect(geoEnabledCalls.some((e) => e === true)).toBe(false);
  });

  it("legacy account-cache with a v1 inner history is accepted", async () => {
    mockAuth.user = { id: "userB" };
    localStorage.setItem(
      "reeve_search_location_account_v1:userB",
      JSON.stringify({
        version: 1,
        history: { version: 1, cities: [{ city: "mumbai", lastSelectedAreas: [], recentAreas: [], confirmedAt: 1 }] },
        serverUpdatedAt: null,
      }),
    );
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search?type=rent"),
    });
    await waitFor(() => expect(result.current.status).toBe("resolved"));
    expect(geoEnabledCalls.some((e) => e === true)).toBe(false);
  });

  it("session known but profile still loading → restores account city without waiting for profile", async () => {
    mockAuth.session = { user: { id: "userEarly" } };
    mockAuth.user = null;       // profile DB row not yet fetched
    mockAuth.isLoading = true;  // still loading
    localStorage.setItem(
      "reeve_search_location_account_v1:userEarly",
      JSON.stringify({
        version: 1,
        history: confirmSelection(emptyHistory(), "hyderabad", [], "rent", [], 1),
        serverUpdatedAt: null,
      }),
    );
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search"),
    });
    await waitFor(() => expect(result.current.status).toBe("resolved"));
    expect(geoEnabledCalls.some((e) => e === true)).toBe(false);
  });

  it("session known + no local cache: server reconcile survives profile-load completing, IP never starts", async () => {
    // Simulates the critical race: session resolves early (userId known, authLoading
    // still true), no local cache so reconcileAccountHistory is awaited, then
    // authLoading flips false when the profile DB row lands. The identityPending
    // dep ensures the effect does NOT clean up/restart at that point.
    mockAuth.session = { user: { id: "userNoCache" } };
    mockAuth.user = null;
    mockAuth.isLoading = true;

    const { fetchLocationPrefs } = await import("../data/searchLocationPrefsClient");

    let resolvePrefs!: (v: unknown) => void;
    vi.mocked(fetchLocationPrefs).mockReturnValueOnce(
      new Promise((r) => { resolvePrefs = r; }) as never,
    );

    const { result, rerender } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search"),
    });

    // Status is still "checking" — waiting on server.
    expect(result.current.status).toBe("checking");
    expect(geoEnabledCalls.some((e) => e === true)).toBe(false);

    // Profile finishes loading (authLoading true → false) — must NOT abort the reconcile.
    mockAuth.isLoading = false;
    mockAuth.user = { id: "userNoCache" };
    rerender();

    // Server returns a saved preference in ServerPrefsRow shape.
    resolvePrefs({
      schemaVersion: 2,
      history: confirmSelection(emptyHistory(), "chennai", [], "rent", [], 1),
      updatedAt: "2026-08-01T00:00:00Z",
    });

    await waitFor(() => expect(result.current.status).toBe("resolved"));
    expect(geoEnabledCalls.some((e) => e === true)).toBe(false);
  });

  it("late account reconciliation cannot overwrite a user interaction", async () => {
    // Bootstrap starts with account cache present; user interacts before the
    // background reconcile resolves → the reconcile result must be discarded.
    mockAuth.user = { id: "userRace" };
    mockAuth.isLoading = false;
    let resolveReconcile!: (h: unknown) => void;
    const reconcilePromise = new Promise((r) => { resolveReconcile = r; });

    const { fetchLocationPrefs } = await import("../data/searchLocationPrefsClient");
    vi.mocked(fetchLocationPrefs).mockReturnValueOnce(reconcilePromise as never);

    localStorage.setItem(
      "reeve_search_location_account_v1:userRace",
      JSON.stringify({
        version: 1,
        history: confirmSelection(emptyHistory(), "pune", [], "rent", [], 1),
        serverUpdatedAt: null,
      }),
    );
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search"),
    });
    await waitFor(() => expect(result.current.status).toBe("resolved"));

    // User interacts (changes city), then the stale server response arrives.
    result.current.markUserInteracted();
    resolveReconcile(null);

    // Status remains resolved; no new city seed from the server.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.status).toBe("resolved");
  });

  it("no memory + IP success → resolved with an IP notice", async () => {
    geo.approxCity = { geoPlaceId: "pune-root", kind: "settlement", label: "Pune" };
    geo.status = "done";
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search?type=rent"),
    });
    await waitFor(() => expect(result.current.status).toBe("resolved"));
    await waitFor(() => expect(result.current.ipNoticeCity).toBe("pune"));
    expect(geoEnabledCalls.some((e) => e === true)).toBe(true);
  });

  it("no memory + IP failure → needs_setup", async () => {
    geo.approxCity = null;
    geo.status = "done";
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search?type=rent"),
    });
    await waitFor(() => expect(result.current.status).toBe("needs_setup"));
  });
});

describe("useSearchBootstrap — field-aware restore", () => {
  // Harness renders both hooks so we can observe the restored URL-derived context.
  function useHarness() {
    const boot = useSearchBootstrap();
    const { state } = useSearchState();
    return { boot, ctx: state.context };
  }

  it("bare URL restores full remembered setup (city + areas + mode + property types)", async () => {
    localStorage.setItem(
      "reeve_search_location_anon_v1",
      JSON.stringify(
        confirmSelection(emptyHistory(), "bengaluru", [], "buy", ["apartment", "duplex_apartment"], 1),
      ),
    );
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperFor("/search") });
    await waitFor(() => expect(result.current.ctx.city).toBe("bengaluru"));
    expect(result.current.ctx.mode).toBe("buy");
    expect(result.current.ctx.propertyTypes).toEqual(["apartment", "duplex_apartment"]);
  });

  it("explicit URL mode wins over remembered mode on a partial URL", async () => {
    localStorage.setItem(
      "reeve_search_location_anon_v1",
      JSON.stringify(confirmSelection(emptyHistory(), "bengaluru", [], "rent", ["villa"], 1)),
    );
    // Partial URL: explicit type=buy, no city.
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperFor("/search?type=buy") });
    await waitFor(() => expect(result.current.ctx.city).toBe("bengaluru"));
    expect(result.current.ctx.mode).toBe("buy"); // explicit URL wins
  });
});
