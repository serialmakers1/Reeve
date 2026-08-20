import { useEffect, useMemo, useRef, useState } from "react";
import type { UtilityKey } from "@/lib/inspection-report/types";
import {
  type PropertyRecord,
  type InspectionRecord,
  type RoomRecord,
  type LocalRoom,
  type LocalAppliance,
  type DamageItem,
  type SaveState,
  type RoomTypeOption,
  STATUS_CONFIG,
  ROOM_TYPE_LABELS,
  ROOM_CONDITION_OPTIONS,
  FURNITURE_ITEM_OPTIONS,
  ROOM_DEFAULTS,
  emptyToNull,
  getOwnerName,
  shortId,
  getSuggestedRoomLabel,
  getConditionDotClass,
  getWorstCondition,
} from "@/types/inspection";
import { useInspectionSave } from "@/hooks/useInspectionSave";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Download, Loader2, Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ExportReportDialog } from "@/components/admin/ExportReportDialog";
import { UtilitiesCard } from "@/components/admin/inspection/UtilitiesCard";
import { ApplianceInventory } from "@/components/admin/inspection/ApplianceInventory";
import { DamageLog } from "@/components/admin/inspection/DamageLog";
import { ObservationsCard } from "@/components/admin/inspection/ObservationsCard";
import { InspectionSummaryCard } from "@/components/admin/inspection/InspectionSummaryCard";
import { KeyReturnCard } from "@/components/admin/inspection/KeyReturnCard";
import { CompletionWarnings, checkCompletionWarnings } from "@/components/admin/inspection/CompletionWarnings";
import { SurfacesSubsection } from "@/components/admin/inspection/SurfacesSubsection";
import { DoorsWindowsSubsection } from "@/components/admin/inspection/DoorsWindowsSubsection";
import { ElectricalSubsection } from "@/components/admin/inspection/ElectricalSubsection";
import { PlumbingSubsection } from "@/components/admin/inspection/PlumbingSubsection";
import { RoomTypeFields } from "@/components/admin/inspection/RoomTypeFields";
import { DerivedConditionChips } from "@/components/admin/inspection/DerivedConditionChips";
import { useConditionSnapshot } from "@/hooks/useConditionSnapshot";
import { useAutoPopulateDamages, useAutoPopulateApplianceDamages } from "@/hooks/useAutoPopulateDamages";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";




function buildDefaultRooms(bhk: string, inspectionId: string, balconyCount: number) {
  const base = ROOM_DEFAULTS[bhk] ?? [];
  const count = balconyCount || 1;

  // Balconies are injected between pre-balcony rooms (living/dining/kitchen)
  // and post-balcony rooms (bedrooms/bathrooms) to match walk-through order.
  const AFTER_BALCONIES = new Set(["bedroom", "bathroom"]);
  const preBalcony  = base.filter((r) => !AFTER_BALCONIES.has(r.room_type));
  const postBalcony = base.filter((r) => AFTER_BALCONIES.has(r.room_type));

  const balconyRooms = Array.from({ length: count }, (_, i) => ({
    room_type: "balcony" as const,
    room_label: count > 1 ? `Balcony ${i + 1}` : "Balcony",
  }));

  const ordered = [...preBalcony, ...balconyRooms, ...postBalcony];
  return ordered.map((room, index) => ({
    inspection_id: inspectionId,
    room_type: room.room_type,
    room_label: room.room_label,
    sort_order: index,
  }));
}

