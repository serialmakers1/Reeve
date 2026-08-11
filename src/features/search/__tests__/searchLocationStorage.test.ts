import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { LocationToken } from "../domain/searchTypes";
import {
  readAnonHistory,
  writeAnonHistory,
  readAccountCache,
  writeAccountCache,
  clearAccountCache,
  writePendingConfirm,
  readPendingConfirm,
  clearPendingConfirm,
} from "../state/searchLocationStorage";
import { confirmSelection, emptyHistory } from "../state/searchLocationHistory";

function area(id: string): LocationToken {
  return { id, label: id, type: "area", cityId: null, placeId: id, lat: null, lng: null, viewport: null };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("anon history", () => {
  it("round-trips", () => {
    const h = confirmSelection(emptyHistory(), "bengaluru", [area("wf")], "rent", [], 1);
    writeAnonHistory(h);
    expect(readAnonHistory().cities[0].city).toBe("bengaluru");
  });

  it("corrupted JSON → empty", () => {
    localStorage.setItem("reeve_search_location_anon_v1", "not-json{{{");
    expect(readAnonHistory()).toEqual(emptyHistory());
  });

  it("unsupported version → empty", () => {
    localStorage.setItem("reeve_search_location_anon_v1", JSON.stringify({ version: 9, cities: [] }));
    expect(readAnonHistory()).toEqual(emptyHistory());
  });
});

describe("account cache — per-user isolation", () => {
  it("stores under a user-specific key and does not leak across users", () => {
    const h = confirmSelection(emptyHistory(), "mumbai", [], "rent", [], 1);
    writeAccountCache("userA", { version: 1, history: h, serverUpdatedAt: null });
    expect(readAccountCache("userA")?.history.cities[0].city).toBe("mumbai");
    expect(readAccountCache("userB")).toBeNull();
  });

  it("clearAccountCache removes only that user", () => {
    writeAccountCache("userA", { version: 1, history: emptyHistory(), serverUpdatedAt: null });
    writeAccountCache("userB", { version: 1, history: emptyHistory(), serverUpdatedAt: "x" });
    clearAccountCache("userA");
    expect(readAccountCache("userA")).toBeNull();
    expect(readAccountCache("userB")).not.toBeNull();
  });
});

describe("pending confirmation (sessionStorage)", () => {
  it("round-trips while unexpired", () => {
    writePendingConfirm("bengaluru", [area("wf")], "buy", ["apartment"]);
    const p = readPendingConfirm();
    expect(p?.city).toBe("bengaluru");
    expect(p?.areas.map((a) => a.id)).toEqual(["wf"]);
    expect(p?.mode).toBe("buy");
    expect(p?.propertyTypes).toEqual(["apartment"]);
  });

  it("returns null once expired", () => {
    vi.useFakeTimers();
    try {
      writePendingConfirm("bengaluru", [], "rent", []);
      vi.advanceTimersByTime(11 * 60 * 1000); // > 10 min TTL
      expect(readPendingConfirm()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("clearPendingConfirm removes it", () => {
    writePendingConfirm("pune", [], "rent", []);
    clearPendingConfirm();
    expect(readPendingConfirm()).toBeNull();
  });
});

describe("storage exceptions are swallowed", () => {
  afterEach(() => vi.restoreAllMocks());
  it("write failure does not throw", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeAnonHistory(emptyHistory())).not.toThrow();
  });
  it("read failure → empty", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readAnonHistory()).toEqual(emptyHistory());
  });
});
