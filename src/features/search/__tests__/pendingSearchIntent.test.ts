import { describe, it, expect, beforeEach } from "vitest";
import {
  writePendingIntent,
  readPendingIntent,
  clearPendingIntent,
  consumePendingIntent,
} from "../state/pendingSearchIntent";

const INTENT_KEY = "reeve-search-pending-intent";

beforeEach(() => {
  sessionStorage.clear();
});

describe("writePendingIntent + readPendingIntent", () => {
  it("stores and retrieves an intent", () => {
    writePendingIntent("prop-123", "/search?type=rent&city=bengaluru");
    const intent = readPendingIntent();
    expect(intent).not.toBeNull();
    expect(intent?.propertyId).toBe("prop-123");
    expect(intent?.action).toBe("add");
    expect(intent?.returnUrl).toBe("/search?type=rent&city=bengaluru");
  });

  it("returns null when nothing is stored", () => {
    expect(readPendingIntent()).toBeNull();
  });

  it("returns null for an expired intent", () => {
    const past = Date.now() - 1000;
    const intent = {
      propertyId: "prop-456",
      action: "add",
      returnUrl: "/search",
      expiresAt: past,
    };
    sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
    expect(readPendingIntent()).toBeNull();
  });
});

describe("clearPendingIntent", () => {
  it("removes the stored intent", () => {
    writePendingIntent("prop-123", "/search");
    clearPendingIntent();
    expect(readPendingIntent()).toBeNull();
  });
});

describe("consumePendingIntent", () => {
  it("reads and clears atomically", () => {
    writePendingIntent("prop-789", "/search?type=buy");
    const first = consumePendingIntent();
    expect(first?.propertyId).toBe("prop-789");
    const second = consumePendingIntent();
    expect(second).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(consumePendingIntent()).toBeNull();
  });
});

describe("writePendingIntent — external URL handling", () => {
  it("silently ignores external returnUrl (no leading /)", () => {
    writePendingIntent("prop-999", "http://evil.com/steal");
    expect(readPendingIntent()).toBeNull();
  });

  it("accepts internal returnUrl starting with /", () => {
    writePendingIntent("prop-001", "/search?type=rent");
    expect(readPendingIntent()).not.toBeNull();
  });
});

describe("readPendingIntent — corrupted JSON", () => {
  it("returns null when sessionStorage contains invalid JSON", () => {
    sessionStorage.setItem(INTENT_KEY, "not-valid-json{{{");
    expect(readPendingIntent()).toBeNull();
  });

  it("returns null when stored object has missing required fields", () => {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ foo: "bar" }));
    expect(readPendingIntent()).toBeNull();
  });
});
