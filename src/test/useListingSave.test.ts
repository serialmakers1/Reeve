/**
 * Regression test for the pre-draft field-loss bug (Phase 1.5 hotfix, 2026-07-14).
 *
 * Root cause: patch() used to early-return when propertyId was null, silently
 * discarding every field typed before the draft row existed. Section 3 fields
 * (security_deposit_amount, available_from) are typed BEFORE the Section 4
 * furnishing threshold that triggers draft creation — so they never reached
 * the DB and submit failed with "required fields missing".
 *
 * Contract under test: patch() buffers while propertyId is null; the buffer
 * flushes automatically once propertyId arrives.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const updateCalls: Array<{ values: Record<string, unknown>; id: string }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (values: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          updateCalls.push({ values, id });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

import { useListingSave } from "@/hooks/useListingSave";

describe("useListingSave pre-draft buffering", () => {
  beforeEach(() => {
    updateCalls.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("buffers pre-draft patches and flushes once propertyId arrives", async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useListingSave(id),
      { initialProps: { id: null as string | null } },
    );

    // Section-3 fields typed before any draft row exists.
    act(() => {
      result.current.patch({ security_deposit_amount: 70000 });
      result.current.patch({ available_from: "2026-07-15" });
    });

    // Debounce elapses with no propertyId → nothing sent, nothing lost.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(updateCalls).toHaveLength(0);
    expect(result.current.hasPendingChanges()).toBe(true);

    // Draft row created → propertyId arrives → buffer flushes automatically.
    rerender({ id: "draft-123" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe("draft-123");
    expect(updateCalls[0].values).toMatchObject({
      security_deposit_amount: 70000,
      available_from: "2026-07-15",
    });
    expect(result.current.hasPendingChanges()).toBe(false);
  });

  it("post-draft patches still save normally", async () => {
    const { result } = renderHook(() => useListingSave("draft-456"));

    act(() => {
      result.current.patch({ listed_rent: 40000 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe("draft-456");
    expect(updateCalls[0].values).toMatchObject({ listed_rent: 40000 });
  });
});
