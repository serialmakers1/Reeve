/**
 * useListingSave — auto-save hook for the ListProperty form (Prompts 3–4).
 *
 * Mirrors the shape of useInspectionSave: ref-based patch accumulation, 500ms
 * debounce, newer-edits-win merge on failure. Deliberately NOT extracted into a
 * shared abstraction — the two hooks target different tables and different
 * lifecycle guarantees; sharing would obscure the specifics.
 *
 * Behavior:
 *   - Accepts propertyId. Null → hook is a no-op (draft row doesn't exist yet).
 *   - patch(partial) accumulates in pendingChangesRef and schedules a save.
 *   - Debounce: 500ms after last patch call.
 *   - On save failure:
 *       * Auth/session_expired: snapshot re-queued behind newer edits (safe to retry after re-auth).
 *       * Network catch: snapshot re-queued behind newer edits (safe to retry).
 *       * PostgREST 4xx (schema/enum/CHECK): snapshot DROPPED — re-queuing would
 *         poison every subsequent save with the same bad column. User's next
 *         keystroke re-adds; the persistent failure surfaces via lastError.
 *   - On 401/auth failure, saveState = "session_expired". Form consumes this
 *     to open a non-dismissible session-expired modal (D-100).
 *   - On unmount, best-effort fire-and-forget flush of any pending changes.
 *
 * Return:
 *   { saveState, patch, saveNow, lastError, failureTick, hasPendingChanges }
 *   - saveState: "idle" | "saving" | "saved" | "failed" | "session_expired"
 *   - patch(partial): accumulate a partial update and schedule the debounced save
 *   - saveNow(): cancel debounce and flush immediately; returns after DB round-trip
 *   - lastError: string | null — most recent save error message (surface via toast)
 *   - failureTick: increments on every failure so consumers re-fire even when
 *     the error message is identical across retries.
 *   - hasPendingChanges(): true if pending buffer non-empty OR a save is in flight.
 *     Consumers should call this after saveNow() to guard submit — even though
 *     saveNow() awaits the round-trip, hasPendingChanges() catches the case
 *     where the buffer accumulated MORE edits during the round-trip.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ListingSaveState =
  | "idle"
  | "saving"
  | "saved"
  | "failed"
  | "session_expired";

const DEBOUNCE_MS = 500;

// Matches "JWT expired", "Auth session missing", "Unauthorized", 401 messages, etc.
const AUTH_ERROR_RX = /\b(jwt|auth|unauthor(?:ized|ised))\b/i;

export function useListingSave(propertyId: string | null) {
  const [saveState, setSaveState] = useState<ListingSaveState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  // Increments on every failure so consumers (toast, section-error highlight)
  // re-fire even when the error message is identical across retries.
  const [failureTick, setFailureTick] = useState<number>(0);
  const pendingChangesRef = useRef<Record<string, unknown>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<boolean>(false);
  // Cache latest propertyId in a ref so the unmount cleanup captures the current value
  // even after propertyId prop mutates (unlikely — usually parent uses key={propertyId}
  // to force remount — but defense against misuse).
  const propertyIdRef = useRef<string | null>(propertyId);
  useEffect(() => {
    propertyIdRef.current = propertyId;
  }, [propertyId]);

  const flushNow = useCallback(async (): Promise<void> => {
    const id = propertyIdRef.current;
    if (!id) return;
    if (inFlightRef.current) return;

    const changes = pendingChangesRef.current;
    if (Object.keys(changes).length === 0) return;

    // Snapshot the changes we're about to save; fresh object for concurrent edits.
    const snapshot = changes;
    pendingChangesRef.current = {};
    inFlightRef.current = true;
    setSaveState("saving");

    try {
      // Dynamic patch shape doesn't fit the generated Update type; cast the client
      // for this one call (same pattern used for callback_requests per CLAUDE.md).
      const { error } = await (supabase as unknown as {
        from: (table: string) => {
          update: (values: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: { message?: string } | null }>;
          };
        };
      })
        .from("properties")
        .update(snapshot)
        .eq("id", id);

      if (error) {
        const isAuthError = AUTH_ERROR_RX.test(error.message ?? "");
        // Session-expired: safe to re-queue — user will re-auth and retry.
        // Other errors (400/CHECK/enum): DROP the failed snapshot. Re-queuing it
        // poisons every subsequent save with the same bad column (D-127 amp).
        // User's next edit re-adds; failed-column state surfaces via lastError.
        if (isAuthError) {
          pendingChangesRef.current = { ...snapshot, ...pendingChangesRef.current };
        }
        setLastError(error.message ?? "Save failed");
        setSaveState(isAuthError ? "session_expired" : "failed");
        setFailureTick((n) => n + 1);
      } else {
        setLastError(null);
        setSaveState("saved");
      }
    } catch (e) {
      // Network / unexpected error — safe to retry, re-queue snapshot behind newer edits.
      pendingChangesRef.current = { ...snapshot, ...pendingChangesRef.current };
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      setSaveState(AUTH_ERROR_RX.test(msg) ? "session_expired" : "failed");
      setFailureTick((n) => n + 1);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushNow();
    }, DEBOUNCE_MS);
  }, [flushNow]);

  /**
   * Accumulate a partial update and schedule a debounced save.
   * No-op if propertyId is null (form still in pre-draft state).
   * Clears any prior session_expired state — user is editing again so we assume
   * they've re-authenticated (form will show 401 again if not).
   */
  const patch = useCallback(
    (partial: Record<string, unknown>) => {
      if (!propertyIdRef.current) return;
      pendingChangesRef.current = { ...pendingChangesRef.current, ...partial };
      setSaveState((s) => (s === "session_expired" ? "session_expired" : "idle"));
      scheduleSave();
    },
    [scheduleSave],
  );

  /**
   * Flush pending changes immediately (cancels the debounce timer).
   * Await this before navigating away or submitting for review.
   */
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await flushNow();
  }, [flushNow]);

  // Best-effort unmount flush. Cannot await inside cleanup — fire-and-forget.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const id = propertyIdRef.current;
      const changes = pendingChangesRef.current;
      if (id && Object.keys(changes).length > 0 && !inFlightRef.current) {
        void (supabase as unknown as {
          from: (table: string) => {
            update: (values: Record<string, unknown>) => {
              eq: (col: string, val: string) => Promise<unknown>;
            };
          };
        })
          .from("properties")
          .update(changes)
          .eq("id", id);
      }
    };
    // Intentional empty deps — cleanup fires only on true unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPendingChanges = useCallback(
    () => Object.keys(pendingChangesRef.current).length > 0 || inFlightRef.current,
    [],
  );

  return { saveState, patch, saveNow, lastError, failureTick, hasPendingChanges };
}
