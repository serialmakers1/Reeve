/**
 * Pure-function coverage for the admin Comment Moderation helpers
 * (src/pages/admin/commentModeration/moderationHelpers.ts).
 *
 * State→action mapping, report-JSON coercion, burst formatting, signal
 * summaries and RPC-error copy — no React / Supabase / jsdom needed.
 */
import { describe, it, expect } from "vitest";
import {
  moderationStateMeta,
  allowedActionsForState,
  parseOpenReports,
  identityLine,
  authorTypeLabel,
  propertyLabel,
  formatBurst,
  summarizeQueueSignals,
  moderationErrorMessage,
  isStaleModerationError,
} from "@/pages/admin/commentModeration/moderationHelpers";

describe("moderationStateMeta / allowedActionsForState", () => {
  it("maps each known state to the backend-allowed actions", () => {
    expect(allowedActionsForState("visible")).toEqual(["delete"]);
    expect(allowedActionsForState("auto_hidden")).toEqual(["unhide", "delete"]);
    expect(allowedActionsForState("admin_hidden")).toEqual(["unhide"]);
    expect(allowedActionsForState("user_deleted")).toEqual([]);
  });

  it("fails safe on unknown/future/empty states: neutral, no actions, no crash", () => {
    const meta = moderationStateMeta("some_future_state");
    expect(meta.tone).toBe("neutral");
    expect(meta.actions).toEqual([]);
    expect(meta.label).toBe("Some future state");
    expect(allowedActionsForState(null)).toEqual([]);
    expect(allowedActionsForState(undefined)).toEqual([]);
    expect(moderationStateMeta("").actions).toEqual([]);
  });

  it("assigns intentional tones", () => {
    expect(moderationStateMeta("auto_hidden").tone).toBe("amber");
    expect(moderationStateMeta("admin_hidden").tone).toBe("destructive");
    expect(moderationStateMeta("visible").tone).toBe("neutral");
  });
});

describe("parseOpenReports", () => {
  it("coerces valid rows and defaults missing fields", () => {
    const rows = parseOpenReports([
      { reason: "spam", notes: "x", created_at: "2026-01-01T00:00:00Z", reporter_pseudonym: "Blue Fox", reporter_full_name: "A B", reporter_is_owner: true },
      { reason: "abusive" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].reporter_is_owner).toBe(true);
    expect(rows[1]).toMatchObject({ reason: "abusive", notes: null, reporter_is_owner: false, reporter_pseudonym: null });
  });

  it("returns [] for non-arrays and skips non-objects", () => {
    expect(parseOpenReports(null)).toEqual([]);
    expect(parseOpenReports(undefined)).toEqual([]);
    expect(parseOpenReports("[]")).toEqual([]);
    expect(parseOpenReports({})).toEqual([]);
    expect(parseOpenReports([1, "x", null, { reason: "spam" }])).toHaveLength(1);
  });

  it("coerces reporter_is_owner strictly to boolean true", () => {
    expect(parseOpenReports([{ reporter_is_owner: "true" }])[0].reporter_is_owner).toBe(false);
    expect(parseOpenReports([{ reporter_is_owner: 1 }])[0].reporter_is_owner).toBe(false);
  });
});

describe("identityLine", () => {
  it("shows both, or falls back to whichever exists", () => {
    expect(identityLine("Blue Fox", "Asha B")).toBe("Blue Fox · Asha B");
    expect(identityLine("Blue Fox", null)).toBe("Blue Fox");
    expect(identityLine(null, "Asha B")).toBe("Asha B");
    expect(identityLine("  ", "  ")).toBe("—");
    expect(identityLine(null, null)).toBe("—");
  });
});

describe("authorTypeLabel", () => {
  it("labels owner vs member", () => {
    expect(authorTypeLabel(true)).toBe("Owner");
    expect(authorTypeLabel(false)).toBe("Member");
  });
});

describe("propertyLabel", () => {
  it("prefers building, then locality/city, then a neutral fallback (never empty)", () => {
    expect(propertyLabel("Palm Grove", "Powai", "Mumbai")).toBe("Palm Grove");
    expect(propertyLabel(null, "Powai", "Mumbai")).toBe("Powai, Mumbai");
    expect(propertyLabel(null, "Powai", "powai ")).toBe("Powai");
    expect(propertyLabel(null, null, "Mumbai")).toBe("Mumbai");
    expect(propertyLabel(null, null, null)).toBe("Property details");
    expect(propertyLabel("   ", null, null)).toBe("Property details");
  });
});

describe("formatBurst", () => {
  it("returns null when not meaningful", () => {
    expect(formatBurst(null, 3)).toBeNull();
    expect(formatBurst(120, 1)).toBeNull();
    expect(formatBurst(Number.NaN, 3)).toBeNull();
  });

  it("formats sub-minute, minutes, hours and days", () => {
    expect(formatBurst(30, 3)).toBe("3 reports under a minute");
    expect(formatBurst(480, 3)).toBe("3 reports within ~8 min");
    expect(formatBurst(7200, 3)).toBe("3 reports within ~2 hr");
    expect(formatBurst(172800, 4)).toBe("4 reports within ~2 days");
  });
});

describe("summarizeQueueSignals", () => {
  it("includes burst + owner-reporter cues, neutral wording", () => {
    const chips = summarizeQueueSignals({
      open_report_count: 3,
      burst_seconds: 480,
      open_reports: [
        { reporter_is_owner: true },
        { reporter_is_owner: true },
        { reporter_is_owner: false },
      ],
    });
    expect(chips).toContain("3 reports within ~8 min");
    expect(chips).toContain("2 reporters own this property");
    // never punitive language
    expect(chips.join(" ").toLowerCase()).not.toContain("abuse");
    expect(chips.join(" ").toLowerCase()).not.toContain("coordinat");
  });

  it("singular owner phrasing and empty when no signals", () => {
    expect(summarizeQueueSignals({ open_report_count: 3, burst_seconds: null, open_reports: [{ reporter_is_owner: true }] }))
      .toEqual(["Property owner is a reporter"]);
    expect(summarizeQueueSignals({ open_report_count: 3, burst_seconds: null, open_reports: [] })).toEqual([]);
  });
});

describe("moderationErrorMessage / isStaleModerationError", () => {
  it("maps each RPC error code to friendly copy", () => {
    for (const code of [
      "COMMENT_NOT_HIDDEN", "ALREADY_DELETED", "CANNOT_RESTORE_USER_DELETED",
      "CANNOT_DELETE_USER_DELETED", "COMMENT_NOT_FOUND", "NOT_AUTHORIZED",
    ]) {
      expect(moderationErrorMessage(code)).not.toBe("Something went wrong — please try again.");
    }
  });

  it("handles prefixed messages and unknown fallback", () => {
    expect(moderationErrorMessage("ERROR: ALREADY_DELETED")).toContain("already removed");
    expect(moderationErrorMessage("boom")).toBe("Something went wrong — please try again.");
    expect(moderationErrorMessage(null)).toBe("Something went wrong — please try again.");
  });

  it("classifies stale-state errors for reconciliation", () => {
    expect(isStaleModerationError("COMMENT_NOT_HIDDEN")).toBe(true);
    expect(isStaleModerationError("ALREADY_DELETED")).toBe(true);
    expect(isStaleModerationError("COMMENT_NOT_FOUND")).toBe(true);
    expect(isStaleModerationError("CANNOT_RESTORE_USER_DELETED")).toBe(false);
    expect(isStaleModerationError("NOT_AUTHORIZED")).toBe(false);
  });
});
