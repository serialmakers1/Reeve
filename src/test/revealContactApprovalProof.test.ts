import { describe, it, expect } from "vitest";
import { isApprovedTransitionProof } from "../../supabase/functions/reveal-contact/approvalProof";

// F-08: proves the reveal-contact approval PATCH transitioned exactly one pending
// row to approved before any contact PII is loaded/dispatched.
const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("isApprovedTransitionProof", () => {
  it("true: exactly one row, id matches, status approved (normal approval)", () => {
    expect(isApprovedTransitionProof([{ id: ID, status: "approved" }], ID)).toBe(true);
  });

  it("false: zero rows (withdrawal won / concurrent-approval loser)", () => {
    expect(isApprovedTransitionProof([], ID)).toBe(false);
  });

  it("false: row status not approved", () => {
    expect(isApprovedTransitionProof([{ id: ID, status: "withdrawn" }], ID)).toBe(false);
  });

  it("false: wrong id", () => {
    expect(isApprovedTransitionProof([{ id: OTHER, status: "approved" }], ID)).toBe(false);
  });

  it("false: multiple rows", () => {
    expect(
      isApprovedTransitionProof(
        [{ id: ID, status: "approved" }, { id: OTHER, status: "approved" }],
        ID,
      ),
    ).toBe(false);
  });

  it("false: malformed (non-array)", () => {
    expect(isApprovedTransitionProof(null, ID)).toBe(false);
    expect(isApprovedTransitionProof(undefined, ID)).toBe(false);
    expect(isApprovedTransitionProof({ id: ID, status: "approved" }, ID)).toBe(false);
  });

  it("false: missing fields", () => {
    expect(isApprovedTransitionProof([{ status: "approved" }], ID)).toBe(false);
    expect(isApprovedTransitionProof([{ id: ID }], ID)).toBe(false);
    expect(isApprovedTransitionProof([null], ID)).toBe(false);
  });
});
