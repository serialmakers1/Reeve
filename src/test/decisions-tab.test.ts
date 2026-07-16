/**
 * Prompt 13 (D-165) — merge/sort/resilience coverage for DecisionsTab.
 *
 * Full React coverage would require heavy supabase-mock scaffolding; the pure
 * `mergeDecisionRows` export is where the behavior we care about lives.
 */
import { describe, it, expect } from "vitest";
import { mergeDecisionRows } from "@/components/admin/DecisionsTab";

const prop = (id: string, overrides: Partial<{ building_name: string; city: string; listing_type: string; status: string }> = {}) => ({
  id,
  building_name: overrides.building_name ?? `Bldg ${id}`,
  city: overrides.city ?? "Bangalore",
  listing_type: overrides.listing_type ?? "rent",
  status: overrides.status ?? "listed",
});

describe("mergeDecisionRows (Prompt 13, G3)", () => {
  it("merges listing + edit decisions into a single DESC-sorted list", () => {
    const rows = mergeDecisionRows(
      [
        { id: "l1", action: "listing_approved", actor_id: "a1", created_at: "2026-07-10T10:00:00Z", payload: null, properties: prop("p1"), users: { full_name: "Alice" } },
        { id: "l2", action: "listing_rejected", actor_id: "a2", created_at: "2026-07-12T10:00:00Z", payload: { reason: "Photos unclear" }, properties: prop("p2"), users: { full_name: "Bob" } },
      ],
      [
        { id: "e1", property_id: "p1", status: "approved",  reviewed_by: "a1", reviewed_at: "2026-07-11T10:00:00Z", created_at: "2026-07-11T09:00:00Z", rejection_reason: null, rejection_reason_text: null, properties: prop("p1"), users: { full_name: "Alice" } },
      ],
    );
    expect(rows.map((r) => r.key)).toEqual(["log:l2", "edit:e1", "log:l1"]);
    expect(rows[0].kind).toBe("listing_rejected");
    expect(rows[0].reason).toBe("Photos unclear");
    expect(rows[1].kind).toBe("edit_approved");
  });

  it("renders '—' reason for legacy listing_rejected rows without payload.reason", () => {
    const rows = mergeDecisionRows(
      [
        { id: "legacy", action: "listing_rejected", actor_id: "a1", created_at: "2026-06-01T10:00:00Z", payload: null, properties: prop("p1"), users: { full_name: "Alice" } },
      ],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBeNull();
  });

  it("edit_withdrawn shows 'Owner' as actor; edit_superseded shows null", () => {
    const rows = mergeDecisionRows(
      [],
      [
        { id: "w1", property_id: "p1", status: "withdrawn",  reviewed_by: null, reviewed_at: null, created_at: "2026-07-05T10:00:00Z", rejection_reason: null, rejection_reason_text: null, properties: prop("p1"), users: null },
        { id: "s1", property_id: "p1", status: "superseded", reviewed_by: null, reviewed_at: null, created_at: "2026-07-06T10:00:00Z", rejection_reason: null, rejection_reason_text: null, properties: prop("p1"), users: null },
      ],
    );
    const w = rows.find((r) => r.kind === "edit_withdrawn")!;
    const s = rows.find((r) => r.kind === "edit_superseded")!;
    expect(w.actorName).toBe("Owner");
    expect(s.actorName).toBeNull();
  });

  it("filters out rows for hard-deleted properties (null properties join)", () => {
    const rows = mergeDecisionRows(
      [
        { id: "l-orphan", action: "listing_approved", actor_id: "a1", created_at: "2026-07-01T10:00:00Z", payload: null, properties: null, users: { full_name: "Alice" } },
        { id: "l-ok",     action: "listing_approved", actor_id: "a1", created_at: "2026-07-02T10:00:00Z", payload: null, properties: prop("p1"), users: { full_name: "Alice" } },
      ],
      [
        { id: "e-orphan", property_id: "p2", status: "approved", reviewed_by: "a1", reviewed_at: "2026-07-03T10:00:00Z", created_at: "2026-07-03T09:00:00Z", rejection_reason: null, rejection_reason_text: null, properties: null, users: { full_name: "Alice" } },
      ],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("log:l-ok");
  });

  it("prefers reviewed_at over created_at for effectiveAt when both present", () => {
    const rows = mergeDecisionRows(
      [],
      [
        { id: "e1", property_id: "p1", status: "approved", reviewed_by: "a1", reviewed_at: "2026-07-10T10:00:00Z", created_at: "2026-07-09T10:00:00Z", rejection_reason: null, rejection_reason_text: null, properties: prop("p1"), users: { full_name: "Alice" } },
      ],
    );
    expect(rows[0].effectiveAt).toBe("2026-07-10T10:00:00Z");
  });

  it("falls back to created_at when reviewed_at is null (withdrawn/superseded)", () => {
    const rows = mergeDecisionRows(
      [],
      [
        { id: "w1", property_id: "p1", status: "withdrawn", reviewed_by: null, reviewed_at: null, created_at: "2026-07-08T10:00:00Z", rejection_reason: null, rejection_reason_text: null, properties: prop("p1"), users: null },
      ],
    );
    expect(rows[0].effectiveAt).toBe("2026-07-08T10:00:00Z");
  });

  it("attaches primary photo from the map when available", () => {
    const rows = mergeDecisionRows(
      [
        { id: "l1", action: "listing_approved", actor_id: "a1", created_at: "2026-07-01T10:00:00Z", payload: null, properties: prop("p1"), users: { full_name: "Alice" } },
      ],
      [],
      new Map([["p1", "https://cdn/img.jpg"]]),
    );
    expect(rows[0].primaryPhoto).toBe("https://cdn/img.jpg");
  });
});
