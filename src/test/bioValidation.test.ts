import { describe, it, expect } from "vitest";
import { mapBioError } from "@/lib/bioValidation";

describe("mapBioError", () => {
  it("maps BIO_TOO_LONG", () => {
    expect(mapBioError("BIO_TOO_LONG")).toBe("Bio must be 200 characters or fewer.");
  });

  it("maps CONTAINS_URL", () => {
    expect(mapBioError("CONTAINS_URL")).toBe(
      "Bios can't include phone numbers, email addresses or external links.",
    );
  });

  it("maps CONTAINS_EMAIL", () => {
    expect(mapBioError("CONTAINS_EMAIL")).toBe(
      "Bios can't include phone numbers, email addresses or external links.",
    );
  });

  it("maps CONTAINS_PHONE", () => {
    expect(mapBioError("CONTAINS_PHONE")).toBe(
      "Bios can't include phone numbers, email addresses or external links.",
    );
  });

  it("maps wrapped CONTAINS_PHONE message", () => {
    expect(mapBioError("Database error: CONTAINS_PHONE")).toBe(
      "Bios can't include phone numbers, email addresses or external links.",
    );
  });

  it("maps BLOCKED_WORD", () => {
    expect(mapBioError("BLOCKED_WORD")).toBe(
      "Please remove abusive or inappropriate language from your bio.",
    );
  });

  it("returns null for unknown error codes", () => {
    expect(mapBioError("SOME_UNKNOWN_CODE")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(mapBioError("")).toBeNull();
  });
});
