import { describe, expect, it } from "vitest";
import { isResendExpiredAt } from "@/lib/resendExpiry";

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const BASE_MS = new Date("2026-07-01T00:00:00.000Z").getTime();
const BASE_ISO = new Date(BASE_MS).toISOString();

describe("isResendExpiredAt", () => {
  it("returns false when approved_at is exactly 15 days ago (boundary — still allowed)", () => {
    const nowMs = BASE_MS + FIFTEEN_DAYS_MS;
    expect(isResendExpiredAt(BASE_ISO, nowMs)).toBe(false);
  });

  it("returns true when approved_at is 15 days + 1 ms ago (just expired)", () => {
    const nowMs = BASE_MS + FIFTEEN_DAYS_MS + 1;
    expect(isResendExpiredAt(BASE_ISO, nowMs)).toBe(true);
  });

  it("returns false well within window (5 days ago)", () => {
    const nowMs = BASE_MS + 5 * 24 * 60 * 60 * 1000;
    expect(isResendExpiredAt(BASE_ISO, nowMs)).toBe(false);
  });

  it("returns true when approved_at is null", () => {
    expect(isResendExpiredAt(null, BASE_MS + 1000)).toBe(true);
  });

  it("returns true when approved_at is an empty string", () => {
    expect(isResendExpiredAt("", BASE_MS + 1000)).toBe(true);
  });

  it("returns true when approved_at is not a valid date (NaN guard)", () => {
    expect(isResendExpiredAt("not-a-date", BASE_MS + 1000)).toBe(true);
  });

  it("returns true when approved_at is a partial date string that Date.parse cannot handle", () => {
    expect(isResendExpiredAt("2026-99-99", BASE_MS + 1000)).toBe(true);
  });

  it("returns true long after expiry (30 days)", () => {
    const nowMs = BASE_MS + 30 * 24 * 60 * 60 * 1000;
    expect(isResendExpiredAt(BASE_ISO, nowMs)).toBe(true);
  });
});
