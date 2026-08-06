/**
 * Public price-change history rendering (PublicTimeline `price_changed`).
 *
 * Covers: rent + sale formatting, the ₹1 compact-collision → full fallback,
 * and safe fallback for malformed / legacy payloads.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PublicTimeline, { type PublicTimelineRow } from "@/components/property-detail/PublicTimeline";

function row(payload: Record<string, unknown>): PublicTimelineRow {
  return {
    id: Math.random().toString(36).slice(2),
    action: "price_changed",
    payload,
    is_public: true,
    created_at: new Date().toISOString(),
  };
}

describe("PublicTimeline price_changed", () => {
  it("renders a compact rent delta", () => {
    render(<PublicTimeline rows={[row({ action: "price_changed", listing_type: "rent", from_price: 48000, to_price: 45000 })]} />);
    expect(screen.getByText("₹48k → ₹45k")).toBeInTheDocument();
  });

  it("renders a compact sale delta in Lakh/Cr", () => {
    render(<PublicTimeline rows={[row({ action: "price_changed", listing_type: "sale", from_price: 12500000, to_price: 11800000 })]} />);
    expect(screen.getByText("₹1.25 Cr → ₹1.18 Cr")).toBeInTheDocument();
  });

  it("falls back to full Indian formatting when compact would hide a ₹1 difference", () => {
    render(<PublicTimeline rows={[row({ action: "price_changed", listing_type: "rent", from_price: 48000, to_price: 47999 })]} />);
    expect(screen.getByText("₹48,000 → ₹47,999")).toBeInTheDocument();
  });

  it("shows a safe fallback for malformed / legacy payloads", () => {
    const malformed = [
      { action: "price_changed", from_price: 48000, to_price: 45000 }, // missing listing_type
      { action: "price_changed", listing_type: "rent", from_price: "48000", to_price: 45000 }, // numeric string
      { action: "price_changed", listing_type: "rent", from_price: Infinity, to_price: 45000 }, // Infinity
      { action: "price_changed", listing_type: "rent", from_price: 0, to_price: 45000 }, // zero
      { action: "price_changed", listing_type: "rent", from_price: -5, to_price: 45000 }, // negative
      { action: "price_changed", listing_type: "rent" }, // missing prices
    ];
    render(<PublicTimeline rows={malformed.map(row)} />);
    expect(screen.getAllByText("Price updated")).toHaveLength(malformed.length);
  });
});
