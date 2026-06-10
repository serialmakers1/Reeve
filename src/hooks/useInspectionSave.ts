/**
 * useInspectionSave — autosave mechanism for the admin inspection form.
 *
 * Owns the four patch refs, the debounce timer, saveState, and all flush/queue
 * logic. Does NOT own inspectionRef, rooms, damages, or appliances state — those
 * stay in InspectionForm.tsx.
 *
 * Hook signature takes:
 *   inspectionId   — used in all Supabase .eq("id", ...) calls inside flushPendingSaves.
 *                    Can be undefined before loadData resolves (flush is a no-op then).
 *   setAppliances  — needed by flushPendingSaves to clear is_local_only after a
 *                    successful appliance upsert. This is a state WRITE (not a read),
 *                    but the hook must call it to keep is_local_only accurate.
 *
 * Returned API (all functions are stable useCallback references):
 *   saveState         — "saving" | "saved" | "failed"
 *   setSaveState      — exposed so the form's retry button can set "saving" before flush
 *   flushPendingSaves — async; cancels debounce, sends all pending patches atomically,
 *                       restores patches on failure with newer-edits-win merge
 *   scheduleSave      — sets "saving", clears existing debounce, schedules 500ms flush
 *   queueInspectionPatch  — accumulates a partial inspection patch, calls scheduleSave
 *   queueRoomPatch        — accumulates a per-room patch by roomId, calls scheduleSave
 *   queueApplianceSave    — queues a full appliance object for upsert, calls scheduleSave
 *
 * IMPORTANT: The queue functions do NOT call markInspectionStarted. Callers in
 * InspectionForm.tsx must call markInspectionStarted() explicitly before calling
 * any queue function that should trigger the scheduled→in_progress transition.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { emptyToNull } from "@/types/inspection";
import type { LocalAppliance, SaveState } from "@/types/inspection";

export function useInspectionSave(
  inspectionId: string | undefined,
  setAppliances: React.Dispatch<React.SetStateAction<LocalAppliance[]>>,
) {
  const { toast } = useToast();

  const [saveState, setSaveState] = useState<SaveState>("saved");

  const debounceRef = useRef<number | null>(null);
  const pendingInspectionPatchRef = useRef<Record<string, unknown>>({});
  const pendingRoomPatchRef = useRef<Record<string, Record<string, unknown>>>({});
  const pendingApplianceRef = useRef<Record<string, LocalAppliance>>({});

  // Clear the debounce timer on unmount so a navigating-away render doesn't
  // trigger a stale flush against a torn-down component.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Imperatively flush all pending patches to Supabase.
   * - Cancels any queued debounce so the timer doesn't fire a second time.
   * - Clears refs synchronously before awaiting so in-flight edits accumulate
   *   in the freshly-emptied objects (ensuring newer-edits-win on failure).
   * - On failure, merges failed patches back into the refs: { ...failed, ...newer }
   *   so that any edits made while this flush was in-flight are NOT overwritten.
   */
  const flushPendingSaves = useCallback(async () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!inspectionId) {
      setSaveState("saved");
      return;
    }

    // Snapshot + clear refs synchronously before any async work.
    const inspectionPatch = pendingInspectionPatchRef.current;
    const roomPatches = pendingRoomPatchRef.current;
    const appliancePatches = pendingApplianceRef.current;

    pendingInspectionPatchRef.current = {};
    pendingRoomPatchRef.current = {};
    pendingApplianceRef.current = {};

    const actions: Array<PromiseLike<{ error?: { message?: string } | null }>> = [];

    if (Object.keys(inspectionPatch).length > 0) {
      actions.push(
        supabase
          .from("property_inspections")
          .update(inspectionPatch)
          .eq("id", inspectionId) as unknown as PromiseLike<{ error?: { message?: string } | null }>,
      );
    }

    Object.entries(roomPatches).forEach(([roomId, patch]) => {
      if (Object.keys(patch).length === 0) return;
      actions.push(
        supabase
          .from("inspection_rooms")
          .update(patch)
          .eq("id", roomId) as unknown as PromiseLike<{ error?: { message?: string } | null }>,
      );
    });

    Object.values(appliancePatches).forEach((appliance) => {
      if (!appliance.appliance_type) return;
      actions.push(
        supabase
          .from("inspection_appliances")
          .upsert([{
            id: appliance.id,
            inspection_id: appliance.inspection_id,
            appliance_type: appliance.appliance_type,
            custom_label: emptyToNull(appliance.custom_label as string | null) as string | null,
            brand: emptyToNull(appliance.brand as string | null) as string | null,
            model_number: emptyToNull(appliance.model_number as string | null) as string | null,
            color: emptyToNull(appliance.color as string | null) as string | null,
            manufacturing_year: appliance.manufacturing_year ? Number(appliance.manufacturing_year) : null,
            condition: emptyToNull(appliance.condition as string | null) as string | null,
            ownership: emptyToNull(appliance.ownership as string | null) as string | null,
            notes: emptyToNull(appliance.notes as string | null) as string | null,
            serial_number: emptyToNull(appliance.serial_number as string | null) as string | null,
            last_service_date: appliance.last_service_date || null,
            location: emptyToNull(appliance.location as string | null) as string | null,
          }] as any) as unknown as PromiseLike<{ error?: { message?: string } | null }>,
      );
    });

    if (actions.length === 0) {
      setSaveState("saved");
      return;
    }

    try {
      const results = await Promise.all(actions);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      // Mark any upserted appliances as persisted (clears is_local_only).
      setAppliances((current) => current.map((appliance) => (
        appliancePatches[appliance.id] && appliance.appliance_type
          ? { ...appliance, is_local_only: false }
          : appliance
      )));
      setSaveState("saved");
    } catch (error: any) {
      // Failed save — restore patches into pending refs so the next edit or a
      // manual retry via the save indicator picks them up automatically.
      //
      // Merge order: { ...failedValue, ...newerCurrentValue }
      // → newerCurrentValue's keys overwrite failedValue's keys (newer-edits-win).
      pendingInspectionPatchRef.current = {
        ...inspectionPatch,
        ...pendingInspectionPatchRef.current,
      };
      for (const [roomId, patch] of Object.entries(roomPatches)) {
        pendingRoomPatchRef.current[roomId] = {
          ...patch,
          ...(pendingRoomPatchRef.current[roomId] ?? {}),
        };
      }
      for (const [applianceId, appliance] of Object.entries(appliancePatches)) {
        // Appliances are full objects — keep the newer in-flight version if present.
        if (!pendingApplianceRef.current[applianceId]) {
          pendingApplianceRef.current[applianceId] = appliance;
        }
      }
      toast({ title: "Autosave failed", description: error.message, variant: "destructive" });
      setSaveState("failed");
    }
  }, [inspectionId, setAppliances, toast]);

  /** 500ms debounced flush. Resets the timer on every call. */
  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void flushPendingSaves();
    }, 500);
  }, [flushPendingSaves]);

  /**
   * Accumulate a partial inspection patch and schedule a flush.
   * NOTE: Does NOT call markInspectionStarted. Callers are responsible.
   */
  const queueInspectionPatch = useCallback((patch: Record<string, unknown>) => {
    pendingInspectionPatchRef.current = {
      ...pendingInspectionPatchRef.current,
      ...patch,
    };
    scheduleSave();
  }, [scheduleSave]);

  /**
   * Accumulate a per-room patch and schedule a flush.
   * NOTE: Does NOT call markInspectionStarted. Callers are responsible.
   */
  const queueRoomPatch = useCallback((roomId: string, patch: Record<string, unknown>) => {
    pendingRoomPatchRef.current = {
      ...pendingRoomPatchRef.current,
      [roomId]: {
        ...(pendingRoomPatchRef.current[roomId] ?? {}),
        ...patch,
      },
    };
    scheduleSave();
  }, [scheduleSave]);

  /**
   * Queue a full appliance object for upsert and schedule a flush.
   * NOTE: Does NOT call markInspectionStarted. Callers are responsible.
   */
  const queueApplianceSave = useCallback((appliance: LocalAppliance) => {
    pendingApplianceRef.current = {
      ...pendingApplianceRef.current,
      [appliance.id]: appliance,
    };
    scheduleSave();
  }, [scheduleSave]);

  return {
    saveState,
    setSaveState,
    flushPendingSaves,
    scheduleSave,
    queueInspectionPatch,
    queueRoomPatch,
    queueApplianceSave,
  };
}
