import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Download, Loader2, Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type OwnerRelation = { full_name: string | null } | { full_name: string | null }[] | null;

type PropertyRecord = {
  id: string;
  building_name: string;
  flat_number: string | null;
  floor_number: number | null;
  locality: string | null;
  bhk: string;
  balconies: number | null;
  users: OwnerRelation;
};

type InspectionRecord = {
  id: string;
  property_id: string;
  inspector_user_id: string;
  status: "scheduled" | "in_progress" | "completed";
  mode: "in_person" | "virtual" | null;
  scheduled_date: string | null;
  actual_date: string | null;
  general_observations: string | null;
  pre_existing_damages: unknown;
  inspector_notes: string | null;
  pbr_generated_at: string | null;
  utilities_overview: unknown;
  structural_observations: unknown;
};

type RoomRecord = {
  id: string;
  inspection_id: string;
  room_type: string;
  room_label: string;
  sort_order: number;
  walls_condition: string | null;
  walls_notes: string | null;
  flooring_condition: string | null;
  flooring_notes: string | null;
  ceiling_condition: string | null;
  ceiling_notes: string | null;
  doors_windows_condition: string | null;
  doors_windows_notes: string | null;
  electrical_condition: string | null;
  electrical_notes: string | null;
  plumbing_condition: string | null;
  plumbing_notes: string | null;
  overall_room_notes: string | null;
};

type LocalRoom = RoomRecord & {
  is_auto_generated: boolean;
  room_features: unknown;
  furniture_items: unknown;
};

type LocalAppliance = {
  id: string;
  inspection_id: string;
  appliance_type: string;
  custom_label: string | null;
  brand: string | null;
  model_number: string | null;
  color: string | null;
  manufacturing_year: string | number | null;
  condition: string | null;
  ownership: string | null;
  notes: string | null;
  serial_number: string | null;
  last_service_date: string | null;
  is_local_only?: boolean;
};

type DamageItem = {
  localId: string;
  location: string;
  damage_type: string;
  severity: "" | "low" | "medium" | "high";
  notes: string;
};

type SaveState = "saving" | "saved";

type RoomTypeOption =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "balcony"
  | "utility"
  | "parking"
  | "common_area"
  | "pooja_room"
  | "study_room"
  | "home_office"
  | "servant_quarter"
  | "store_room"
  | "other";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "border-border bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "border-primary/20 bg-accent text-accent-foreground" },
  completed: { label: "Completed", className: "border-primary/20 bg-primary/10 text-primary" },
};

const ROOM_TYPE_LABELS: Record<RoomTypeOption, string> = {
  living_room: "Living Room",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  balcony: "Balcony",
  utility: "Utility",
  parking: "Parking",
  common_area: "Common Area",
  pooja_room: "Pooja Room / Mandir",
  study_room: "Study Room",
  home_office: "Home Office",
  servant_quarter: "Servant Quarter",
  store_room: "Store Room",
  other: "Other",
};

const ROOM_CONDITION_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "minor_wear", label: "Minor Wear" },
  { value: "moderate_damage", label: "Moderate Damage" },
  { value: "severe_damage", label: "Severe Damage" },
] as const;

const APPLIANCE_TYPE_OPTIONS = [
  { value: "refrigerator", label: "Refrigerator" },
  { value: "washing_machine", label: "Washing Machine" },
  { value: "dryer", label: "Dryer" },
  { value: "air_conditioner", label: "Air Conditioner" },
  { value: "geyser", label: "Geyser / Water Heater" },
  { value: "microwave", label: "Microwave" },
  { value: "stove_hob", label: "Stove / Hob" },
  { value: "exhaust_fan", label: "Exhaust Fan" },
  { value: "ceiling_fan", label: "Ceiling Fan" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "water_purifier", label: "Water Purifier" },
  { value: "tv", label: "Television" },
  { value: "fire_extinguisher", label: "Fire Extinguisher" },
  { value: "other", label: "Other" },
] as const;

