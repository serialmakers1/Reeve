import { describe, it, expect } from "vitest";
import type { Event } from "@sentry/react";
import { isExpectedSupabaseNoise } from "@/lib/sentryNoise";

const POSTGRES = "auto.db.supabase.postgres";

/** Build a minimal Sentry Event with one exception value. */
function ev(value: string, mechanismType?: string): Event {
  return {
    exception: {
      values: [
        {
          type: "Error",
          value,
          ...(mechanismType
            ? { mechanism: { handled: false, type: mechanismType } }
            : {}),
        },
      ],
    },
  };
}

describe("isExpectedSupabaseNoise", () => {
  describe("drops (returns true) only the three exact handled cases", () => {
    it("ALREADY_REPORTED under the Supabase Postgres mechanism", () => {
      expect(isExpectedSupabaseNoise(ev("ALREADY_REPORTED", POSTGRES))).toBe(true);
    });
    it("location_not_ready:publish_location_incomplete under the mechanism", () => {
      expect(
        isExpectedSupabaseNoise(ev("location_not_ready:publish_location_incomplete", POSTGRES)),
      ).toBe(true);
    });
    it("the exact navigation AbortError under the mechanism", () => {
      expect(
        isExpectedSupabaseNoise(ev("AbortError: signal is aborted without reason", POSTGRES)),
      ).toBe(true);
    });
  });

  describe("keeps (returns false) everything else", () => {
    it("same text but a different (non-Supabase) mechanism", () => {
      expect(isExpectedSupabaseNoise(ev("ALREADY_REPORTED", "auto.http.browser"))).toBe(false);
    });
    it("same text but the auth mechanism", () => {
      expect(isExpectedSupabaseNoise(ev("ALREADY_REPORTED", "auto.db.supabase.auth"))).toBe(false);
    });
    it("missing mechanism entirely", () => {
      expect(isExpectedSupabaseNoise(ev("ALREADY_REPORTED"))).toBe(false);
    });
    it("AuthRetryableFetchError", () => {
      expect(
        isExpectedSupabaseNoise(ev("AuthRetryableFetchError: Failed to fetch", "auto.db.supabase.auth")),
      ).toBe(false);
    });
    it("invalid_anchor", () => {
      expect(isExpectedSupabaseNoise(ev("invalid_anchor", POSTGRES))).toBe(false);
    });
    it("Cover changes are not allowed in draft status", () => {
      expect(
        isExpectedSupabaseNoise(ev("Cover changes are not allowed in draft status", POSTGRES)),
      ).toBe(false);
    });
    it("sibling location_not_ready:location_incomplete", () => {
      expect(isExpectedSupabaseNoise(ev("location_not_ready:location_incomplete", POSTGRES))).toBe(false);
    });
    it("sibling location_not_ready:bhk_missing", () => {
      expect(isExpectedSupabaseNoise(ev("location_not_ready:bhk_missing", POSTGRES))).toBe(false);
    });
    it("a generic network FetchError", () => {
      expect(isExpectedSupabaseNoise(ev("TypeError: Failed to fetch", POSTGRES))).toBe(false);
    });
    it("a different AbortError value", () => {
      expect(
        isExpectedSupabaseNoise(ev("AbortError: The user aborted a request.", POSTGRES)),
      ).toBe(false);
    });
    it("an unknown DB error", () => {
      expect(isExpectedSupabaseNoise(ev("some unexpected db failure", POSTGRES))).toBe(false);
    });
    it("an event with no exception at all", () => {
      expect(isExpectedSupabaseNoise({})).toBe(false);
    });
    it("an event with an empty values array", () => {
      expect(isExpectedSupabaseNoise({ exception: { values: [] } })).toBe(false);
    });
    it("a real primary exception plus a matching secondary exception (only the primary is inspected)", () => {
      const event: Event = {
        exception: {
          values: [
            { type: "TypeError", value: "Cannot read properties of undefined" },
            {
              type: "Error",
              value: "ALREADY_REPORTED",
              mechanism: { handled: false, type: POSTGRES },
            },
          ],
        },
      };
      expect(isExpectedSupabaseNoise(event)).toBe(false);
    });
  });
});