export default function InspectionForm() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: authLoading } = useRequireAuth({ requireAdmin: true });

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [rooms, setRooms] = useState<LocalRoom[]>([]);
  const [appliances, setAppliances] = useState<LocalAppliance[]>([]);
  const [damages, setDamages] = useState<DamageItem[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomType, setNewRoomType] = useState<RoomTypeOption | "">("");
  const [newRoomLabel, setNewRoomLabel] = useState("");
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [completionWarnings, setCompletionWarnings] = useState<string[]>([]);
  const [showCompletionWarnings, setShowCompletionWarnings] = useState(false);
  const [utilitiesOverview, setUtilitiesOverview] = useState<Record<string, any>>({});
  // Delete confirmation state for room and furniture (both stay in inline Room accordion)
  const [pendingDeleteRoomId, setPendingDeleteRoomId] = useState<string | null>(null);
  const [pendingDeleteFurniture, setPendingDeleteFurniture] = useState<{ roomId: string; idx: number } | null>(null);

  const inspectionRef = useRef<InspectionRecord | null>(null);

  const {
    saveState,
    setSaveState,
    flushPendingSaves,
    scheduleSave,
    queueInspectionPatch,
    queueRoomPatch,
    queueApplianceSave,
  } = useInspectionSave(inspection?.id, setAppliances);

  const ownerName = useMemo(() => getOwnerName(property?.users ?? null), [property]);

  const { writeConditionSnapshot } = useConditionSnapshot(rooms, setRooms, queueRoomPatch);
  useAutoPopulateDamages(rooms, damages, setDamages, queueInspectionPatch, scheduleSave);
  useAutoPopulateApplianceDamages(appliances, damages, setDamages, queueInspectionPatch);

  useEffect(() => {
    inspectionRef.current = inspection;
  }, [inspection]);

  useEffect(() => {
    if (authLoading || !propertyId) return;
    void loadData();
  }, [authLoading, propertyId]);

  const loadData = async () => {
    if (!propertyId) return;

    setLoading(true);
    try {
      const [propertyRes, inspectionRes] = await Promise.all([
        supabase
          .from("properties")
          .select(`
          id, building_name, flat_number, floor_number, locality, bhk, balconies,
            users!properties_owner_id_fkey (full_name)
          `)
          .eq("id", propertyId)
          .maybeSingle(),
        supabase
          .from("property_inspections")
          .select("*")
          .eq("property_id", propertyId)
          .maybeSingle(),
      ]);

      if (propertyRes.error) throw propertyRes.error;
      if (inspectionRes.error) throw inspectionRes.error;

      const propertyData = propertyRes.data as unknown as PropertyRecord | null;
      const inspectionData = inspectionRes.data as unknown as InspectionRecord | null;

      setProperty(propertyData);
      setInspection(inspectionData);
      inspectionRef.current = inspectionData;
      setUtilitiesOverview((inspectionData?.utilities_overview as Record<string, any>) ?? {});

      if (!inspectionData) {
        setRooms([]);
        setAppliances([]);
        setDamages([]);
        return;
      }

      const [roomsRes, appliancesRes] = await Promise.all([
        supabase
          .from("inspection_rooms")
          .select("*")
          .eq("inspection_id", inspectionData.id)
          .order("sort_order"),
        supabase
          .from("inspection_appliances")
          .select("*")
          .eq("inspection_id", inspectionData.id),
      ]);

      if (roomsRes.error) throw roomsRes.error;
      if (appliancesRes.error) throw appliancesRes.error;

      let roomRows = (roomsRes.data ?? []) as RoomRecord[];
      let generatedRoomIds = new Set<string>();

      if (roomRows.length === 0 && propertyData?.bhk) {
        const defaultRooms = buildDefaultRooms(propertyData.bhk, inspectionData.id, propertyData.balconies ?? 1);
        if (defaultRooms.length > 0) {
          const insertedRoomsRes = await supabase
            .from("inspection_rooms")
            .insert(defaultRooms as any)
            .select("*")
            .order("sort_order");

          if (insertedRoomsRes.error) throw insertedRoomsRes.error;
          roomRows = (insertedRoomsRes.data ?? []) as RoomRecord[];
          generatedRoomIds = new Set(roomRows.map((room) => room.id));
        }
      }

      setRooms(
        roomRows.map((room) => {
          const rf = ((room as any).room_features ?? {}) as Record<string, unknown>;

          // ── Fallback synthesis for old flat-key data → new entry arrays ──────
          // Runs in memory only. On next save, data is written in new format.

          // Wall entries: synthesize from walls_condition column if no entries yet
          if (!Array.isArray(rf.wall_entries) && room.walls_condition) {
            rf.wall_entries = [
              {
                id: crypto.randomUUID(),
                which_wall: "all_walls",
                condition: room.walls_condition,
                paint_condition: room.paint_condition ?? "",
                notes: room.walls_notes ?? "",
                is_custom: false,
                custom_label: "",
              },
            ];
          }

          // Flooring entries: synthesize from flooring_condition column if no entries yet
          if (!Array.isArray(rf.flooring_entries) && room.flooring_condition) {
            rf.flooring_entries = [
              {
                id: crypto.randomUUID(),
                flooring_zone: "entire_room",
                flooring_type: "",
                condition: room.flooring_condition,
                cracked_tiles_count: 0,
                notes: room.flooring_notes ?? "",
                is_custom: false,
                custom_label: "",
              },
            ];
          }

          // Ceiling entries: synthesize from ceiling_condition + old seepage flat keys
          if (!Array.isArray(rf.ceiling_entries) && room.ceiling_condition) {
            const oldSeepageObserved = rf.seepage_observed;
            const oldSeepageDetails = rf.seepage_details;
            let seepageDampness = "none";
            let ceilingNotes = room.ceiling_notes ?? "";
            if (oldSeepageObserved === "Y") {
              seepageDampness = "active_dampness";
              if (oldSeepageDetails && !ceilingNotes) {
                ceilingNotes = String(oldSeepageDetails);
              }
            }
            rf.ceiling_entries = [
              {
                id: crypto.randomUUID(),
                ceiling_area: "entire_ceiling",
                condition: room.ceiling_condition,
                seepage_dampness: seepageDampness,
                notes: ceilingNotes,
                is_custom: false,
                custom_label: "",
              },
            ];
          }

          // False ceiling: synthesize from old flat false_ceiling key if no object yet
          if (
            !rf.false_ceiling ||
            typeof rf.false_ceiling !== "object" ||
            Array.isArray(rf.false_ceiling)
          ) {
            const oldType = rf.false_ceiling_type ?? rf.false_ceiling;
            if (oldType && typeof oldType === "string") {
              rf.false_ceiling = {
                false_ceiling_type: String(oldType).toLowerCase() as "none" | "partial" | "full",
                material: "",
                condition: typeof rf.false_ceiling_condition === "string" ? rf.false_ceiling_condition : "",
                notes: "",
              };
            }
          }

          // Electrical inventory: migrate old flat keys to namespaced keys (in-memory only)
          if (!rf.electrical_fan_count && rf.fan_count) {
            rf.electrical_fan_count = Number(rf.fan_count) || 0;
          }
          if (!rf.electrical_fan_brand && rf.fan_brand) {
            rf.electrical_fan_brand = String(rf.fan_brand);
          }
          if (!rf.electrical_light_count && rf.light_count) {
            rf.electrical_light_count = Number(rf.light_count) || 0;
          }
          if (!rf.electrical_switchboard_count && rf.switchboard_count) {
            rf.electrical_switchboard_count = Number(rf.switchboard_count) || 0;
          }
          if (!rf.electrical_ac_provision_count && rf.ac_provision_count) {
            rf.electrical_ac_provision_count = Number(rf.ac_provision_count) || 0;
          }
          // Electrical detail fields: migrate old flat keys to namespaced keys
          if (!rf.electrical_light_brand && rf.light_brand) {
            rf.electrical_light_brand = String(rf.light_brand);
          }
          if (!rf.electrical_light_type && rf.light_type) {
            rf.electrical_light_type = String(rf.light_type);
          }
          if (!rf.electrical_switchboard_brand && rf.switchboard_brand) {
            rf.electrical_switchboard_brand = String(rf.switchboard_brand);
          }
          if (!rf.electrical_wifi_point && rf.wifi_point) {
            rf.electrical_wifi_point = String(rf.wifi_point);
          }
          if (!rf.electrical_wifi_brand && rf.wifi_brand) {
            rf.electrical_wifi_brand = String(rf.wifi_brand);
          }

          // Plumbing inventory: migrate old flat keys to namespaced keys (in-memory only)
          if (!rf.plumbing_hot_cold_mixer && rf.mixer_present) {
            rf.plumbing_hot_cold_mixer = rf.mixer_present === "Y" ? "yes" : "no";
          }
          if (!rf.plumbing_shower_present && (rf.shower_overhead || rf.shower_handheld)) {
            const overhead = rf.shower_overhead === "Y";
            const handheld = rf.shower_handheld === "Y";
            if (overhead && handheld) rf.plumbing_shower_present = "both";
            else if (overhead) rf.plumbing_shower_present = "overhead";
            else if (handheld) rf.plumbing_shower_present = "handheld";
          }

          return {
            ...room,
            is_auto_generated: generatedRoomIds.has(room.id),
            room_features: rf,
            furniture_items: (room as any).furniture_items ?? null,
          };
        }),
      );

      setAppliances(
        ((appliancesRes.data ?? []) as any[]).map((appliance) => ({
          ...appliance,
          manufacturing_year: appliance.manufacturing_year,
          is_local_only: false,
        })),
      );

      const rawDamages = Array.isArray(inspectionData.pre_existing_damages)
        ? (inspectionData.pre_existing_damages as any[])
        : [];

      // Map legacy severity values (low/medium/high) to current DB values.
      const mapSeverity = (v: string): DamageItem["severity"] => {
        if (v === "low")    return "cosmetic";
        if (v === "medium") return "repair_before_relet";
        if (v === "high")   return "urgent_immediate";
        if (v === "cosmetic" || v === "repair_before_relet" || v === "urgent_immediate") return v;
        return "";
      };

      setDamages(
        rawDamages.map((item) => ({
          localId: item.localId ?? crypto.randomUUID(),
          location: item.location ?? "",
          damage_type: item.damage_type ?? "",
          severity: mapSeverity(item.severity ?? ""),
          notes: item.notes ?? "",
          recommended_action: item.recommended_action ?? null,
          source_ref: item.source_ref ?? null,
          is_auto_generated: item.is_auto_generated ?? false,
        })),
      );
    } catch (error: any) {
      toast({ title: "Failed to load inspection form", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Transition inspection status from "scheduled" → "in_progress" on first edit.
  // Must be called by form helpers BEFORE they call any queue function.
  // Sets inspectionRef.current to the transitioned record so queue functions
  // reading the ref see the up-to-date status.
  const markInspectionStarted = () => {
    const currentInspection = inspectionRef.current;
    if (!currentInspection || currentInspection.status !== "scheduled") return;

    const nextInspection = { ...currentInspection, status: "in_progress" as const };
    inspectionRef.current = nextInspection;
    setInspection(nextInspection);
    // Use the hook's queue function (no recursion — queueInspectionPatch no
    // longer calls markInspectionStarted).
    queueInspectionPatch({ status: "in_progress" });
  };

  const updateInspectionField = (field: keyof InspectionRecord, value: unknown) => {
    if (!inspection) return;
    const nextInspection = { ...inspection, [field]: value };
    setInspection(nextInspection);
    // Set ref BEFORE markInspectionStarted so it reads the field value when
    // constructing the status-transition object.
    inspectionRef.current = nextInspection;
    markInspectionStarted();
    queueInspectionPatch({ [field]: emptyToNull(value as string | null) });
  };

  const updateRoomField = (roomId: string, field: keyof RoomRecord, value: string) => {
    markInspectionStarted();
    setRooms((current) => current.map((room) => (
      room.id === roomId ? { ...room, [field]: value || null } : room
    )));
    queueRoomPatch(roomId, { [field]: value || null });
  };

  const updateUtility = (key: UtilityKey, value: any) => {
    markInspectionStarted();
    setUtilitiesOverview(prev => {
      const next = { ...prev, [key]: value };
      // queueInspectionPatch accumulates and calls scheduleSave internally.
      queueInspectionPatch({ utilities_overview: next });
      return next;
    });
  };

  const updateRoomFeature = (roomId: string, key: string, value: any) => {
    markInspectionStarted();
    setRooms(current => current.map(room => {
      if (room.id !== roomId) return room;
      const next = { ...(room.room_features as Record<string, any> ?? {}), [key]: value };
      queueRoomPatch(roomId, { room_features: next });
      return { ...room, room_features: next };
    }));
  };

  const updateFurniture = (roomId: string, items: any[]) => {
    markInspectionStarted();
    setRooms(current => current.map(room => {
      if (room.id !== roomId) return room;
      queueRoomPatch(roomId, { furniture_items: items });
      return { ...room, furniture_items: items };
    }));
  };

  const handleAddRoom = async () => {
    if (!inspection || !newRoomType) return;
    try {
      const { data, error } = await supabase
        .from("inspection_rooms")
        .insert({
          inspection_id: inspection.id,
          room_type: newRoomType as any,
          room_label: newRoomLabel.trim() || getSuggestedRoomLabel(newRoomType, rooms),
          sort_order: rooms.length,
        } as any)
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRooms((current) => [...current, { ...(data as RoomRecord), is_auto_generated: false, room_features: (data as any).room_features ?? null, furniture_items: (data as any).furniture_items ?? null }]);
      }

      setNewRoomType("");
      setNewRoomLabel("");
      setShowAddRoom(false);
    } catch (error: any) {
      toast({ title: "Failed to add room", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveRoom = async (roomId: string) => {
    try {
      const { error } = await supabase.from("inspection_rooms").delete().eq("id", roomId);
      if (error) throw error;
      setRooms((current) => current.filter((room) => room.id !== roomId));
    } catch (error: any) {
      toast({ title: "Failed to remove room", description: error.message, variant: "destructive" });
    }
  };

  const handleAddAppliance = () => {
    if (!inspection) return;
    setAppliances((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        inspection_id: inspection.id,
        appliance_type: "",
        custom_label: null,
        brand: null,
        model_number: null,
        color: null,
        manufacturing_year: null,
        condition: null,
        ownership: null,
        notes: null,
        serial_number: null,
        last_service_date: null,
        is_local_only: true,
      },
    ]);
  };

  const updateApplianceField = (applianceId: string, field: keyof LocalAppliance, value: string) => {
    markInspectionStarted();
    let nextAppliance: LocalAppliance | null = null;

    setAppliances((current) => current.map((appliance) => {
      if (appliance.id !== applianceId) return appliance;
      nextAppliance = {
        ...appliance,
        [field]: value || null,
      };
      return nextAppliance;
    }));

    if (nextAppliance) {
      queueApplianceSave(nextAppliance);
    }
  };

  const handleDeleteAppliance = async (id: string) => {
    const appliance = appliances.find((a) => a.id === id);
    if (!appliance) return;
    try {
      if (!appliance.is_local_only) {
        const { error } = await supabase.from("inspection_appliances").delete().eq("id", id);
        if (error) throw error;
      }
      setAppliances((current) => current.filter((item) => item.id !== id));
    } catch (error: any) {
      toast({ title: "Failed to remove appliance", description: error.message, variant: "destructive" });
    }
  };

  const updateDamageItem = (localId: string, field: keyof DamageItem, value: string) => {
    markInspectionStarted();
    setDamages((current) => {
      const next = current.map((item) => item.localId === localId ? { ...item, [field]: value } : item);
      queueInspectionPatch({ pre_existing_damages: next });
      return next;
    });
  };

  const handleAddDamageItem = () => {
    markInspectionStarted();
    setDamages((current) => {
      const next: DamageItem[] = [
        ...current,
        {
          localId: crypto.randomUUID(),
          location: "",
          damage_type: "",
          severity: "",
          notes: "",
          recommended_action: null,
          source_ref: null,
          is_auto_generated: false,
        },
      ];
      queueInspectionPatch({ pre_existing_damages: next });
      return next;
    });
  };

  const handleDeleteDamageItem = (localId: string) => {
    markInspectionStarted();
    setDamages((current) => {
      const next = current.filter((item) => item.localId !== localId);
      queueInspectionPatch({ pre_existing_damages: next });
      return next;
    });
  };

  const executeCompletion = async () => {
    // Commit any pending debounced edits before the completion update fires.
    // Without this, the 500ms debounce can fire after the completion update
    // commits and overwrite status: "completed" back to "in_progress" (because
    // markInspectionStarted may have written that into the pending patch).
    // flushPendingSaves has its own internal try/catch and never throws.
    await flushPendingSaves();
    // Write derived condition snapshot before status update
    await writeConditionSnapshot();
    await flushPendingSaves(); // flush the snapshot patches
    if (!inspection || !propertyId) return;
    setSubmittingCompletion(true);
    try {
      const inspectionUpdate = await supabase
        .from("property_inspections")
        .update({ status: "completed" })
        .eq("id", inspection.id);

      if (inspectionUpdate.error) throw inspectionUpdate.error;

      toast({ title: "Inspection marked as completed" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Failed to complete inspection", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingCompletion(false);
    }
  };

  const handleMarkCompleted = () => {
    if (!inspection) return;
    const warnings = checkCompletionWarnings(rooms, damages, inspection);
    if (warnings.length > 0) {
      setCompletionWarnings(warnings);
      setShowCompletionWarnings(true);
    } else {
      void executeCompletion();
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!property) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Property not found.</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (!inspection) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-muted-foreground">Inspection record not found.</p>
            <Button variant="outline" onClick={() => navigate("/admin/inspections")}>Back to Inspections</Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[inspection.status] ?? STATUS_CONFIG.scheduled;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-28">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Inspection Form</h1>
            <p className="text-sm text-muted-foreground">Complete the baseline property inspection and save as you go.</p>
          </div>
          <div
            className={cn(
              "shrink-0 text-sm font-medium",
              saveState === "saving" && "text-muted-foreground",
              saveState === "saved" && "text-primary",
              saveState === "failed" && "cursor-pointer text-destructive",
            )}
            role={saveState === "failed" ? "button" : undefined}
            tabIndex={saveState === "failed" ? 0 : undefined}
            onClick={saveState === "failed" ? () => {
              setSaveState("saving");
              void flushPendingSaves();
            } : undefined}
          >
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : "Save failed — tap to retry"}
          </div>
        </div>

        <Card className="inspection-card">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Property ID</p>
                <p className="font-mono text-sm">{shortId(property.id)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Building & Locality</p>
                <p className="text-sm font-medium">{property.building_name}{property.locality ? ` · ${property.locality}` : ""}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Floor & Flat Number</p>
                <p className="text-sm font-medium">Floor {property.floor_number ?? "—"} · Flat {property.flat_number ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">BHK</p>
                <p className="text-sm font-medium">{property.bhk}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner Name</p>
                <p className="text-sm font-medium">{ownerName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Inspection Status</p>
                <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="inspection-card">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label>Inspection Mode</Label>
              <RadioGroup
                value={inspection.mode ?? ""}
                onValueChange={(value) => updateInspectionField("mode", value)}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { value: "in_person", label: "In-Person" },
                  { value: "virtual", label: "Virtual" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium",
                      inspection.mode === option.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background",
                    )}
                  >
                    <RadioGroupItem value={option.value} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="actual_date">Actual Inspection Date</Label>
              <Input
                id="actual_date"
                type="date"
                value={inspection.actual_date ?? ""}
                onChange={(event) => updateInspectionField("actual_date", event.target.value || null)}
                onBlur={(event) => updateInspectionField("actual_date", event.target.value || null)}
              />
            </div>
          </CardContent>
        </Card>

        <UtilitiesCard
          utilitiesOverview={utilitiesOverview}
          updateUtility={updateUtility}
        />

        {/* ── Room-by-Room Assessment (stays inline — will be extracted in a later prompt) ── */}
        <Card className="inspection-card">
          <CardHeader>
            <CardTitle>Room-by-Room Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible defaultValue={rooms[0]?.id} className="w-full rounded-md border">
              {rooms.map((room) => {
                const worstCondition = getWorstCondition(room);
                return (
                  <AccordionItem key={room.id} value={room.id} className="px-4">
                    <div className="flex items-center gap-2">
                      <AccordionTrigger className="inspection-room-trigger flex-1 py-4 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <span className="font-medium">{room.room_label}</span>
                          {worstCondition ? <span className={cn("h-2.5 w-2.5 rounded-full", getConditionDotClass(worstCondition))} /> : null}
                        </div>
                      </AccordionTrigger>
                      {!room.is_auto_generated ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPendingDeleteRoomId(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <AccordionContent className="inspection-room-content pb-6">
                      {/* Derived condition chips — computed from entry arrays, written to DB at completion/export */}
                      <DerivedConditionChips room={room} />

                      {/* SUB-SECTION A — Room Features */}
                      <Collapsible className="mt-4 rounded-lg border">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50">
                          Room Features
                          <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-4">
                          {/* Surfaces subsection — walls, flooring, ceiling, false ceiling */}
                          <SurfacesSubsection
                            roomId={room.id}
                            roomFeatures={(room.room_features as Record<string, unknown>) ?? {}}
                            updateRoomFeature={updateRoomFeature}
                          />
                          {/* Doors & Windows subsection */}
                          <DoorsWindowsSubsection
                            roomId={room.id}
                            roomFeatures={(room.room_features as Record<string, unknown>) ?? {}}
                            updateRoomFeature={updateRoomFeature}
                          />
                          {/* Electrical subsection */}
                          <ElectricalSubsection
                            roomId={room.id}
                            roomFeatures={(room.room_features as Record<string, unknown>) ?? {}}
                            updateRoomFeature={updateRoomFeature}
                          />
                          {/* Plumbing subsection */}
                          <PlumbingSubsection
                            roomId={room.id}
                            roomFeatures={(room.room_features as Record<string, unknown>) ?? {}}
                            updateRoomFeature={updateRoomFeature}
                          />
                          <RoomTypeFields
                            roomId={room.id}
                            roomType={room.room_type}
                            roomFeatures={(room.room_features as Record<string, unknown>) ?? {}}
                            updateRoomFeature={updateRoomFeature}
                          />
                        </CollapsibleContent>
                      </Collapsible>

                      {/* SUB-SECTION B — Furniture & Fittings */}
                      <div className="mt-4 space-y-3">
                        <Label className="text-sm font-semibold">Furniture & Fittings</Label>
                        {(() => {
                          const items = (Array.isArray(room.furniture_items) ? room.furniture_items : []) as Array<{
                            id: string; item: string; count: number; condition: string; notes: string; add_to_damage_log: boolean;
                          }>;
                          const setItems = (next: typeof items) => updateFurniture(room.id, next);
                          return (
                            <div className="space-y-2">
                              {items.map((fi, idx) => (
                                <div key={fi.id} className="flex flex-wrap items-start gap-2 rounded-lg border p-3">
                                  <div className="w-36">
                                    <Select value={fi.item || undefined} onValueChange={(v) => { const n = [...items]; n[idx] = { ...fi, item: v }; setItems(n); }}>
                                      <SelectTrigger className="h-9"><SelectValue placeholder="Item" /></SelectTrigger>
                                      <SelectContent>
                                        {FURNITURE_ITEM_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="w-16">
                                    <Input className="h-9" type="number" min={1} value={fi.count} onChange={(e) => { const n = [...items]; n[idx] = { ...fi, count: Math.max(1, Number(e.target.value) || 1) }; setItems(n); }} />
                                  </div>
                                  <div className="w-40">
                                    <Select value={fi.condition || undefined} onValueChange={(v) => { const n = [...items]; n[idx] = { ...fi, condition: v, add_to_damage_log: (v !== 'moderate_damage' && v !== 'severe_damage') ? false : fi.add_to_damage_log }; setItems(n); }}>
                                      <SelectTrigger className="h-9"><SelectValue placeholder="Condition" /></SelectTrigger>
                                      <SelectContent>
                                        {ROOM_CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex-1 min-w-[120px]">
                                    <Input className="h-9" placeholder="Notes" value={fi.notes} onChange={(e) => { const n = [...items]; n[idx] = { ...fi, notes: e.target.value }; setItems(n); }} />
                                  </div>
                                  {(fi.condition === 'moderate_damage' || fi.condition === 'severe_damage') && (
                                    <label className="flex items-center gap-2 text-xs whitespace-nowrap pt-2">
                                      <Checkbox
                                        checked={fi.add_to_damage_log}
                                        onCheckedChange={(checked) => {
                                          const n = [...items];
                                          const wasChecked = fi.add_to_damage_log;
                                          n[idx] = { ...fi, add_to_damage_log: !!checked };
                                          setItems(n);
                                          if (checked && !wasChecked) {
                                            const newDamage: DamageItem = {
                                              localId: crypto.randomUUID(),
                                              location: room.room_label,
                                              damage_type: fi.item,
                                              severity: fi.condition === 'moderate_damage' ? 'repair_before_relet' : 'urgent_immediate',
                                              notes: fi.notes,
                                              recommended_action: null,
                                              source_ref: { room_id: room.id, field_key: `furniture_item_${fi.id ?? idx}` },
                                              is_auto_generated: false,
                                            };
                                            setDamages((prev) => {
                                              const next = [...prev, newDamage];
                                              queueInspectionPatch({ pre_existing_damages: next });
                                              return next;
                                            });
                                          }
                                        }}
                                      />
                                      Add to damage log
                                    </label>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 shrink-0"
                                    onClick={() => setPendingDeleteFurniture({ roomId: room.id, idx })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { id: crypto.randomUUID(), item: '', count: 1, condition: '', notes: '', add_to_damage_log: false }])}>
                                <Plus className="h-4 w-4" /> Add Item
                              </Button>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label>Overall Room Notes</Label>
                        <Textarea
                          rows={3}
                          placeholder="Add notes..."
                          value={room.overall_room_notes ?? ""}
                          onChange={(event) => updateRoomField(room.id, "overall_room_notes", event.target.value)}
                          onBlur={(event) => updateRoomField(room.id, "overall_room_notes", event.target.value)}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <div className="space-y-4 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddRoom((current) => !current)}>
                <Plus className="h-4 w-4" />
                Add Room
              </Button>

              {showAddRoom ? (
                <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Select
                      value={newRoomType || undefined}
                      onValueChange={(value) => {
                        const typedValue = value as RoomTypeOption;
                        setNewRoomType(typedValue);
                        setNewRoomLabel(getSuggestedRoomLabel(typedValue, rooms));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Room Label</Label>
                    <Input value={newRoomLabel} onChange={(event) => setNewRoomLabel(event.target.value)} />
                  </div>

                  <div className="flex items-end">
                    <Button type="button" onClick={() => void handleAddRoom()} disabled={!newRoomType}>
                      Add
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <ApplianceInventory
          appliances={appliances}
          rooms={rooms}
          updateApplianceField={updateApplianceField}
          handleAddAppliance={handleAddAppliance}
          handleDeleteAppliance={handleDeleteAppliance}
        />

        <DamageLog
          damages={damages}
          updateDamageItem={updateDamageItem}
          handleAddDamageItem={handleAddDamageItem}
          handleDeleteDamageItem={handleDeleteDamageItem}
        />

        <InspectionSummaryCard
          inspection={inspection}
          updateInspectionField={updateInspectionField}
        />

        <KeyReturnCard
          inspection={inspection}
          rooms={rooms}
          updateInspectionField={updateInspectionField}
        />

        <ObservationsCard
          inspection={inspection}
          updateInspectionField={updateInspectionField}
        />
      </div>

      <div className="inspection-action-bar fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-60">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={() => navigate("/admin/inspections")} className="flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to Inspections
          </button>

          <div className="flex items-center gap-3">
            {(inspection.status === "scheduled" || inspection.status === "in_progress") ? (
              <Button type="button" onClick={handleMarkCompleted} disabled={submittingCompletion}>
                {submittingCompletion ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Mark as Completed
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={() => setExportDialogOpen(true)}
              disabled={!inspection || !property}
            >
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <ExportReportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        payloadBase={{
          property,
          inspection,
          rooms,
          appliances,
          damages,
          utilitiesOverview,
          ownerName,
          mediaDriveLink: inspection.media_drive_link,
        }}
        flushPendingSaves={flushPendingSaves}
        onBeforeExport={async () => {
          await writeConditionSnapshot();
          await flushPendingSaves();
        }}
      />

      <CompletionWarnings
        open={showCompletionWarnings}
        warnings={completionWarnings}
        onClose={() => setShowCompletionWarnings(false)}
        onConfirm={() => {
          setShowCompletionWarnings(false);
          void executeCompletion();
        }}
      />

      {/* Room delete confirmation */}
      <AlertDialog open={!!pendingDeleteRoomId} onOpenChange={(open) => !open && setPendingDeleteRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this room?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteRoomId) {
                  void handleRemoveRoom(pendingDeleteRoomId);
                  setPendingDeleteRoomId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Furniture item delete confirmation */}
      <AlertDialog open={!!pendingDeleteFurniture} onOpenChange={(open) => !open && setPendingDeleteFurniture(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this furniture item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteFurniture) {
                  const { roomId, idx } = pendingDeleteFurniture;
                  const room = rooms.find((r) => r.id === roomId);
                  if (room) {
                    const items = (Array.isArray(room.furniture_items) ? room.furniture_items : []) as any[];
                    updateFurniture(roomId, items.filter((_, i) => i !== idx));
                  }
                  setPendingDeleteFurniture(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
