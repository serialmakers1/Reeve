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
  confirmSearchSetup,
  loadCachedHistory,
  reconcileAccountHistory,
  removeRememberedCity,
  clearRememberedHistory,
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

describe("confirmSearchSetup — anonymous", () => {
  it("writes anon history + a pending confirmation (mode + types), no server call", async () => {
    await confirmSearchSetup({
      userId: null,
      setup: { city: "bengaluru", areas: [area("wf")], mode: "buy", propertyTypes: ["apartment"] },
    });
    const anon = readAnonHistory();
    expect(anon.cities[0].city).toBe("bengaluru");
    expect(anon.cities[0].mode).toBe("buy");
    expect(anon.cities[0].propertyTypes).toEqual(["apartment"]);
    const pending = readPendingConfirm();
    expect(pending?.city).toBe("bengaluru");
    expect(pending?.mode).toBe("buy");
    expect(pending?.propertyTypes).toEqual(["apartment"]);
    expect(saveLocationPrefs).not.toHaveBeenCalled();
  });
});

describe("confirmSearchSetup — authenticated", () => {
  it("writes account cache immediately and upserts to the server; no anon leakage", async () => {
    await confirmSearchSetup({
      userId: "userA",
      setup: { city: "mumbai", areas: [], mode: "rent", propertyTypes: [] },
    });
    await Promise.resolve();
    expect(readAccountCache("userA")?.history.cities[0].city).toBe("mumbai");
    expect(saveLocationPrefs).toHaveBeenCalled();
    expect(readAnonHistory()).toEqual(emptyHistory());
    expect(readPendingConfirm()).toBeNull();
  });
});

describe("loadCachedHistory", () => {
  it("anon reads anon storage; logged-in reads that user's cache", async () => {
    await confirmSearchSetup({
      userId: null,
      setup: { city: "pune", areas: [], mode: "rent", propertyTypes: [] },
    });
    expect(loadCachedHistory(null).cities[0].city).toBe("pune");
    expect(loadCachedHistory("userA").cities).toEqual([]);
  });
});

describe("reconcileAccountHistory — merge on login", () => {
  it("folds a current-session anonymous confirmation into the account as newest, then clears it", async () => {
    fetchLocationPrefs.mockResolvedValue({
      schemaVersion: 2,
      history: confirmSelection(emptyHistory(), "delhi", [], "rent", [], 1),
      updatedAt: "2026-08-01T00:00:00Z",
    });
    await confirmSearchSetup({
      userId: null,
      setup: { city: "bengaluru", areas: [area("wf")], mode: "buy", propertyTypes: [] },
    });
    expect(readPendingConfirm()).not.toBeNull();

    const merged = await reconcileAccountHistory("userA");

    expect(merged.cities[0].city).toBe("bengaluru");
    expect(merged.cities.map((c) => c.city)).toContain("delhi");
    expect(readPendingConfirm()).toBeNull();
    expect(saveLocationPrefs).toHaveBeenCalled();
  });

  it("does not bulk-upload old anonymous history (only the pending confirmation)", async () => {
    let anon = emptyHistory();
    anon = confirmSelection(anon, "kolkata", [], "rent", [], 1);
    anon = confirmSelection(anon, "chennai", [], "rent", [], 2);
    localStorage.setItem("reeve_search_location_anon_v1", JSON.stringify(anon));

    fetchLocationPrefs.mockResolvedValue({ schemaVersion: 2, history: emptyHistory(), updatedAt: null });
    const merged = await reconcileAccountHistory("userA");
    expect(merged.cities).toEqual([]);
  });
});

describe("remove / clear", () => {
  it("removeRememberedCity drops a city and persists (logged-in)", async () => {
    await confirmSearchSetup({ userId: "userA", setup: { city: "a", areas: [], mode: "rent", propertyTypes: [] } });
    await confirmSearchSetup({ userId: "userA", setup: { city: "b", areas: [], mode: "rent", propertyTypes: [] } });
    const next = await removeRememberedCity({ userId: "userA", city: "b" });
    expect(next.cities.map((c) => c.city)).toEqual(["a"]);
    expect(readAccountCache("userA")?.history.cities.map((c) => c.city)).toEqual(["a"]);
  });

  it("removing a city clears a matching pending confirmation", async () => {
    await confirmSearchSetup({ userId: null, setup: { city: "bengaluru", areas: [], mode: "rent", propertyTypes: [] } });
    expect(readPendingConfirm()?.city).toBe("bengaluru");
    await removeRememberedCity({ userId: null, city: "bengaluru" });
    expect(readPendingConfirm()).toBeNull();
  });

  it("clearRememberedHistory empties cache + pending", async () => {
    await confirmSearchSetup({ userId: null, setup: { city: "x", areas: [], mode: "rent", propertyTypes: [] } });
    await clearRememberedHistory({ userId: null });
    expect(readAnonHistory().cities).toEqual([]);
    expect(readPendingConfirm()).toBeNull();
  });

  it("serializes writes: a remove enqueued after a save is not undone (server ends without the city)", async () => {
    // Make the server upsert slow so ordering matters.
    const seen: string[][] = [];
    saveLocationPrefs.mockImplementation(async (_userId: string, history: { cities: { city: string }[] }) => {
      await new Promise((r) => setTimeout(r, 5));
      seen.push(history.cities.map((c) => c.city));
      return "2026-08-05T00:00:00Z";
    });
    await confirmSearchSetup({ userId: "userA", setup: { city: "a", areas: [], mode: "rent", propertyTypes: [] } });
    const removed = removeRememberedCity({ userId: "userA", city: "a" });
    await removed;
    // Let the serialized write chain drain.
    await new Promise((r) => setTimeout(r, 20));
    // The LAST server upsert must reflect the removal (empty), never resurrect "a".
    expect(seen[seen.length - 1]).toEqual([]);
    expect(readAccountCache("userA")?.history.cities).toEqual([]);
  });
});
