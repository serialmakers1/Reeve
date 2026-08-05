import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client BEFORE importing the module under test.
const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  mapOwnerTextError,
  validateYoutubeUrl,
  validatePropertyFieldText,
  OWNER_TEXT_MAX,
} from "@/lib/ownerTextValidation";
import {
  canonicalizeLabel,
  validateCustomName,
  type CanonicalOption,
} from "@/utils/property/customItemValidation";

describe("validateYoutubeUrl", () => {
  it("accepts empty (optional field)", () => {
    expect(validateYoutubeUrl("")).toEqual({ ok: true });
    expect(validateYoutubeUrl("   ")).toEqual({ ok: true });
  });

  it("accepts supported video URL forms with an 11-char id", () => {
    expect(validateYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ").ok).toBe(true);
    expect(validateYoutubeUrl("https://youtu.be/dQw4w9WgXcQ").ok).toBe(true);
    expect(validateYoutubeUrl("https://youtube.com/shorts/dQw4w9WgXcQ").ok).toBe(true);
    expect(validateYoutubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ").ok).toBe(true);
    expect(validateYoutubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ").ok).toBe(true);
  });

  it("rejects homepages, channels and search pages (no video id)", () => {
    expect(validateYoutubeUrl("https://youtube.com").ok).toBe(false);
    expect(validateYoutubeUrl("https://www.youtube.com/@somechannel").ok).toBe(false);
    expect(validateYoutubeUrl("https://www.youtube.com/results?search_query=flats").ok).toBe(false);
  });

  it("rejects spoofed host and non-https", () => {
    expect(validateYoutubeUrl("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ").ok).toBe(false);
    expect(validateYoutubeUrl("http://youtube.com/watch?v=dQw4w9WgXcQ").ok).toBe(false);
  });

  it("rejects malformed ids and non-URLs", () => {
    expect(validateYoutubeUrl("https://youtu.be/short").ok).toBe(false);
    expect(validateYoutubeUrl("not a url").ok).toBe(false);
  });

  it("rejects a URL longer than 200 chars with a too_long reason", () => {
    const longId = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&x=" + "a".repeat(200);
    expect(longId.length).toBeGreaterThan(OWNER_TEXT_MAX.youtube_walkthrough_url);
    expect(validateYoutubeUrl(longId)).toEqual({ ok: false, reason: "too_long" });
  });
});

describe("mapOwnerTextError", () => {
  it("maps TEXT_TOO_LONG per field", () => {
    expect(mapOwnerTextError("parking_notes", "TEXT_TOO_LONG")).toBe("Parking notes must be 80 characters or fewer.");
    expect(mapOwnerTextError("building_rules", "TEXT_TOO_LONG")).toBe("House rules must be 200 characters or fewer.");
    expect(mapOwnerTextError("building_notes", "TEXT_TOO_LONG")).toBe("About the property must be 300 characters or fewer.");
  });

  it("maps contact/link codes to shared copy", () => {
    for (const code of ["CONTAINS_URL", "CONTAINS_EMAIL", "CONTAINS_PHONE", "CONTAINS_SOCIAL_HANDLE", "BLOCKED_CONTENT"]) {
      expect(mapOwnerTextError("building_notes", code)).toBe(
        "Please remove phone numbers, email addresses or external links.",
      );
    }
  });

  it("maps BLOCKED_WORD and returns null for unknown", () => {
    expect(mapOwnerTextError("building_notes", "BLOCKED_WORD")).toMatch(/abusive/i);
    expect(mapOwnerTextError("building_notes", "SOMETHING_ELSE")).toBeNull();
  });
});

describe("validatePropertyFieldText", () => {
  beforeEach(() => rpcMock.mockReset());

  it("ok when RPC returns no error", async () => {
    rpcMock.mockResolvedValue({ data: "hello", error: null });
    expect(await validatePropertyFieldText("building_notes", "hello")).toEqual({ ok: true });
  });

  it("maps a known policy error inline", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "CONTAINS_URL" } });
    const res = await validatePropertyFieldText("building_notes", "http://x.com");
    expect(res).toEqual({ ok: false, error: "Please remove phone numbers, email addresses or external links." });
  });

  it("returns failed for an unmapped DB error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "some weird db error" } });
    const res = await validatePropertyFieldText("building_notes", "x");
    expect(res).toEqual({ ok: false, error: null, failed: true });
  });

  it("returns failed on a thrown/network error", async () => {
    rpcMock.mockImplementation(() => Promise.reject(new Error("network")));
    const res = await validatePropertyFieldText("building_notes", "x");
    expect(res).toEqual({ ok: false, error: null, failed: true });
    rpcMock.mockReset();
  });
});

describe("canonicalizeLabel", () => {
  it("collapses AC spelling variants to one key", () => {
    const forms = ["Air Conditioner", "air conditioner", "AirConditioner", "air-conditioner"];
    const canon = forms.map(canonicalizeLabel);
    expect(new Set(canon).size).toBe(1);
    expect(canon[0]).toBe("airconditioner");
  });

  it("preserves Indian-script names (non-empty, distinct)", () => {
    const a = canonicalizeLabel("पंखा"); // fan
    const b = canonicalizeLabel("कुर्सी"); // chair
    expect(a).not.toBe("");
    expect(b).not.toBe("");
    expect(a).not.toBe(b);
  });
});

describe("validateCustomName", () => {
  const furniture: CanonicalOption[] = [
    { value: "ac", label: "AC" },
    { value: "wardrobe", label: "Wardrobe" },
  ];
  const base = {
    existingCustoms: [] as string[],
    canonicalOptions: furniture,
    limit: 5,
    noun: "furniture items",
  };

  it("flags a canonical duplicate (case/space/punct-insensitive) directing to the option", () => {
    for (const name of ["Air Conditioner", "air conditioner", "AirConditioner", "air-conditioner"]) {
      const r = validateCustomName(name, { ...base, mode: "add" });
      expect(r.code).toBe("DUP_CANONICAL");
      expect(r.message).toContain('"AC"');
    }
  });

  it("flags a custom duplicate", () => {
    const r = validateCustomName("study table", {
      ...base,
      mode: "add",
      existingCustoms: ["Study Table"],
    });
    expect(r.code).toBe("DUP_CUSTOM");
    expect(r.message).toContain("Study Table");
  });

  it("rejects >3 words or >30 chars", () => {
    expect(validateCustomName("one two three four", { ...base, mode: "add" }).code).toBe("TOO_LONG");
    expect(validateCustomName("a".repeat(31), { ...base, mode: "add" }).code).toBe("TOO_LONG");
  });

  it("enforces the 5-item limit only in add mode", () => {
    const five = ["a", "b", "c", "d", "e"];
    expect(validateCustomName("New", { ...base, mode: "add", existingCustoms: five }).code).toBe("LIMIT");
    // edit mode never returns LIMIT, and excludes the edited row from dup check
    expect(
      validateCustomName("New Name", { ...base, mode: "edit", existingCustoms: five, selfIndex: 0 }).code,
    ).toBe("OK");
  });

  it("edit mode still flags duplicates of other rows", () => {
    const r = validateCustomName("b", { ...base, mode: "edit", existingCustoms: ["a", "b", "c"], selfIndex: 0 });
    expect(r.code).toBe("DUP_CUSTOM");
  });

  it("accepts a valid unique name", () => {
    expect(validateCustomName("Shoe Rack", { ...base, mode: "add" }).code).toBe("OK");
  });
});
