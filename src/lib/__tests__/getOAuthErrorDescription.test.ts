import { describe, it, expect } from "vitest";
import { getOAuthErrorDescription } from "@/lib/authUtils";

/**
 * Profile's Google-link failure banner reads the callback error via this
 * helper. Switching the client to PKCE moves the error from the hash
 * (legacy implicit: `#error=...&error_description=...`) to the query string
 * (`?error=...&error_description=...`). The helper must read both, query first,
 * so the existing "already linked to another user" toast still fires.
 */
describe("getOAuthErrorDescription", () => {
  const ALREADY_LINKED =
    "Identity is already linked to another user";

  it("reads the PKCE-shaped query-string error (regression for Change C)", () => {
    const search = `?error=server_error&error_description=${encodeURIComponent(
      ALREADY_LINKED,
    )}`;
    expect(getOAuthErrorDescription(search, "")).toBe(ALREADY_LINKED);
  });

  it("still reads the legacy implicit hash error", () => {
    const hash = `#error=oauthError&error_description=${encodeURIComponent(
      ALREADY_LINKED,
    )}`;
    expect(getOAuthErrorDescription("", hash)).toBe(ALREADY_LINKED);
  });

  it("prefers the query string when both carry an error", () => {
    const search = "?error_description=from-query";
    const hash = "#error_description=from-hash";
    expect(getOAuthErrorDescription(search, hash)).toBe("from-query");
  });

  it("returns null on a clean callback (no error param)", () => {
    expect(getOAuthErrorDescription("?code=DUMMY", "")).toBeNull();
    expect(getOAuthErrorDescription("", "")).toBeNull();
    expect(getOAuthErrorDescription(null, undefined)).toBeNull();
  });

  it("returns null when error_description is present but empty", () => {
    expect(getOAuthErrorDescription("?error_description=", "")).toBeNull();
  });
});
