import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockAuth = { user: null as { id: string } | null, isLoading: false };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth }));

const geo = { approxCity: null as { city: string } | null, status: "idle" as string };
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
import { confirmSelection, emptyHistory } from "../state/searchLocationHistory";

function wrapperFor(initialUrl: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries: [initialUrl] }, children);
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
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
      JSON.stringify(confirmSelection(emptyHistory(), "mumbai", [], 1)),
    );
    const { result } = renderHook(() => useSearchBootstrap(), {
      wrapper: wrapperFor("/search?type=rent"),
    });
    await waitFor(() => expect(result.current.status).toBe("resolved"));
    expect(geoEnabledCalls.some((e) => e === true)).toBe(false);
  });

  it("no memory + IP success → resolved with an IP notice", async () => {
    geo.approxCity = { city: "pune" };
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