const APPLIANCE_CONDITION_OPTIONS = [
  { value: "fully_functional", label: "Fully Functional" },
  { value: "minor_issues", label: "Minor Issues" },
  { value: "non_functional", label: "Non-Functional" },
] as const;

const APPLIANCE_OWNERSHIP_OPTIONS = [
  { value: "landlord", label: "Landlord" },
  { value: "platform", label: "Platform" },
  { value: "tenant_owned", label: "Tenant-Owned" },
] as const;

const ROOM_SECTION_FIELDS = [
  { key: "walls", label: "Walls" },
  { key: "flooring", label: "Flooring" },
  { key: "ceiling", label: "Ceiling" },
  { key: "doors_windows", label: "Doors & Windows" },
  { key: "electrical", label: "Electrical" },
  { key: "plumbing", label: "Plumbing" },
] as const;

const ROOM_DEFAULTS: Record<string, Array<{ room_type: RoomTypeOption; room_label: string }>> = {
  studio: [
    { room_label: "Living Room/Studio", room_type: "other" },
    { room_label: "Kitchen", room_type: "kitchen" },
    { room_label: "Bathroom 1", room_type: "bathroom" },
  ],
  "1BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Bedroom 1", room_type: "bedroom" },
    { room_label: "Kitchen", room_type: "kitchen" },
    { room_label: "Bathroom 1", room_type: "bathroom" },
  ],
  "2BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Bedroom 1", room_type: "bedroom" },
    { room_label: "Bedroom 2", room_type: "bedroom" },
    { room_label: "Kitchen", room_type: "kitchen" },
    { room_label: "Bathroom 1", room_type: "bathroom" },
    { room_label: "Bathroom 2", room_type: "bathroom" },
  ],
  "3BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Bedroom 1", room_type: "bedroom" },
    { room_label: "Bedroom 2", room_type: "bedroom" },
    { room_label: "Bedroom 3", room_type: "bedroom" },
    { room_label: "Kitchen", room_type: "kitchen" },
    { room_label: "Bathroom 1", room_type: "bathroom" },
    { room_label: "Bathroom 2", room_type: "bathroom" },
    { room_label: "Bathroom 3", room_type: "bathroom" },
  ],
  "4BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Bedroom 1", room_type: "bedroom" },
    { room_label: "Bedroom 2", room_type: "bedroom" },
    { room_label: "Bedroom 3", room_type: "bedroom" },
    { room_label: "Bedroom 4", room_type: "bedroom" },
    { room_label: "Kitchen", room_type: "kitchen" },
    { room_label: "Bathroom 1", room_type: "bathroom" },
    { room_label: "Bathroom 2", room_type: "bathroom" },
    { room_label: "Bathroom 3", room_type: "bathroom" },
  ],
  "5BHK_plus": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Bedroom 1", room_type: "bedroom" },
    { room_label: "Bedroom 2", room_type: "bedroom" },
    { room_label: "Bedroom 3", room_type: "bedroom" },
    { room_label: "Bedroom 4", room_type: "bedroom" },
    { room_label: "Bedroom 5", room_type: "bedroom" },
    { room_label: "Kitchen", room_type: "kitchen" },
    { room_label: "Bathroom 1", room_type: "bathroom" },
    { room_label: "Bathroom 2", room_type: "bathroom" },
    { room_label: "Bathroom 3", room_type: "bathroom" },
  ],
};

