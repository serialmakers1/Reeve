import { describe, it, expect, beforeEach, vi } from "vitest";
import type { LocationToken } from "../domain/searchTypes";

// Mock the Supabase-backed prefs client (table not deployed in tests).
const fetchLocationPrefs = vi.fn();
const saveLocationPrefs = vi.fn();
vi.mock("../data/searchLocationPrefsClient", () => ({
  fetchLocationPrefs: (...a: unknown[]) => fetchLocationPrefs(...a),
  saveLocationPrefs: (...a: unknown[]) => saveLocationPrefs(...a),
}));

import {
  confirmSearchLocation,
  loadCachedHistory,
  reconcileAccountHistory,
} from "../state/searchLocationMemory";
import { readAnonHistory, readAccountCache, readPendingConfirm } from "../state/searchLocationStorage";
import { confirmSelection, emptyHistory } from "../state/searchLocationHistory";

function area(id: string): LocationToken {
  return { id, label: id, type: "area", cityId: null, placeId: id, viewport: null };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchLocationPrefs.mockReset();
  saveLocationPrefs.mockReset();
  saveLocationPrefs.mockResolvedValue("2026-08-05T00:00:00Z");
});

describe("confirmSearchLocation — anonymous", () => {
  it("writes anon history + a pending confirmation (survives login redirect)", async () => {
    await confirmSearchLocation({ userId: null, city: "bengaluru", areas: [area("wf")] });
    expect(readAnonHistory().cities[0].city).toBe("bengaluru");
    expect(readPendingConfirm()?.city).toBe("bengaluru");
    expect(saveLocationPrefs).not.toHaveBeenCalled();
  });
});

describe("confirmSearchLocation — authenticated", () => {
  it("writes account cache immediately and upserts to the server", async () => {
    await confirmSearchLocation({ userId: "userA", city: "mumbai", areas: [] });
    expect(readAccountCache("userA")?.history.cities[0].city).toBe("mumbai");
    expect(saveLocationPrefs).toHaveBeenCalledOnce();
    // No anonymous leakage for a logged-in confirmation.
    expect(readAnonHistory()).toEqual(emptyHistory());
    expect(readPendingConfirm()).toBeNull();
  });
});

describe("loadCachedHistory", () => {
  it("anon reads anon storage; logged-in reads that user's cache", async () => {
    await confirmSearchLocation({ userId: null, city: "pune", areas: [] });
    expect(loadCachedHistory(null).cities[0].city).toBe("pune");
    expect(loadCachedHistory("userA").cities).toEqual([]);
  });
});

describe("reconcileAccountHistory — merge on login", () => {
  it("folds a current-session anonymous confirmation into the account as newest, then clears it", async () => {
    // Server already has an older city.
    fetchLocationPrefs.mockResolvedValue({
      history: confirmSelection(emptyHistory(), "delhi", [], 1),
      updatedAt: "2026-08-01T00:00:00Z",
    });
    // Current anonymous session confirmed a different city just before login.
    await confirmSearchLocation({ userId: null, city: "bengaluru", areas: [area("wf")] });
    expect(readPendingConfirm()).not.toBeNull();

    const merged = await reconcileAccountHistory("userA");

    // Newest is the current-session confirmation; server city preserved too.
    expect(merged.cities[0].city).toBe("bengaluru");
    expect(merged.cities.map((c) => c.city)).toContain("delhi");
    // Pending cleared after folding in.
    expect(readPendingConfirm()).toBeNull();
    expect(saveLocationPrefs).toHaveBeenCalled();
  });

  it("does not bulk-upload old anonymous history (only the pending confirmation)", async () => {
    // Old anon history with several cities exists, but NO pending confirmation.
    let anon = emptyHistory();
    anon = confirmSelection(anon, "kolkata", [], 1);
    anon = confirmSelection(anon, "chennai", [], 2);
    localStorage.setItem("reeve_search_location_anon_v1", JSON.stringify(anon));
    // (pending key intentionally absent)

    fetchLocationPrefs.mockResolvedValue({ history: emptyHistory(), updatedAt: null });
    const merged = await reconcileAccountHistory("userA");
    expect(merged.cities).toEqual([]);
  });
});
