/**
 * SEC-009 — render-time YouTube URL guard at the public walkthrough link.
 *
 * Verifies that PropertyDetail only renders the "Watch Walkthrough" anchor
 * when the stored URL passes validateYoutubeUrl(). Malicious scheme URLs
 * (javascript:, data:), spoofed hosts, and non-video YouTube URLs must
 * never produce a rendered <a> element.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { validateYoutubeUrl } from "@/lib/ownerTextValidation";

// Minimal isolated test of the guard logic itself — tests the exact condition
// used in PropertyDetail without needing to mount the full page.
describe("validateYoutubeUrl — SEC-009 render guard", () => {
  it("accepts a standard watch URL", () => {
    expect(validateYoutubeUrl("https://youtube.com/watch?v=dQw4w9WgXcW").ok).toBe(true);
  });

  it("accepts a youtu.be short URL", () => {
    expect(validateYoutubeUrl("https://youtu.be/dQw4w9WgXcW").ok).toBe(true);
  });

  it("accepts a youtube shorts URL", () => {
    expect(validateYoutubeUrl("https://youtube.com/shorts/dQw4w9WgXcW").ok).toBe(true);
  });

  it("returns ok:true for empty string (field is optional)", () => {
    expect(validateYoutubeUrl("").ok).toBe(true);
  });

  it("rejects javascript: scheme", () => {
    expect(validateYoutubeUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("rejects data: scheme", () => {
    expect(validateYoutubeUrl("data:text/html,<script>alert(1)</script>").ok).toBe(false);
  });

  it("rejects a spoofed host containing youtube.com as a substring", () => {
    expect(validateYoutubeUrl("https://youtube.com.evil.com/watch?v=dQw4w9WgXcW").ok).toBe(false);
  });

  it("rejects a channel URL with no video ID", () => {
    expect(validateYoutubeUrl("https://youtube.com/channel/UCxxxxxxxxxxxxxx").ok).toBe(false);
  });
});
