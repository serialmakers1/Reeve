import { describe, it, expect } from "vitest";
import { getSafeReturnTo } from "@/lib/authUtils";

/**
 * Regression tests for the canonical open-redirect guard used by every
 * `returnTo` navigation flow (Login, Profile, TenantPreferences).
 * Class: React Router GHSA-wrjc-x8rr-h8h6 backslash/protocol-relative bypass.
 *
 * jsdom's window.location.origin is the same-origin baseline used by the
 * sanitizer's URL parse.
 */
describe("getSafeReturnTo", () => {
  it("preserves an ordinary internal path", () => {
    expect(getSafeReturnTo("/")).toBe("/");
    expect(getSafeReturnTo("/search")).toBe("/search");
    expect(getSafeReturnTo("/owner/add")).toBe("/owner/add");
    expect(getSafeReturnTo("/tenant-dashboard/preferences")).toBe(
      "/tenant-dashboard/preferences",
    );
  });

  it("preserves an internal path with query and hash", () => {
    expect(getSafeReturnTo("/search?city=Bangalore")).toBe(
      "/search?city=Bangalore",
    );
    expect(getSafeReturnTo("/property/abc#details")).toBe(
      "/property/abc#details",
    );
  });

  it("rejects protocol-relative //host redirects", () => {
    expect(getSafeReturnTo("//evil.com")).toBe("/");
    expect(getSafeReturnTo("///evil.com")).toBe("/");
  });

  it("rejects backslash-normalized redirects", () => {
    expect(getSafeReturnTo("\\evil.com")).toBe("/");
    expect(getSafeReturnTo("/\\evil.com")).toBe("/");
    expect(getSafeReturnTo("/\\/evil.com")).toBe("/");
  });

  it("rejects absolute HTTP(S) URLs", () => {
    expect(getSafeReturnTo("https://evil.com")).toBe("/");
    expect(getSafeReturnTo("http://evil.com")).toBe("/");
    expect(getSafeReturnTo("https://evil.com/owner/add")).toBe("/");
  });

  it("rejects non-slash URI schemes", () => {
    expect(getSafeReturnTo("javascript:alert(1)")).toBe("/");
    expect(getSafeReturnTo("data:text/html,<script>alert(1)</script>")).toBe(
      "/",
    );
  });

  it("rejects encoded protocol-relative input once decoded to //host", () => {
    // The router/browser delivers already-decoded values; simulate that.
    expect(getSafeReturnTo(decodeURIComponent("%2F%2Fevil.com"))).toBe("/");
    // A still-encoded value does not start with "/" and is rejected too.
    expect(getSafeReturnTo("%2F%2Fevil.com")).toBe("/");
  });

  it("falls back to / for missing or empty input", () => {
    expect(getSafeReturnTo(null)).toBe("/");
    expect(getSafeReturnTo(undefined)).toBe("/");
    expect(getSafeReturnTo("")).toBe("/");
  });

  it("honors a custom fallback for callers that must not navigate", () => {
    // Profile / TenantPreferences pass "" so an invalid value yields no redirect.
    expect(getSafeReturnTo(null, "")).toBe("");
    expect(getSafeReturnTo("//evil.com", "")).toBe("");
    expect(getSafeReturnTo("javascript:alert(1)", "")).toBe("");
    // A legitimate internal path is still returned unchanged.
    expect(getSafeReturnTo("/list", "")).toBe("/list");
  });
});
