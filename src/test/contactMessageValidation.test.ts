import { describe, it, expect } from "vitest";
import { mapContactMessageError } from "@/lib/contactMessageValidation";

describe("mapContactMessageError", () => {
  it("returns null for null", () => expect(mapContactMessageError(null)).toBeNull());
  it("returns null for undefined", () => expect(mapContactMessageError(undefined)).toBeNull());
  it("returns null for empty string", () => expect(mapContactMessageError("")).toBeNull());
  it("returns null for unknown code", () => expect(mapContactMessageError("unknown_code_xyz")).toBeNull());

  it("maps message_contains_phone — mentions phone numbers", () => {
    const msg = mapContactMessageError("message_contains_phone");
    expect(msg).not.toBeNull();
    expect(msg).toContain("phone");
  });

  it("maps message_contains_email — mentions email", () => {
    const msg = mapContactMessageError("message_contains_email");
    expect(msg).not.toBeNull();
    expect(msg).toContain("email");
  });

  it("maps message_contains_url — mentions links", () => {
    const msg = mapContactMessageError("message_contains_url");
    expect(msg).not.toBeNull();
    expect(msg!.toLowerCase()).toMatch(/link|web/);
  });

  it("maps message_contains_contact_handle — mentions handles", () => {
    const msg = mapContactMessageError("message_contains_contact_handle");
    expect(msg).not.toBeNull();
    expect(msg!.toLowerCase()).toContain("handle");
  });

  it("maps message_contains_contact_channel — mentions WhatsApp or Telegram", () => {
    const msg = mapContactMessageError("message_contains_contact_channel");
    expect(msg).not.toBeNull();
    expect(msg).toMatch(/WhatsApp|Telegram/);
  });

  it("maps message_blocked_content — does NOT mention WhatsApp or Telegram", () => {
    const msg = mapContactMessageError("message_blocked_content");
    expect(msg).not.toBeNull();
    expect(msg).not.toMatch(/WhatsApp|Telegram/);
  });

  it("maps message_too_long — mentions 200 characters", () => {
    const msg = mapContactMessageError("message_too_long");
    expect(msg).not.toBeNull();
    expect(msg).toContain("200");
  });
});