function emptyToNull(value: string | null | number | undefined) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function getOwnerName(owner: OwnerRelation) {
  if (Array.isArray(owner)) return owner[0]?.full_name ?? "—";
  return owner?.full_name ?? "—";
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function getSuggestedRoomLabel(roomType: RoomTypeOption, rooms: LocalRoom[]) {
  if (roomType === "bedroom") {
    return `Bedroom ${rooms.filter((room) => room.room_type === "bedroom").length + 1}`;
  }
  if (roomType === "bathroom") {
    return `Bathroom ${rooms.filter((room) => room.room_type === "bathroom").length + 1}`;
  }
  return ROOM_TYPE_LABELS[roomType];
}

function getConditionDotClass(condition: string | null) {
  if (!condition) return "";
  if (condition === "good") return "bg-primary";
  if (condition === "minor_wear") return "bg-accent-foreground";
  if (condition === "moderate_damage") return "bg-foreground";
  return "bg-destructive";
}

function getWorstCondition(room: LocalRoom) {
  const values = [
    room.walls_condition,
    room.flooring_condition,
    room.ceiling_condition,
    room.doors_windows_condition,
    room.electrical_condition,
    room.plumbing_condition,
  ].filter(Boolean) as string[];

  if (values.length === 0) return null;

  const rank = {
    good: 1,
    minor_wear: 2,
    moderate_damage: 3,
    severe_damage: 4,
  } as const;

  return values.reduce((worst, current) => (rank[current as keyof typeof rank] > rank[worst as keyof typeof rank] ? current : worst));
}

function buildDefaultRooms(bhk: string, inspectionId: string, balconyCount: number) {
  const baseRooms = (ROOM_DEFAULTS[bhk] ?? []).map((room, index) => ({
    inspection_id: inspectionId,
    room_type: room.room_type,
    room_label: room.room_label,
    sort_order: index,
  }));
  const count = balconyCount || 1;
  const balconyRooms = Array.from({ length: count }, (_, i) => ({
    inspection_id: inspectionId,
    room_type: 'balcony' as const,
    room_label: count > 1 ? `Balcony ${i + 1}` : 'Balcony',
    sort_order: (ROOM_DEFAULTS[bhk]?.length ?? 0) + i,
  }));
  return [...baseRooms, ...balconyRooms];
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
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomType, setNewRoomType] = useState<RoomTypeOption | "">("");
  const [newRoomLabel, setNewRoomLabel] = useState("");
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [utilitiesOverview, setUtilitiesOverview] = useState<Record<string, any>>({});
  const [structuralObs, setStructuralObs] = useState<Record<string, any>>({});

  const debounceRef = useRef<number | null>(null);
  const inspectionRef = useRef<InspectionRecord | null>(null);
  const pendingInspectionPatchRef = useRef<Record<string, unknown>>({});
  const pendingRoomPatchRef = useRef<Record<string, Record<string, unknown>>>({});
  const pendingApplianceRef = useRef<Record<string, LocalAppliance>>({});

  const ownerName = useMemo(() => getOwnerName(property?.users ?? null), [property]);

  useEffect(() => {
    inspectionRef.current = inspection;
  }, [inspection]);

  useEffect(() => {
    if (authLoading || !propertyId) return;
    void loadData();
  }, [authLoading, propertyId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
      setStructuralObs((inspectionData?.structural_observations as Record<string, any>) ?? {});

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
        roomRows.map((room) => ({
          ...room,
          is_auto_generated: generatedRoomIds.has(room.id),
          room_features: (room as any).room_features ?? null,
          furniture_items: (room as any).furniture_items ?? null,
        })),
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

      setDamages(
        rawDamages.map((item) => ({
          localId: item.localId ?? crypto.randomUUID(),
          location: item.location ?? "",
          damage_type: item.damage_type ?? "",
          severity: item.severity ?? "",
          notes: item.notes ?? "",
        })),
      );
    } catch (error: any) {
      toast({ title: "Failed to load inspection form", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const markInspectionStarted = () => {
    const currentInspection = inspectionRef.current;
    if (!currentInspection || currentInspection.status !== "scheduled") return;

    const nextInspection = { ...currentInspection, status: "in_progress" as const };
    inspectionRef.current = nextInspection;
    setInspection(nextInspection);
    pendingInspectionPatchRef.current = {
      ...pendingInspectionPatchRef.current,
      status: "in_progress",
    };
  };

  const flushPendingSaves = async () => {
    const currentInspection = inspectionRef.current;
    if (!currentInspection) {
      setSaveState("saved");
      return;
    }

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
          .eq("id", currentInspection.id) as unknown as PromiseLike<{ error?: { message?: string } | null }>,
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

      setAppliances((current) => current.map((appliance) => (
        appliancePatches[appliance.id] && appliance.appliance_type
          ? { ...appliance, is_local_only: false }
          : appliance
      )));
      setSaveState("saved");
    } catch (error: any) {
      toast({ title: "Autosave failed", description: error.message, variant: "destructive" });
      setSaveState("saved");
    }
  };

  const scheduleSave = () => {
    setSaveState("saving");
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void flushPendingSaves();
    }, 500);
  };

  const queueInspectionPatch = (patch: Record<string, unknown>) => {
    markInspectionStarted();
    pendingInspectionPatchRef.current = {
      ...pendingInspectionPatchRef.current,
      ...patch,
    };
    scheduleSave();
  };

  const queueRoomPatch = (roomId: string, patch: Record<string, unknown>) => {
    markInspectionStarted();
    pendingRoomPatchRef.current = {
      ...pendingRoomPatchRef.current,
      [roomId]: {
        ...(pendingRoomPatchRef.current[roomId] ?? {}),
        ...patch,
      },
    };
    scheduleSave();
  };

  const queueApplianceSave = (appliance: LocalAppliance) => {
    markInspectionStarted();
    pendingApplianceRef.current = {
      ...pendingApplianceRef.current,
      [appliance.id]: appliance,
    };
    scheduleSave();
  };

  const updateInspectionField = (field: keyof InspectionRecord, value: unknown) => {
    if (!inspection) return;
    const nextInspection = { ...inspection, [field]: value };
    setInspection(nextInspection);
    inspectionRef.current = nextInspection;
    queueInspectionPatch({ [field]: emptyToNull(value as string | null) });
  };

  const updateRoomField = (roomId: string, field: keyof RoomRecord, value: string) => {
    setRooms((current) => current.map((room) => (
      room.id === roomId ? { ...room, [field]: value || null } : room
    )));
    queueRoomPatch(roomId, { [field]: value || null });
  };

  const updateUtility = (key: string, value: any) => {
    markInspectionStarted();
    setUtilitiesOverview(prev => {
      const next = { ...prev, [key]: value };
      pendingInspectionPatchRef.current = { ...pendingInspectionPatchRef.current, utilities_overview: next };
      scheduleSave();
      return next;
    });
  };

  const updateStructural = (key: string, value: any) => {
    markInspectionStarted();
    setStructuralObs(prev => {
      const next = { ...prev, [key]: value };
      pendingInspectionPatchRef.current = { ...pendingInspectionPatchRef.current, structural_observations: next };
      scheduleSave();
      return next;
    });
  };

  const updateRoomFeature = (roomId: string, key: string, value: any) => {
    setRooms(current => current.map(room => {
      if (room.id !== roomId) return room;
      const next = { ...(room.room_features as Record<string, any> ?? {}), [key]: value };
      queueRoomPatch(roomId, { room_features: next });
      return { ...room, room_features: next };
    }));
  };

  const updateFurniture = (roomId: string, items: any[]) => {
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

  const handleDeleteAppliance = async (appliance: LocalAppliance) => {
    try {
      if (!appliance.is_local_only) {
        const { error } = await supabase.from("inspection_appliances").delete().eq("id", appliance.id);
        if (error) throw error;
      }
      setAppliances((current) => current.filter((item) => item.id !== appliance.id));
    } catch (error: any) {
      toast({ title: "Failed to remove appliance", description: error.message, variant: "destructive" });
    }
  };

  const updateDamageItem = (localId: string, field: keyof DamageItem, value: string) => {
    markInspectionStarted();
    setDamages((current) => {
      const next = current.map((item) => item.localId === localId ? { ...item, [field]: value } : item);
      pendingInspectionPatchRef.current = {
        ...pendingInspectionPatchRef.current,
        pre_existing_damages: next,
      };
      scheduleSave();
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
        },
      ];
      pendingInspectionPatchRef.current = {
        ...pendingInspectionPatchRef.current,
        pre_existing_damages: next,
      };
      scheduleSave();
      return next;
    });
  };

  const handleDeleteDamageItem = (localId: string) => {
    markInspectionStarted();
    setDamages((current) => {
      const next = current.filter((item) => item.localId !== localId);
      pendingInspectionPatchRef.current = {
        ...pendingInspectionPatchRef.current,
        pre_existing_damages: next,
      };
      scheduleSave();
      return next;
    });
  };

  const handleMarkCompleted = async () => {
    if (!inspection || !propertyId) return;
    setSubmittingCompletion(true);
    try {
      const [inspectionUpdate, propertyUpdate] = await Promise.all([
        supabase
          .from("property_inspections")
          .update({ status: "completed", pbr_generated_at: new Date().toISOString() })
          .eq("id", inspection.id),
        supabase
          .from("properties")
          .update({ status: "inspected" })
          .eq("id", propertyId),
      ]);

      if (inspectionUpdate.error) throw inspectionUpdate.error;
      if (propertyUpdate.error) throw propertyUpdate.error;

      toast({ title: "Inspection marked as completed" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Failed to complete inspection", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingCompletion(false);
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
      <style>{`
        .inspection-print-title { display: none; }
        @media print {
          aside,
          header,
          .inspection-print-hide,
          .inspection-action-bar {
            display: none !important;
          }

          .inspection-print-root {
            padding: 0 !important;
          }

          main {
            padding: 0 !important;
            overflow: visible !important;
          }

          .inspection-print-title {
            display: block !important;
            margin-bottom: 24px;
          }

          .inspection-room-content {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }

          .inspection-room-trigger {
            pointer-events: none !important;
          }

          .inspection-card {
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .inspection-print-section {
            break-before: page;
            page-break-before: always;
          }

          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="inspection-print-root space-y-6 pb-28">
        <div className="inspection-print-title">
          <h1 className="text-3xl font-bold">Property Baseline Report</h1>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Inspection Form</h1>
            <p className="text-sm text-muted-foreground">Complete the baseline property inspection and save as you go.</p>
          </div>
          <div className={cn(
            "shrink-0 text-sm font-medium",
            saveState === "saving" ? "text-muted-foreground" : "text-primary",
          )}>
            {saveState === "saving" ? "Saving..." : "Saved ✓"}
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

        <Card className="inspection-card">
          <CardHeader>
            <CardTitle>Property & Utilities Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* A — Main Entrance & Door */}
            <div>
              <p className="font-semibold mb-3">Main Entrance & Door</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Door Type</Label>
                  <Select value={utilitiesOverview.door_type || undefined} onValueChange={(v) => updateUtility("door_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Wood", "Steel", "Fibre", "Glass"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lock Brand</Label>
                  <Input value={utilitiesOverview.door_lock_brand ?? ""} onChange={(e) => updateUtility("door_lock_brand", e.target.value)} onBlur={(e) => updateUtility("door_lock_brand", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Deadbolt Present</Label>
                  <RadioGroup value={utilitiesOverview.door_deadbolt ?? ""} onValueChange={(v) => updateUtility("door_deadbolt", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.door_deadbolt === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Peephole Present</Label>
                  <RadioGroup value={utilitiesOverview.door_peephole ?? ""} onValueChange={(v) => updateUtility("door_peephole", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.door_peephole === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Intercom / Bell</Label>
                  <Select value={utilitiesOverview.door_intercom || undefined} onValueChange={(v) => updateUtility("door_intercom", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["None", "Bell only", "Intercom", "Video doorbell"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Door Condition</Label>
                  <Select value={utilitiesOverview.door_condition || undefined} onValueChange={(v) => updateUtility("door_condition", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ROOM_CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Door Notes</Label>
                  <Textarea rows={2} value={utilitiesOverview.door_notes ?? ""} onChange={(e) => updateUtility("door_notes", e.target.value)} onBlur={(e) => updateUtility("door_notes", e.target.value)} />
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* B — Water */}
            <div>
              <p className="font-semibold mb-3">Water</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Water Source</Label>
                  <Select value={utilitiesOverview.water_source || undefined} onValueChange={(v) => updateUtility("water_source", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Corporation", "Borewell", "Both"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supply</Label>
                  <RadioGroup value={utilitiesOverview.water_supply ?? ""} onValueChange={(v) => updateUtility("water_supply", v)} className="grid grid-cols-3 gap-3">
                    {[{ value: "24hr", label: "24hr" }, { value: "Timed", label: "Timed" }, { value: "No", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.water_supply === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                {utilitiesOverview.water_supply === "Timed" && (
                  <div className="space-y-2">
                    <Label>Timing</Label>
                    <Input value={utilitiesOverview.water_timing ?? ""} onChange={(e) => updateUtility("water_timing", e.target.value)} onBlur={(e) => updateUtility("water_timing", e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Water Meter</Label>
                  <RadioGroup value={utilitiesOverview.water_meter ?? ""} onValueChange={(v) => updateUtility("water_meter", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.water_meter === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Sump Present</Label>
                  <RadioGroup value={utilitiesOverview.water_sump ?? ""} onValueChange={(v) => updateUtility("water_sump", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.water_sump === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Overhead Tank</Label>
                  <RadioGroup value={utilitiesOverview.water_overhead_tank ?? ""} onValueChange={(v) => updateUtility("water_overhead_tank", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.water_overhead_tank === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* C — Gas & Electricity */}
            <div>
              <p className="font-semibold mb-3">Gas & Electricity</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gas Type</Label>
                  <Select value={utilitiesOverview.gas_type || undefined} onValueChange={(v) => updateUtility("gas_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Piped PNG", "Cylinder", "None"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meter / Regulator Location</Label>
                  <Input value={utilitiesOverview.gas_location ?? ""} onChange={(e) => updateUtility("gas_location", e.target.value)} onBlur={(e) => updateUtility("gas_location", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>MCB / DB Box Location</Label>
                  <Input value={utilitiesOverview.electricity_mcb_location ?? ""} onChange={(e) => updateUtility("electricity_mcb_location", e.target.value)} onBlur={(e) => updateUtility("electricity_mcb_location", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>No. of Circuits</Label>
                  <Input type="number" value={utilitiesOverview.electricity_circuits ?? ""} onChange={(e) => updateUtility("electricity_circuits", e.target.value)} onBlur={(e) => updateUtility("electricity_circuits", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Earthing Present</Label>
                  <RadioGroup value={utilitiesOverview.electricity_earthing ?? ""} onValueChange={(v) => updateUtility("electricity_earthing", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.electricity_earthing === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Inverter / UPS Provision</Label>
                  <RadioGroup value={utilitiesOverview.electricity_inverter ?? ""} onValueChange={(v) => updateUtility("electricity_inverter", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.electricity_inverter === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>DG / Generator Backup</Label>
                  <Select value={utilitiesOverview.electricity_backup || undefined} onValueChange={(v) => updateUtility("electricity_backup", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["None", "Common area only", "Full flat"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* D — Safety */}
            <div>
              <p className="font-semibold mb-3">Safety</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fire Extinguisher</Label>
                  <RadioGroup value={utilitiesOverview.safety_fire_extinguisher ?? ""} onValueChange={(v) => updateUtility("safety_fire_extinguisher", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", utilitiesOverview.safety_fire_extinguisher === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                {utilitiesOverview.safety_fire_extinguisher === "Y" && (
                  <div className="space-y-2">
                    <Label>Last Service Date</Label>
                    <Input type="date" value={utilitiesOverview.safety_fire_extinguisher_date ?? ""} onChange={(e) => updateUtility("safety_fire_extinguisher_date", e.target.value)} onBlur={(e) => updateUtility("safety_fire_extinguisher_date", e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>CCTV</Label>
                  <Select value={utilitiesOverview.safety_cctv || undefined} onValueChange={(v) => updateUtility("safety_cctv", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["None", "Building only", "Flat entrance", "Both"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Building Security</Label>
                  <Select value={utilitiesOverview.safety_security || undefined} onValueChange={(v) => updateUtility("safety_security", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["None", "Watchman only", "Intercom + watchman", "Gated with security"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* E — Structural Observations */}
            <div>
              <p className="font-semibold mb-3">Structural Observations</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Seepage / Dampness Observed</Label>
                  <RadioGroup value={structuralObs.seepage_observed ?? ""} onValueChange={(v) => updateStructural("seepage_observed", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", structuralObs.seepage_observed === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                {structuralObs.seepage_observed === "Y" && (
                  <div className="space-y-2">
                    <Label>Location / Details</Label>
                    <Input value={structuralObs.seepage_location ?? ""} onChange={(e) => updateStructural("seepage_location", e.target.value)} onBlur={(e) => updateStructural("seepage_location", e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Structural Cracks Observed</Label>
                  <RadioGroup value={structuralObs.cracks_observed ?? ""} onValueChange={(v) => updateStructural("cracks_observed", v)} className="grid grid-cols-2 gap-3">
                    {[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }].map((o) => (
                      <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium", structuralObs.cracks_observed === o.value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background")}>
                        <RadioGroupItem value={o.value} /><span>{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                {structuralObs.cracks_observed === "Y" && (
                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Input placeholder="e.g. Living room east wall, settlement crack" value={structuralObs.cracks_details ?? ""} onChange={(e) => updateStructural("cracks_details", e.target.value)} onBlur={(e) => updateStructural("cracks_details", e.target.value)} />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Sunlight Notes</Label>
                  <Input placeholder="e.g. Master bedroom gets morning sun, living room afternoon" value={structuralObs.sunlight_notes ?? ""} onChange={(e) => updateStructural("sunlight_notes", e.target.value)} onBlur={(e) => updateStructural("sunlight_notes", e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="inspection-card inspection-print-section">
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
                          className="inspection-print-hide h-8 w-8"
                          onClick={() => void handleRemoveRoom(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <AccordionContent className="inspection-room-content pb-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        {ROOM_SECTION_FIELDS.map((section) => {
                          const conditionKey = `${section.key}_condition` as keyof RoomRecord;
                          const notesKey = `${section.key}_notes` as keyof RoomRecord;

                          return (
                            <div key={section.key} className="rounded-lg border p-4 space-y-3">
                              <Label>{section.label}</Label>
                              <Select
                                value={(room[conditionKey] as string | null) ?? undefined}
                                onValueChange={(value) => updateRoomField(room.id, conditionKey, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROOM_CONDITION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Textarea
                                rows={2}
                                placeholder="Add notes..."
                                value={(room[notesKey] as string | null) ?? ""}
                                onChange={(event) => updateRoomField(room.id, notesKey, event.target.value)}
                                onBlur={(event) => updateRoomField(room.id, notesKey, event.target.value)}
                              />
                            </div>
                          );
                        })}
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

            <div className="inspection-print-hide space-y-4 border-t pt-4">
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

        <Card className="inspection-card inspection-print-section">
          <CardHeader>
            <CardTitle>Appliance Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model No.</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Ownership</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Last Service</TableHead>
                    <TableHead className="inspection-print-hide w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appliances.map((appliance) => (
                    <TableRow key={appliance.id}>
                      <TableCell className="min-w-[180px]">
                        <Select
                          value={appliance.appliance_type || undefined}
                          onValueChange={(value) => updateApplianceField(appliance.id, "appliance_type", value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLIANCE_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <Input
                          className="h-9"
                          value={appliance.custom_label ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "custom_label", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "custom_label", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Input
                          className="h-9"
                          value={appliance.brand ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "brand", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "brand", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <Input
                          className="h-9"
                          value={appliance.model_number ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "model_number", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "model_number", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Input
                          className="h-9"
                          value={appliance.color ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "color", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "color", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <Input
                          className="h-9"
                          type="number"
                          value={appliance.manufacturing_year ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "manufacturing_year", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "manufacturing_year", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[170px]">
                        <Select
                          value={appliance.condition || undefined}
                          onValueChange={(value) => updateApplianceField(appliance.id, "condition", value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLIANCE_CONDITION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <Select
                          value={appliance.ownership || undefined}
                          onValueChange={(value) => updateApplianceField(appliance.id, "ownership", value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Ownership" />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLIANCE_OWNERSHIP_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <Textarea
                          rows={2}
                          className="min-h-[72px]"
                          value={appliance.notes ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "notes", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "notes", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <Input
                          className="h-9"
                          value={appliance.serial_number ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "serial_number", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "serial_number", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <Input
                          className="h-9"
                          type="date"
                          value={appliance.last_service_date ?? ""}
                          onChange={(event) => updateApplianceField(appliance.id, "last_service_date", event.target.value)}
                          onBlur={(event) => updateApplianceField(appliance.id, "last_service_date", event.target.value)}
                        />
                      </TableCell>
                      <TableCell className="inspection-print-hide">
                        <Button type="button" variant="ghost" size="icon" onClick={() => void handleDeleteAppliance(appliance)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" className="inspection-print-hide" onClick={handleAddAppliance}>
              <Plus className="h-4 w-4" />
              Add Appliance
            </Button>
          </CardContent>
        </Card>

        <Card className="inspection-card inspection-print-section">
          <CardHeader>
            <CardTitle>Pre-Existing Damage Log</CardTitle>
            <p className="text-sm text-accent-foreground">Items documented here are NOT tenant or platform liability</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {damages.map((item) => (
              <div key={item.localId} className="relative rounded-lg border p-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="inspection-print-hide absolute right-3 top-3 h-8 w-8"
                  onClick={() => handleDeleteDamageItem(item.localId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g. Living Room ceiling"
                      value={item.location}
                      onChange={(event) => updateDamageItem(item.localId, "location", event.target.value)}
                      onBlur={(event) => updateDamageItem(item.localId, "location", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Damage Type</Label>
                    <Input
                      placeholder="e.g. Water stain, crack"
                      value={item.damage_type}
                      onChange={(event) => updateDamageItem(item.localId, "damage_type", event.target.value)}
                      onBlur={(event) => updateDamageItem(item.localId, "damage_type", event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Severity</Label>
                  <RadioGroup
                    value={item.severity}
                    onValueChange={(value) => updateDamageItem(item.localId, "severity", value)}
                    className="grid gap-3 md:grid-cols-3"
                  >
                    {[
                      { value: "low", label: "Low", className: "border-primary/20 bg-primary/10 text-primary" },
                      { value: "medium", label: "Medium", className: "border-accent-foreground/20 bg-accent text-accent-foreground" },
                      { value: "high", label: "High", className: "border-destructive/20 bg-destructive/10 text-destructive" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium",
                          item.severity === option.value ? option.className : "border-border bg-background",
                        )}
                      >
                        <RadioGroupItem value={option.value} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={2}
                    value={item.notes}
                    onChange={(event) => updateDamageItem(item.localId, "notes", event.target.value)}
                    onBlur={(event) => updateDamageItem(item.localId, "notes", event.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" className="inspection-print-hide" onClick={handleAddDamageItem}>
              <Plus className="h-4 w-4" />
              Add Damage Item
            </Button>
          </CardContent>
        </Card>

        <Card className="inspection-card inspection-print-section">
          <CardHeader>
            <CardTitle>General Observations & Inspector Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>General Observations</Label>
              <Textarea
                rows={5}
                value={inspection.general_observations ?? ""}
                onChange={(event) => updateInspectionField("general_observations", event.target.value)}
                onBlur={(event) => updateInspectionField("general_observations", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Inspector Notes</Label>
              <Textarea
                rows={5}
                value={inspection.inspector_notes ?? ""}
                onChange={(event) => updateInspectionField("inspector_notes", event.target.value)}
                onBlur={(event) => updateInspectionField("inspector_notes", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="inspection-action-bar fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-60">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={() => navigate("/admin/inspections")} className="flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to Inspections
          </button>

          <div className="flex items-center gap-3">
            {(inspection.status === "scheduled" || inspection.status === "in_progress") ? (
              <Button type="button" onClick={() => void handleMarkCompleted()} disabled={submittingCompletion}>
                {submittingCompletion ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Mark as Completed
              </Button>
            ) : null}

            {inspection.status === "completed" ? (
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Download className="h-4 w-4" />
                Download PBR
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
