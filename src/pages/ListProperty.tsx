/**
 * ListProperty — the owner-facing listing form. Route: /list (create), /list/:id (edit, Prompt 4).
 *
 * Nine vertical accordion sections; one open at a time.
 * Auto-save via useListingSave once a draft row exists.
 * Photos routed through processPhotoForUpload (HEIC + compression) → upload-property-image Edge Function.
 * Preview modal renders current form state as tenants will see it.
 * On submit: status transitions draft → pending_review via UPDATE; DB trigger enforces required fields.
 *
 * Prompt 3 covers create mode only. Edit mode (Prompt 4) will pre-fill from a propertyId param
 * and submit edits into property_edit_requests instead of directly updating properties.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import posthog from "posthog-js";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Circle, AlertCircle, X, Eye, Trash2 } from "lucide-react";
import { getStatusDisplay } from "@/lib/propertyStatus";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { useListingSave } from "@/hooks/useListingSave";
import { processPhotoForUpload } from "@/lib/photo";
import { PHOTO_CONFIG } from "@/config/photo";
import {
  BHK_OPTIONS, PROPERTY_TYPE_OPTIONS, FURNISHING_OPTIONS, FURNISHING_ITEM_OPTIONS,
  BUILDING_AMENITIES, PARKING_OPTIONS, FACING_OPTIONS, GAS_TYPE_OPTIONS,
  PET_POLICY_OPTIONS, INDIAN_STATES,
  type FurnishingDetailItem,
} from "@/config/property-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import PropertyPreview, { type PropertyPreviewData, type PreviewImage } from "@/components/listing/PropertyPreview";

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";
const DRAFT_LIMIT = 20;
const REQUIRED_SECTIONS: SectionNum[] = [1, 2, 3, 7, 9];

type SectionNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type SectionStatus = "not_started" | "in_progress" | "complete" | "error";

interface CustomItem { name: string; count?: number }

interface FormState {
  // Section 1
  building_name: string;
  street_address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  google_maps_url: string;
  // Section 2
  bhk: string;
  property_type: string;
  floor_number: string;
  total_floors: string;
  square_footage: string;
  facing: string;
  building_age_years: string;
  // Section 3
  listed_rent: string;
  security_deposit_amount: string;
  society_maintenance_approx: string;
  maintenance_included: boolean;
  available_from: Date | undefined;
  // Section 4
  furnishing: string;
  furnishing_items: string[];               // predefined items ticked
  furnishing_counts: Record<string, number>;
  furnishing_sizes: Record<string, string>;
  furnishing_rooms: Record<string, string>;
  custom_furnishing: CustomItem[];
  bathrooms: string;
  balconies: string;
  // Section 5
  building_amenities: string[];
  custom_amenities: string[];
  parking_2w: string;
  parking_4w: string;
  water_included: boolean;
  gas_included: boolean;
  gas_type: string;
  electricity_included: boolean;
  // Section 6
  pet_policy: string;
  pet_policy_text: string;
  building_rules: string;
  building_notes: string;
  // Section 7
  youtube_walkthrough_url: string;
  // Section 8
  title: string;
  description: string;
  // Section 9
  consent: boolean;
}

const INITIAL_STATE: FormState = {
  building_name: "", street_address: "", locality: "", city: "", state: "Karnataka",
  pincode: "", google_maps_url: "",
  bhk: "", property_type: "", floor_number: "", total_floors: "", square_footage: "",
  facing: "", building_age_years: "",
  listed_rent: "", security_deposit_amount: "", society_maintenance_approx: "",
  maintenance_included: false, available_from: undefined,
  furnishing: "", furnishing_items: [], furnishing_counts: {}, furnishing_sizes: {}, furnishing_rooms: {},
  custom_furnishing: [], bathrooms: "", balconies: "",
  building_amenities: [], custom_amenities: [],
  parking_2w: "none", parking_4w: "none",
  water_included: false, gas_included: false, gas_type: "", electricity_included: false,
  pet_policy: "", pet_policy_text: "", building_rules: "", building_notes: "",
  youtube_walkthrough_url: "",
  title: "", description: "",
  consent: false,
};

interface PropertyImageRow {
  id: string;
  url: string;
  is_primary: boolean;
  is_floor_plan: boolean;
  section: string | null;
  sort_order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseNum = (s: string): number | null => {
  if (s === "" || s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function buildFurnishingDetail(f: FormState): FurnishingDetailItem[] {
  const items: FurnishingDetailItem[] = [];
  for (const key of f.furnishing_items) {
    const opt = FURNISHING_ITEM_OPTIONS.find((o) => o.value === key);
    const entry: FurnishingDetailItem = { item: key };
    if (opt && !opt.yesNoOnly) {
      entry.count = f.furnishing_counts[key] ?? 1;
    }
    if (opt && "hasSize" in opt && opt.hasSize && f.furnishing_sizes[key]) {
      entry.size = f.furnishing_sizes[key];
    }
    if (opt && "hasRooms" in opt && opt.hasRooms && f.furnishing_rooms[key]) {
      entry.rooms = f.furnishing_rooms[key];
    }
    items.push(entry);
  }
  for (const c of f.custom_furnishing) {
    if (c.name.trim()) items.push({ item: c.name.trim(), count: c.count, custom: true });
  }
  return items;
}

function buildAmenitiesJson(f: FormState) {
  return {
    building: [...f.building_amenities, ...f.custom_amenities.map((s) => s.trim()).filter(Boolean)],
    furnishing_items: f.furnishing_items,
  };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

// Prefill form state from a properties row (or a properties row merged with
// pending edit values). Used by draft-resume and edit-mode initial load.
function prefillFormFromRow(d: Record<string, unknown>, setForm: React.Dispatch<React.SetStateAction<FormState>>) {
  const amenities = (d.amenities as { building?: string[]; furnishing_items?: string[] } | null) ?? {};
  const furnDetail = (d.furnishing_detail as FurnishingDetailItem[] | null) ?? [];
  const stdItems: string[] = [];
  const counts: Record<string, number> = {};
  const sizes: Record<string, string> = {};
  const rooms: Record<string, string> = {};
  const customs: CustomItem[] = [];
  for (const item of furnDetail) {
    if (item.custom) customs.push({ name: item.item, count: item.count });
    else {
      stdItems.push(item.item);
      if (item.count) counts[item.item] = item.count;
      if (item.size) sizes[item.item] = item.size;
      if (item.rooms) rooms[item.item] = item.rooms;
    }
  }
  setForm({
    building_name: (d.building_name as string) ?? "",
    street_address: (d.street_address as string) ?? "",
    locality: (d.locality as string) ?? "",
    city: (d.city as string) ?? "",
    state: (d.state as string) ?? "Karnataka",
    pincode: (d.pincode as string) ?? "",
    google_maps_url: (d.google_maps_url as string) ?? "",
    bhk: (d.bhk as string) ?? "",
    property_type: (d.property_type as string) ?? "",
    floor_number: d.floor_number != null ? String(d.floor_number) : "",
    total_floors: d.total_floors != null ? String(d.total_floors) : "",
    square_footage: d.square_footage != null ? String(d.square_footage) : "",
    facing: (d.facing as string) ?? "",
    building_age_years: d.building_age_years != null ? String(d.building_age_years) : "",
    listed_rent: d.listed_rent != null ? String(d.listed_rent) : "",
    security_deposit_amount: d.security_deposit_amount != null ? String(d.security_deposit_amount) : "",
    society_maintenance_approx: d.society_maintenance_approx != null ? String(d.society_maintenance_approx) : "",
    maintenance_included: !!d.maintenance_included_in_rent,
    available_from: d.available_from ? new Date((d.available_from as string) + "T00:00:00") : undefined,
    furnishing: (d.furnishing as string) ?? "",
    furnishing_items: stdItems, furnishing_counts: counts, furnishing_sizes: sizes, furnishing_rooms: rooms,
    custom_furnishing: customs,
    bathrooms: d.bathrooms != null ? String(d.bathrooms) : "",
    balconies: d.balconies != null ? String(d.balconies) : "",
    building_amenities: (amenities.building ?? []).filter((a) => BUILDING_AMENITIES.some((b) => b.value === a)),
    custom_amenities: (amenities.building ?? []).filter((a) => !BUILDING_AMENITIES.some((b) => b.value === a)),
    parking_2w: (d.parking_2w as string) ?? "none",
    parking_4w: (d.parking_4w as string) ?? "none",
    water_included: !!d.utility_water_included,
    gas_included: !!d.utility_gas_included,
    gas_type: (d.gas_type as string) ?? "",
    electricity_included: !!d.utility_electricity_included,
    pet_policy: (d.pet_policy as string) ?? "",
    pet_policy_text: "",
    building_rules: (d.building_rules as string) ?? "",
    building_notes: (d.building_notes as string) ?? "",
    youtube_walkthrough_url: (d.youtube_walkthrough_url as string) ?? "",
    title: (d.title as string) ?? "",
    description: (d.description as string) ?? "",
    consent: false,
  });
}

// Section-status computations
function computeSectionStatus(section: SectionNum, f: FormState, imageCount: number, errored: Set<SectionNum>): SectionStatus {
  const isErrored = errored.has(section);
  const complete = isSectionComplete(section, f, imageCount);
  if (complete) return "complete";
  if (isErrored) return "error";
  if (isSectionTouched(section, f, imageCount)) return "in_progress";
  return "not_started";
}

function isSectionComplete(section: SectionNum, f: FormState, imageCount: number): boolean {
  switch (section) {
    case 1: return !!(f.building_name.trim() && f.street_address.trim() && f.locality.trim() && f.city.trim() && f.state);
    case 2: return !!(f.bhk && f.property_type);
    case 3: return !!(parseNum(f.listed_rent) && parseNum(f.security_deposit_amount) && f.available_from);
    case 4: return !!f.furnishing;
    case 5: return true; // optional
    case 6: return true; // optional
    case 7: return imageCount >= PHOTO_CONFIG.upload.minCount;
    case 8: return true; // optional
    case 9: return f.consent;
  }
}

function isSectionTouched(section: SectionNum, f: FormState, imageCount: number): boolean {
  switch (section) {
    case 1: return !!(f.building_name || f.street_address || f.locality || f.city || f.pincode || f.google_maps_url);
    case 2: return !!(f.bhk || f.property_type || f.floor_number || f.total_floors || f.square_footage || f.facing || f.building_age_years);
    case 3: return !!(f.listed_rent || f.security_deposit_amount || f.society_maintenance_approx || f.maintenance_included || f.available_from);
    case 4: return !!(f.furnishing || f.furnishing_items.length || f.custom_furnishing.length || f.bathrooms || f.balconies);
    case 5: return !!(f.building_amenities.length || f.custom_amenities.length || f.parking_2w !== "none" || f.parking_4w !== "none" || f.water_included || f.gas_included || f.electricity_included);
    case 6: return !!(f.pet_policy || f.building_rules || f.building_notes);
    case 7: return imageCount > 0 || !!f.youtube_walkthrough_url;
    case 8: return !!(f.title || f.description);
    case 9: return f.consent;
  }
}

function sectionSummary(section: SectionNum, f: FormState, images: PropertyImageRow[]): string {
  const t = (s: string) => truncate(s, 40);
  switch (section) {
    case 1: {
      const parts = [f.locality, f.city].filter(Boolean).join(", ");
      return t(parts + (f.pincode ? ` · ${f.pincode}` : ""));
    }
    case 2: {
      const bhk = BHK_OPTIONS.find((o) => o.value === f.bhk)?.label ?? "";
      const parts = [bhk];
      if (f.square_footage) parts.push(`${f.square_footage} sqft`);
      return t(parts.filter(Boolean).join(" · "));
    }
    case 3: {
      const rent = parseNum(f.listed_rent);
      const dep = parseNum(f.security_deposit_amount);
      const parts: string[] = [];
      if (rent) parts.push(`₹${rent.toLocaleString("en-IN")}/mo`);
      if (dep) parts.push(`₹${dep.toLocaleString("en-IN")} deposit`);
      return t(parts.join(" · "));
    }
    case 4: {
      const type = FURNISHING_OPTIONS.find((o) => o.value === f.furnishing)?.label ?? "";
      const count = f.furnishing_items.length + f.custom_furnishing.filter((c) => c.name).length;
      return t([type, count ? `${count} items` : ""].filter(Boolean).join(" · "));
    }
    case 5: {
      const top = f.building_amenities.slice(0, 3).map((v) => BUILDING_AMENITIES.find((a) => a.value === v)?.label ?? v);
      return t(top.join(", "));
    }
    case 6: return "";
    case 7: return images.length ? `${images.length} photo${images.length === 1 ? "" : "s"}` : "";
    case 8: return "";
    case 9: return "";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type EntryStatus =
  | "loading" | "create" | "draft" | "changes_requested"
  | "listed" | "edit_pending_review" | "blocked";

interface PendingEditRow {
  id: string;
  payload: {
    field_changes?: Record<string, unknown>;
    photo_changes?: { add?: unknown[]; delete?: string[]; update?: unknown[] };
  };
  rejection_reason_text?: string | null;
  rejection_reason?: string | null;
}

interface EditRequestPayload {
  field_changes: Record<string, unknown>;
  photo_changes: { add: unknown[]; delete: string[]; update: unknown[] };
}

const EMPTY_EDIT_PAYLOAD: EditRequestPayload = {
  field_changes: {},
  photo_changes: { add: [], delete: [], update: [] },
};

const SESSION_STORAGE_KEY = (propertyId: string) => `edit_draft:${propertyId}`;

export default function ListProperty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useRequireAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: idParam } = useParams<{ id?: string }>();
  const isEditMode = !!idParam;

  const draftIdFromQuery = searchParams.get("draft");
  const [propertyId, setPropertyId] = useState<string | null>(idParam ?? draftIdFromQuery);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [images, setImages] = useState<PropertyImageRow[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [openAccordion, setOpenAccordion] = useState<string>("section-1");
  const [erroredSections, setErroredSections] = useState<Set<SectionNum>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showDraftLimit, setShowDraftLimit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [insertingDraft, setInsertingDraft] = useState(false);
  const draftCheckedRef = useRef(false);
  const pageOpenedRef = useRef(false);
  const sectionCompletionRef = useRef<Record<SectionNum, boolean>>({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false });

  // ── Edit-mode state ─────────────────────────────────────────────────────
  const [entryStatus, setEntryStatus] = useState<EntryStatus>(isEditMode ? "loading" : "create");
  const [pendingEdit, setPendingEdit] = useState<PendingEditRow | null>(null);
  const [editRequestPayload, setEditRequestPayload] = useState<EditRequestPayload>(EMPTY_EDIT_PAYLOAD);
  const [modifyingEdit, setModifyingEdit] = useState(false);
  const [showChangesBanner, setShowChangesBanner] = useState(false);
  const [changesRejectionText, setChangesRejectionText] = useState<string>("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<EditRequestPayload | null>(null);

  // Path A: draft/changes_requested — direct patch via useListingSave.
  // Path B: listed/edit_pending_review — accumulate in editRequestPayload; Submit via RPC.
  const path: "A" | "B" | null =
    entryStatus === "draft" || entryStatus === "changes_requested" ? "A" :
    entryStatus === "listed" || entryStatus === "edit_pending_review" ? "B" :
    entryStatus === "create" ? "A" : null;

  const readOnly = entryStatus === "edit_pending_review" && !modifyingEdit;

  const { saveState, patch, saveNow, lastError } = useListingSave(propertyId);

  // ─── Surface save failures as a toast (D-127) ────────────────────────────
  // Fires when useListingSave sets a non-null lastError. Session-expired case
  // is handled separately by the sessionExpired modal, so skip toast for that.
  const lastToastedErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastError) return;
    if (saveState === "session_expired") return;
    if (lastToastedErrorRef.current === lastError) return;
    lastToastedErrorRef.current = lastError;
    toast({
      variant: "destructive",
      title: "Save failed",
      description: lastError,
    });
  }, [lastError, saveState, toast]);

  // ─── PostHog: page opened once per mount ─────────────────────────────────
  useEffect(() => {
    if (pageOpenedRef.current) return;
    pageOpenedRef.current = true;
    posthog?.capture("commons_listing_page_opened", { mode: draftIdFromQuery ? "resume" : "new" });
  }, [draftIdFromQuery]);

  // ─── Draft-limit check on mount ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user?.id || draftCheckedRef.current || propertyId) return;
    draftCheckedRef.current = true;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "draft");
      if ((count ?? 0) >= DRAFT_LIMIT) {
        setShowDraftLimit(true);
      }
    })();
  }, [authLoading, user?.id, propertyId]);

  // ─── Load property in edit mode (URL /list/:id) ──────────────────────────
  useEffect(() => {
    if (!isEditMode || !idParam || !user?.id) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prop } = await (supabase as any)
        .from("properties")
        .select("*")
        .eq("id", idParam)
        .maybeSingle();
      if (!prop) {
        toast({ title: "Property not found", variant: "destructive" });
        navigate("/my-properties", { replace: true });
        return;
      }
      if (prop.owner_id !== user.id) {
        toast({ title: "You can only edit your own properties.", variant: "destructive" });
        navigate("/my-properties", { replace: true });
        return;
      }
      const status = prop.status as string;
      // Gate: only draft/changes_requested/listed/edit_pending_review are editable.
      if (!["draft", "changes_requested", "listed", "edit_pending_review"].includes(status)) {
        const msg: Record<string, string> = {
          pending_review: "Your listing is under review — withdraw it first to edit as draft.",
          unlisted: "Re-list this property before making changes.",
          archived: "Property archived. Contact support to restore.",
        };
        toast({ title: msg[status] ?? "This property cannot be edited right now.", variant: "destructive" });
        navigate("/my-properties", { replace: true });
        setEntryStatus("blocked");
        return;
      }
      // Load pending edit request when in edit_pending_review
      let pending: PendingEditRow | null = null;
      if (status === "edit_pending_review") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pendingRow } = await (supabase as any)
          .from("property_edit_requests")
          .select("id, payload")
          .eq("property_id", idParam)
          .eq("status", "pending")
          .maybeSingle();
        if (pendingRow) {
          pending = pendingRow as PendingEditRow;
          setPendingEdit(pending);
          // Seed editRequestPayload from pending so "Modify edit" starts from current pending values
          setEditRequestPayload({
            field_changes: (pending.payload.field_changes ?? {}) as Record<string, unknown>,
            photo_changes: {
              add: (pending.payload.photo_changes?.add ?? []) as unknown[],
              delete: (pending.payload.photo_changes?.delete ?? []) as string[],
              update: (pending.payload.photo_changes?.update ?? []) as unknown[],
            },
          });
        }
      }
      // Load latest rejected edit_request for changes_requested banner text
      if (status === "changes_requested") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rej } = await (supabase as any)
          .from("property_edit_requests")
          .select("id, rejection_reason_text, rejection_reason")
          .eq("property_id", idParam)
          .eq("status", "rejected")
          .order("reviewed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: ack } = await (supabase as any)
          .from("owner_action_acknowledgments")
          .select("id")
          .eq("user_id", user.id)
          .eq("target_type", "property")
          .eq("target_id", idParam)
          .maybeSingle();
        setChangesRejectionText(rej?.rejection_reason_text ?? rej?.rejection_reason ?? "Please address the requested changes and resubmit.");
        setShowChangesBanner(!ack);
      }

      const merged = pending ? { ...prop, ...pending.payload.field_changes } : prop;
      prefillFormFromRow(merged, setForm);
      setEntryStatus(status as EntryStatus);
      setPropertyId(idParam);
      posthog?.capture("commons_listing_edit_mode_opened", { status });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, idParam, user?.id]);

  // ─── Load draft from ?draft= query on mount (create-mode resume) ─────────
  // Fires ONCE per mount, only if the query param was present on initial load.
  // D-127 fix: previously this re-ran when createDraft set ?draft=<newId>,
  // re-fetching the just-inserted row (with only the 6 threshold fields) and
  // clobbering everything the owner had typed after crossing the threshold.
  const draftInitialResumeRef = useRef<string | null>(null);
  useEffect(() => {
    if (isEditMode || !user?.id) return;
    // Latch: capture whatever draftIdFromQuery was on the FIRST render where
    // user became available. Subsequent draftIdFromQuery changes (from
    // createDraft's setSearchParams) do not retrigger the fetch.
    if (draftInitialResumeRef.current !== null) return;
    if (!draftIdFromQuery) {
      draftInitialResumeRef.current = ""; // mark as "checked, nothing to load"
      return;
    }
    draftInitialResumeRef.current = draftIdFromQuery;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("properties")
        .select("*")
        .eq("id", draftIdFromQuery)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!data) return;
      prefillFormFromRow(data as Record<string, unknown>, setForm);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isEditMode]);

  // ─── Load images when propertyId known ───────────────────────────────────
  useEffect(() => {
    if (!propertyId) return;
    setImagesLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("property_images")
      .select("id, url, is_primary, is_floor_plan, section, sort_order")
      .eq("property_id", propertyId)
      .order("section", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: PropertyImageRow[] | null }) => {
        if (data) setImages(data);
        setImagesLoading(false);
      });
  }, [propertyId]);

  // ─── Derived: section statuses + required-complete count ─────────────────
  const sectionStatuses = useMemo(() => {
    const map = {} as Record<SectionNum, SectionStatus>;
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9] as SectionNum[]) {
      map[s] = computeSectionStatus(s, form, images.length, erroredSections);
    }
    return map;
  }, [form, images.length, erroredSections]);

  const requiredComplete = REQUIRED_SECTIONS.filter((s) => sectionStatuses[s] === "complete").length;

  // ─── Fire commons_listing_section_completed on transitions ───────────────
  useEffect(() => {
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9] as SectionNum[]) {
      const nowComplete = sectionStatuses[s] === "complete";
      const wasComplete = sectionCompletionRef.current[s];
      if (nowComplete && !wasComplete) {
        posthog?.capture("commons_listing_section_completed", { section_number: s });
      }
      sectionCompletionRef.current[s] = nowComplete;
    }
    // Also clear an errored section once it becomes complete
    if (erroredSections.size > 0) {
      let changed = false;
      const next = new Set(erroredSections);
      for (const s of erroredSections) {
        if (sectionStatuses[s] === "complete") { next.delete(s); changed = true; }
      }
      if (changed) setErroredSections(next);
    }
  }, [sectionStatuses, erroredSections]);

  // ─── Minimum required INSERT fields ──────────────────────────────────────
  const canInsertDraft = !!(
    form.building_name.trim() && form.street_address.trim() &&
    form.city.trim() && form.bhk && form.furnishing && user?.id
  );

  // ─── Field patcher ───────────────────────────────────────────────────────
  // Path A (draft/changes_requested/create): patches DB directly via useListingSave.
  // Path B (listed/edit_pending_review): accumulates into editRequestPayload.field_changes.
  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K], dbPatch?: Record<string, unknown>) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (readOnly) return; // no writes while pending edit is under review
    const rawPayload = dbPatch ?? mapFieldToDb(key, value);
    if (!rawPayload || Object.keys(rawPayload).length === 0) return;
    // Defensive normalization: DATE columns must receive YYYY-MM-DD strings,
    // not Date objects. Any caller passing a Date via dbPatch is normalized
    // here (D-127 root cause 3 belt-and-suspenders).
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawPayload)) {
      payload[k] = v instanceof Date ? format(v, "yyyy-MM-dd") : v;
    }

    if (path === "B") {
      // Owner must click "Modify edit" explicitly to enter modify mode — no auto-transition.
      // (readOnly gate above already returns before we get here in edit_pending_review view.)
      setEditRequestPayload((prev) => ({
        ...prev,
        field_changes: { ...prev.field_changes, ...payload },
      }));
    } else if (propertyId) {
      patch(payload);
    }
  }, [propertyId, patch, path, readOnly]);

  // ─── First-save (create draft) ───────────────────────────────────────────
  const createDraft = useCallback(async () => {
    if (!canInsertDraft || !user?.id || insertingDraft) return;
    setInsertingDraft(true);
    const insertPayload = {
      owner_id: user.id,
      status: "draft" as const,
      is_active: false,
      building_name: form.building_name.trim(),
      street_address: form.street_address.trim(),
      city: form.city.trim(),
      state: form.state,
      locality: form.locality.trim() || null,
      pincode: form.pincode.trim() || null,
      bhk: form.bhk,
      furnishing: form.furnishing,
      property_type: form.property_type || null,
      listed_rent: parseNum(form.listed_rent) ?? 0,
      draft_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("properties")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();
    setInsertingDraft(false);
    if (error || !data) {
      const msg = error?.message ?? "Could not save. Please try again.";
      // Draft limit error from trigger
      if (/Draft limit/.test(msg)) {
        setShowDraftLimit(true);
        return;
      }
      toast({ title: "Save failed", description: msg, variant: "destructive" });
      return;
    }
    setPropertyId(data.id);
    setSearchParams({ draft: data.id }, { replace: true });
    posthog?.capture("commons_listing_draft_created", { property_id: data.id });
    toast({ title: "Draft saved" });
  }, [canInsertDraft, form, insertingDraft, setSearchParams, toast, user?.id]);

  // Trigger createDraft when the 6 required INSERT fields fill in (auto-save on threshold).
  // Skip entirely in edit mode — we never auto-insert a new property when editing an existing one.
  useEffect(() => {
    if (isEditMode || propertyId || !canInsertDraft || insertingDraft || showDraftLimit) return;
    const t = setTimeout(() => { void createDraft(); }, 800);
    return () => clearTimeout(t);
  }, [isEditMode, canInsertDraft, propertyId, insertingDraft, showDraftLimit, createDraft]);

  // ─── Photo upload ────────────────────────────────────────────────────────
  const uploadPhoto = useCallback(async (file: File, section: string) => {
    if (!propertyId || !session?.access_token) return;
    if (images.length >= PHOTO_CONFIG.upload.maxCount) {
      toast({ title: `Maximum ${PHOTO_CONFIG.upload.maxCount} photos reached`, variant: "destructive" });
      return;
    }
    const key = `${section}-${file.name}-${Date.now()}`;
    setUploadingFiles((p) => ({ ...p, [key]: true }));

    // Process (HEIC convert + compress)
    const processed = await processPhotoForUpload(file);
    if (processed.ok === false) {
      const messages: Record<string, string> = {
        too_large: "Photo too big — max 15 MB",
        unsupported_format: "Format not supported — please use JPG, PNG, WebP or HEIC",
        heic_conversion_failed: "Couldn't convert your iPhone photo — please try a JPG",
        compression_failed: "Photo processing failed — please try another photo",
      };
      toast({ title: messages[processed.error.kind] ?? "Photo failed", variant: "destructive" });
      setUploadingFiles((p) => { const n = { ...p }; delete n[key]; return n; });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", processed.file);
      formData.append("property_id", propertyId);
      formData.append("section", section);
      formData.append("is_floor_plan", section.toLowerCase() === "floor plan" ? "true" : "false");
      // Path B + already-submitted edit_pending_review → route into pending edit's payload
      if (path === "B" && pendingEdit?.id && modifyingEdit) {
        formData.append("pending_edit_request_id", pendingEdit.id);
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-property-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        // If routed into a pending edit, the file lives only in the edit_request payload
        // until admin approves. Local UI adds it to the visible list as an optimistic
        // "pending" entry so owner can see and manage it. On the next render after
        // approval / cancellation the real image list is refetched.
        if (json.pending) {
          setEditRequestPayload((prev) => ({
            ...prev,
            photo_changes: {
              ...prev.photo_changes,
              add: [
                ...prev.photo_changes.add,
                {
                  temp_id: json.id, url: json.url, section, caption: null,
                  is_primary: false, is_floor_plan: section.toLowerCase() === "floor plan", sort_order: 0,
                },
              ],
            },
          }));
        } else if (path === "B" && !pendingEdit) {
          // Uploading photos before first Submit while editing a `listed` property:
          // Edge Function did a direct INSERT (no pending_edit_request_id available yet),
          // but semantically these should go into photo_changes.add on Submit.
          // We fold them into local state so on Submit they're serialized into payload.
          setEditRequestPayload((prev) => ({
            ...prev,
            photo_changes: {
              ...prev.photo_changes,
              add: [
                ...prev.photo_changes.add,
                {
                  temp_id: json.id, url: json.url, section, caption: null,
                  is_primary: false, is_floor_plan: section.toLowerCase() === "floor plan", sort_order: 0,
                },
              ],
            },
          }));
          setImages((prev) => [...prev, {
            id: json.id, url: json.url, is_primary: false,
            is_floor_plan: section.toLowerCase() === "floor plan",
            section, sort_order: 0,
          }]);
        } else {
          setImages((prev) => [...prev, {
            id: json.id, url: json.url, is_primary: false,
            is_floor_plan: section.toLowerCase() === "floor plan",
            section, sort_order: 0,
          }]);
        }
      } else {
        toast({ title: json.error || "Upload failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error uploading photo", variant: "destructive" });
    } finally {
      setUploadingFiles((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  }, [propertyId, session?.access_token, images.length, toast, path, pendingEdit, modifyingEdit]);

  const deletePhoto = useCallback(async (imageId: string) => {
    if (!propertyId || !session?.access_token) return;
    // Path B: don't actually delete — mark in photo_changes.delete for admin to apply on approval.
    // Exception: photos added in this edit (add[] entries with matching temp_id) can be dropped locally.
    if (path === "B") {
      // Local-add cancel: drop from add[] if present.
      const isLocalAdd = editRequestPayload.photo_changes.add.some((a) => (a as { temp_id: string }).temp_id === imageId);
      if (isLocalAdd) {
        setEditRequestPayload((prev) => ({
          ...prev,
          photo_changes: {
            ...prev.photo_changes,
            add: prev.photo_changes.add.filter((a) => (a as { temp_id: string }).temp_id !== imageId),
          },
        }));
        setImages((prev) => prev.filter((i) => i.id !== imageId));
      } else {
        // Real existing image: queue for deletion on approval.
        setEditRequestPayload((prev) => ({
          ...prev,
          photo_changes: { ...prev.photo_changes, delete: [...prev.photo_changes.delete, imageId] },
        }));
        setImages((prev) => prev.filter((i) => i.id !== imageId));
      }
      return;
    }
    // Path A: direct delete.
    const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-property-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId, property_id: propertyId }),
    });
    const json = await res.json();
    if (json.success) {
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } else {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }, [propertyId, session?.access_token, toast, path, editRequestPayload.photo_changes.add]);

  const setPrimaryPhoto = useCallback(async (imageId: string) => {
    if (!propertyId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("property_images").update({ is_primary: false }).eq("property_id", propertyId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("property_images").update({ is_primary: true }).eq("id", imageId);
    setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.id === imageId })));
  }, [propertyId]);

  // ─── Submit for review ───────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!propertyId || submitting) return;
    // Flush any pending edits first
    await saveNow();

    // Client-side gate: all required sections complete
    const missing = REQUIRED_SECTIONS.filter((s) => sectionStatuses[s] !== "complete");
    if (missing.length > 0) {
      setErroredSections(new Set(missing));
      const first = missing[0];
      setOpenAccordion(`section-${first}`);
      const sectionNames: Record<SectionNum, string> = {
        1: "Where is your property?", 2: "The basics", 3: "Rent & Deposit",
        4: "What's inside", 5: "Building", 6: "Rules", 7: "Photos",
        8: "Description", 9: "Final checks",
      };
      toast({ title: `Complete "${sectionNames[first]}" before submitting`, variant: "destructive" });
      // Scroll into view
      setTimeout(() => {
        document.getElementById(`section-${first}-header`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    setSubmitting(true);

    // Path B (listed / edit_pending_review): submit via RPC as an edit request.
    if (path === "B") {
      // Guard: block submission if the payload has no changes at all (D-122).
      const hasFieldChanges = Object.keys(editRequestPayload.field_changes).length > 0;
      const hasPhotoChanges =
        editRequestPayload.photo_changes.add.length > 0
        || editRequestPayload.photo_changes.delete.length > 0
        || editRequestPayload.photo_changes.update.length > 0;
      if (!hasFieldChanges && !hasPhotoChanges) {
        setSubmitting(false);
        toast({
          title: "No changes to submit",
          description: "Make changes before submitting for review.",
          variant: "destructive",
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newEditId, error: rpcError } = await (supabase as any).rpc(
        "submit_property_edit_request",
        {
          p_property_id: propertyId,
          p_field_changes: editRequestPayload.field_changes,
          p_photo_changes: editRequestPayload.photo_changes,
        },
      );
      setSubmitting(false);
      if (rpcError) {
        toast({ title: "Could not submit edit", description: rpcError.message, variant: "destructive" });
        return;
      }
      posthog?.capture("commons_edit_submitted", {
        property_id: propertyId,
        edit_request_id: newEditId as string,
        changed_field_count: Object.keys(editRequestPayload.field_changes).length,
        photo_change_count:
          editRequestPayload.photo_changes.add.length +
          editRequestPayload.photo_changes.delete.length +
          editRequestPayload.photo_changes.update.length,
      });
      try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
      toast({ title: "Edit submitted for review", description: "We'll review your changes within 48 hours." });
      navigate("/my-properties", { replace: true });
      return;
    }

    // Path A: transition draft/changes_requested → pending_review.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("properties")
      .update({ status: "pending_review" })
      .eq("id", propertyId);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    posthog?.capture("commons_listing_submitted", {
      property_id: propertyId,
      photo_count: images.length,
      has_optional_sections_filled: !!(form.description || form.building_notes || form.building_rules),
    });
    toast({ title: "Submitted for review!", description: "We'll review your listing within 48 hours." });
    navigate("/my-properties", { replace: true });
  }, [propertyId, submitting, saveNow, sectionStatuses, images.length, form, navigate, toast, path, editRequestPayload]);

  // ─── Preview data ────────────────────────────────────────────────────────
  const previewData = useMemo<PropertyPreviewData>(() => ({
    building_name: form.building_name, locality: form.locality, city: form.city,
    state: form.state, pincode: form.pincode,
    bhk: form.bhk, property_type: form.property_type, square_footage: form.square_footage,
    furnishing: form.furnishing, bathrooms: form.bathrooms, balconies: form.balconies,
    facing: form.facing,
    listed_rent: form.listed_rent, security_deposit_amount: form.security_deposit_amount,
    society_maintenance_approx: form.society_maintenance_approx,
    maintenance_included: form.maintenance_included,
    available_from: form.available_from ? format(form.available_from, "PP") : "",
    furnishing_detail: buildFurnishingDetail(form),
    building_amenities: form.building_amenities, custom_amenities: form.custom_amenities,
    parking_2w: PARKING_OPTIONS.find((o) => o.value === form.parking_2w)?.label ?? form.parking_2w,
    parking_4w: PARKING_OPTIONS.find((o) => o.value === form.parking_4w)?.label ?? form.parking_4w,
    water_included: form.water_included, gas_included: form.gas_included, gas_type: form.gas_type,
    electricity_included: form.electricity_included,
    pet_policy: PET_POLICY_OPTIONS.find((o) => o.value === form.pet_policy)?.label ?? form.pet_policy_text,
    house_rules: form.building_rules, building_notes: form.building_notes,
    title: form.title, description: form.description,
    // Preview should reflect what the property will look like AFTER admin approval
    // in Path B: hide photos marked for deletion, include pending adds.
    // In Path A: images is already the live state.
    images: (path === "B"
      ? [
          ...images.filter((i) => !editRequestPayload.photo_changes.delete.includes(i.id)),
          ...editRequestPayload.photo_changes.add.map((a) => {
            const add = a as { temp_id?: string; url: string; section?: string | null; is_primary?: boolean };
            return {
              id: add.temp_id ?? `temp-${Math.random()}`,
              url: add.url,
              is_primary: !!add.is_primary,
              section: add.section ?? null,
            };
          }),
        ]
      : images) as unknown as PreviewImage[],
    youtube_walkthrough_url: form.youtube_walkthrough_url,
    google_maps_url: form.google_maps_url,
  }), [form, images]);

  // ─── Session storage restore prompt (Prompt 9) ───────────────────────────
  // When landing on /list/:id for a Path B property with a recently-saved payload
  // in sessionStorage, prompt owner to Restore or Start Fresh. Only fires ONCE per
  // mount and only if the current in-memory payload is empty (to avoid clobbering
  // pending-edit values already merged in).
  useEffect(() => {
    if (!propertyId || path !== "B") return;
    if (pendingRestore) return;
    const currentSize = Object.keys(editRequestPayload.field_changes).length +
      editRequestPayload.photo_changes.add.length +
      editRequestPayload.photo_changes.delete.length +
      editRequestPayload.photo_changes.update.length;
    if (currentSize > 0) return; // already have local changes (from pending edit merge) — don't prompt
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY(propertyId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as EditRequestPayload & { timestamp?: number };
      const age = Date.now() - (parsed.timestamp ?? 0);
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      if (age > WEEK) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId));
        return;
      }
      const saved: EditRequestPayload = {
        field_changes: parsed.field_changes ?? {},
        photo_changes: {
          add: parsed.photo_changes?.add ?? [],
          delete: parsed.photo_changes?.delete ?? [],
          update: parsed.photo_changes?.update ?? [],
        },
      };
      const savedSize = Object.keys(saved.field_changes).length +
        saved.photo_changes.add.length + saved.photo_changes.delete.length + saved.photo_changes.update.length;
      if (savedSize > 0) setPendingRestore(saved);
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, path]);

  const restoreSaved = useCallback(() => {
    if (!pendingRestore) return;
    setEditRequestPayload(pendingRestore);
    // Merge field_changes into form so read fields reflect saved values
    setForm((prev) => ({ ...prev, ...(pendingRestore.field_changes as Partial<FormState>) }));
    setModifyingEdit(true);
    setPendingRestore(null);
    posthog?.capture("commons_edit_session_restored", { property_id: propertyId });
  }, [pendingRestore, propertyId]);

  const discardSaved = useCallback(() => {
    if (!propertyId) return;
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
    setPendingRestore(null);
    posthog?.capture("commons_edit_session_discarded", { property_id: propertyId });
  }, [propertyId]);

  // ─── Session storage for Path B in-progress edits ────────────────────────
  // Silent save on every editRequestPayload change; silent restore on mount.
  // Cleared on submit or cancel.
  useEffect(() => {
    if (!propertyId || path !== "B") return;
    const size = Object.keys(editRequestPayload.field_changes).length +
      editRequestPayload.photo_changes.add.length +
      editRequestPayload.photo_changes.delete.length +
      editRequestPayload.photo_changes.update.length;
    if (size === 0) return;
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY(propertyId),
        JSON.stringify({ ...editRequestPayload, timestamp: Date.now() }),
      );
    } catch { /* quota exceeded or private mode — ignore */ }
  }, [propertyId, path, editRequestPayload]);

  // ─── Cancel pending edit (edit_pending_review → listed) ──────────────────
  const cancelPendingEdit = useCallback(async () => {
    if (!propertyId || !pendingEdit || cancelling) return;
    setCancelling(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("cancel_pending_edit_request", { p_property_id: propertyId });
    setCancelling(false);
    if (error) {
      toast({ title: "Could not cancel edit", description: error.message, variant: "destructive" });
      return;
    }
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
    posthog?.capture("commons_edit_cancelled", { property_id: propertyId, edit_request_id: pendingEdit.id });
    toast({ title: "Pending edit cancelled" });
    navigate("/my-properties", { replace: true });
  }, [propertyId, pendingEdit, cancelling, toast, navigate]);

  // ─── Acknowledge changes_requested banner ────────────────────────────────
  const acknowledgeBanner = useCallback(async () => {
    if (!propertyId || !user?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("owner_action_acknowledgments")
      .insert({ user_id: user.id, target_type: "property", target_id: propertyId });
    setShowChangesBanner(false);
    posthog?.capture("commons_banner_acknowledged", { property_id: propertyId, target_type: "property" });
  }, [propertyId, user?.id]);

  // ─── Session-expired modal state derived from useListingSave ─────────────
  const sessionExpired = saveState === "session_expired";

  // ─── Render ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-8 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-6 pb-32">
        {/* Edit-mode status header */}
        {isEditMode && entryStatus !== "loading" && entryStatus !== "blocked" && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button onClick={() => navigate(`/property/${propertyId}`)} className="text-xs text-muted-foreground hover:text-foreground">
                ← Back to property
              </button>
              <h1 className="text-xl font-bold text-foreground mt-1 truncate">{form.building_name || "Edit listing"}</h1>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", getStatusDisplay(entryStatus).color)}>
              {getStatusDisplay(entryStatus).label}
            </span>
          </div>
        )}

        {/* Changes-requested banner */}
        {showChangesBanner && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Admin requested changes</p>
                <p className="text-sm text-amber-700 mt-1 whitespace-pre-line">{changesRejectionText}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={acknowledgeBanner} className="shrink-0 h-8 text-xs">
                OK, got it
              </Button>
            </div>
          </div>
        )}

        {/* edit_pending_review banner */}
        {entryStatus === "edit_pending_review" && !modifyingEdit && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              Your edit is under review — usually takes 24-48 hours. Your live listing stays visible unchanged.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setModifyingEdit(true)}>Modify edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(true)} className="text-destructive">
                Cancel pending edit
              </Button>
            </div>
          </div>
        )}

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? "Edit your listing" : "List your property"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {path === "B"
              ? "Your changes will be reviewed before going live."
              : "Fill the sections below. We'll auto-save your draft as you go."}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{requiredComplete} of 5 required sections complete</span>
            <SaveStateIndicator state={saveState} />
          </div>
        </header>

        <Accordion type="single" collapsible value={openAccordion} onValueChange={setOpenAccordion} className={cn("w-full", readOnly && "opacity-70 pointer-events-none select-none")}>
          {/* Section 1 */}
          <SectionShell num={1} title="Where is your property?" status={sectionStatuses[1]} summary={sectionSummary(1, form, images)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Building name *"><Input value={form.building_name} onChange={(e) => updateField("building_name", e.target.value)} placeholder="e.g. Prestige Lakeside" className="min-h-[44px]" /></FormField>
              <FormField label="Full address *"><Input value={form.street_address} onChange={(e) => updateField("street_address", e.target.value)} placeholder="Street, block, unit" className="min-h-[44px]" /></FormField>
              <FormField label="Locality *"><Input value={form.locality} onChange={(e) => updateField("locality", e.target.value)} placeholder="e.g. Koramangala" className="min-h-[44px]" /></FormField>
              <FormField label="City *"><Input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="e.g. Bangalore" className="min-h-[44px]" /></FormField>
              <FormField label="State *">
                <Select value={form.state} onValueChange={(v) => updateField("state", v)}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Country"><Input value="India" disabled className="min-h-[44px]" /></FormField>
              <FormField label="Pincode"><Input value={form.pincode} onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="560095" className="min-h-[44px]" /></FormField>
              <FormField label="Google Maps link" hint="Paste a Maps link so tenants know exactly where it is">
                <Input value={form.google_maps_url} onChange={(e) => updateField("google_maps_url", e.target.value)} placeholder="https://maps.google.com/..." className="min-h-[44px]" />
              </FormField>
            </div>
          </SectionShell>

          {/* Section 2 */}
          <SectionShell num={2} title="The basics" status={sectionStatuses[2]} summary={sectionSummary(2, form, images)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="BHK *">
                <Select value={form.bhk} onValueChange={(v) => updateField("bhk", v)}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{BHK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Property type *">
                <Select value={form.property_type} onValueChange={(v) => updateField("property_type", v)}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PROPERTY_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Floor number"><Input type="number" value={form.floor_number} onChange={(e) => updateField("floor_number", e.target.value)} className="min-h-[44px]" /></FormField>
              <FormField label="Total floors"><Input type="number" value={form.total_floors} onChange={(e) => updateField("total_floors", e.target.value)} className="min-h-[44px]" /></FormField>
              <FormField label="Carpet area (sqft)"><Input type="number" value={form.square_footage} onChange={(e) => updateField("square_footage", e.target.value)} className="min-h-[44px]" /></FormField>
              <FormField label="Facing" hint="Helps tenants who care about sunlight">
                <Select value={form.facing} onValueChange={(v) => updateField("facing", v)}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{FACING_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Building age (years)"><Input type="number" value={form.building_age_years} onChange={(e) => updateField("building_age_years", e.target.value)} className="min-h-[44px]" /></FormField>
            </div>
          </SectionShell>

          {/* Section 3 */}
          <SectionShell num={3} title="Rent & Deposit" status={sectionStatuses[3]} summary={sectionSummary(3, form, images)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Monthly rent (₹) *"><Input type="number" value={form.listed_rent} onChange={(e) => updateField("listed_rent", e.target.value)} placeholder="35000" className="min-h-[44px]" /></FormField>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Security deposit (₹) *</Label>
                <Input type="number" value={form.security_deposit_amount} onChange={(e) => updateField("security_deposit_amount", e.target.value)} placeholder="70000" className="min-h-[44px]" />
                {parseNum(form.listed_rent) ? (
                  <div className="flex gap-1.5 pt-1">
                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button"
                        onClick={() => updateField("security_deposit_amount", String((parseNum(form.listed_rent) ?? 0) * n))}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-accent text-muted-foreground">
                        {n} month{n > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <FormField label="Society maintenance (₹)"><Input type="number" value={form.society_maintenance_approx} onChange={(e) => updateField("society_maintenance_approx", e.target.value)} className="min-h-[44px]" /></FormField>
              <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <div><Label className="text-sm font-medium">Maintenance included in rent</Label>
                  <p className="text-xs text-muted-foreground">Tenants see "Included" instead of a separate amount</p></div>
                <Switch checked={form.maintenance_included} onCheckedChange={(v) => updateField("maintenance_included", v, { maintenance_included_in_rent: v })} />
              </div>
              <FormField label="Available from *">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full min-h-[44px] justify-start", !form.available_from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.available_from ? format(form.available_from, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.available_from} onSelect={(d) => updateField("available_from", d, { available_from: d ? format(d, "yyyy-MM-dd") : null })} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </FormField>
            </div>
          </SectionShell>

          {/* Section 4 */}
          <SectionShell num={4} title="What's inside the home?" status={sectionStatuses[4]} summary={sectionSummary(4, form, images)}>
            <div className="space-y-4">
              <FormField label="Furnishing *">
                <Select value={form.furnishing} onValueChange={(v) => updateField("furnishing", v)}>
                  <SelectTrigger className="min-h-[44px] max-w-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{FURNISHING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <div>
                <Label className="text-sm font-medium">What's already there?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {FURNISHING_ITEM_OPTIONS.map((opt) => {
                    const checked = form.furnishing_items.includes(opt.value);
                    return (
                      <label key={opt.value} className={cn("flex items-center gap-2 rounded border p-2", checked && "border-primary bg-accent/30")}>
                        <Checkbox checked={checked}
                          onCheckedChange={() => {
                            const next = checked ? form.furnishing_items.filter((v) => v !== opt.value) : [...form.furnishing_items, opt.value];
                            setForm((f) => ({ ...f, furnishing_items: next }));
                            if (propertyId) patch({ furnishing_detail: buildFurnishingDetail({ ...form, furnishing_items: next }), amenities: buildAmenitiesJson({ ...form, furnishing_items: next }) });
                          }} />
                        <span className="text-sm flex-1">{opt.label}</span>
                        {checked && !opt.yesNoOnly && (
                          <Input type="number" min={1} max={20} value={form.furnishing_counts[opt.value] ?? 1}
                            onChange={(e) => {
                              const counts = { ...form.furnishing_counts, [opt.value]: Number(e.target.value) || 1 };
                              setForm((f) => ({ ...f, furnishing_counts: counts }));
                              if (propertyId) patch({ furnishing_detail: buildFurnishingDetail({ ...form, furnishing_counts: counts }) });
                            }}
                            className="w-14 h-8 text-sm" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Something else? Add it</Label>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, custom_furnishing: [...f.custom_furnishing, { name: "" }] }))} className="text-sm text-primary hover:underline">+ Add item</button>
                </div>
                {form.custom_furnishing.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <Input value={c.name} placeholder="e.g. Study table"
                      onChange={(e) => {
                        const list = [...form.custom_furnishing]; list[i] = { ...list[i], name: e.target.value };
                        setForm((f) => ({ ...f, custom_furnishing: list }));
                        if (propertyId) patch({ furnishing_detail: buildFurnishingDetail({ ...form, custom_furnishing: list }) });
                      }}
                      className="min-h-[40px] flex-1" />
                    <Input type="number" min={1} value={c.count ?? 1} placeholder="Qty"
                      onChange={(e) => {
                        const list = [...form.custom_furnishing]; list[i] = { ...list[i], count: Number(e.target.value) || 1 };
                        setForm((f) => ({ ...f, custom_furnishing: list }));
                        if (propertyId) patch({ furnishing_detail: buildFurnishingDetail({ ...form, custom_furnishing: list }) });
                      }}
                      className="w-20 h-10" />
                    <button type="button" onClick={() => {
                      const list = form.custom_furnishing.filter((_, j) => j !== i);
                      setForm((f) => ({ ...f, custom_furnishing: list }));
                      if (propertyId) patch({ furnishing_detail: buildFurnishingDetail({ ...form, custom_furnishing: list }) });
                    }}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Bathrooms"><Input type="number" min={1} max={10} value={form.bathrooms} onChange={(e) => updateField("bathrooms", e.target.value)} className="min-h-[44px]" /></FormField>
                <FormField label="Balconies"><Input type="number" min={0} max={10} value={form.balconies} onChange={(e) => updateField("balconies", e.target.value)} className="min-h-[44px]" /></FormField>
              </div>
            </div>
          </SectionShell>

          {/* Section 5 */}
          <SectionShell num={5} title="Building & Society" status={sectionStatuses[5]} summary={sectionSummary(5, form, images)}>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Building amenities</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {BUILDING_AMENITIES.map((a) => {
                    const checked = form.building_amenities.includes(a.value);
                    return (
                      <label key={a.value} className="flex items-center gap-2 min-h-[36px] cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => {
                          const next = checked ? form.building_amenities.filter((v) => v !== a.value) : [...form.building_amenities, a.value];
                          setForm((f) => ({ ...f, building_amenities: next }));
                          if (propertyId) patch({ amenities: buildAmenitiesJson({ ...form, building_amenities: next }) });
                        }} />
                        <span className="text-sm">{a.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Something else? Add it</Label>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, custom_amenities: [...f.custom_amenities, ""] }))} className="text-sm text-primary hover:underline">+ Add amenity</button>
                </div>
                {form.custom_amenities.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <Input value={v} placeholder="e.g. Rooftop terrace"
                      onChange={(e) => {
                        const list = [...form.custom_amenities]; list[i] = e.target.value;
                        setForm((f) => ({ ...f, custom_amenities: list }));
                        if (propertyId) patch({ amenities: buildAmenitiesJson({ ...form, custom_amenities: list }) });
                      }} className="min-h-[40px] flex-1" />
                    <button type="button" onClick={() => {
                      const list = form.custom_amenities.filter((_, j) => j !== i);
                      setForm((f) => ({ ...f, custom_amenities: list }));
                      if (propertyId) patch({ amenities: buildAmenitiesJson({ ...form, custom_amenities: list }) });
                    }}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="2-wheeler parking">
                  <Select value={form.parking_2w} onValueChange={(v) => updateField("parking_2w", v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="4-wheeler parking">
                  <Select value={form.parking_4w} onValueChange={(v) => updateField("parking_4w", v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <UtilityToggle label="Water included" checked={form.water_included} onChange={(v) => updateField("water_included", v, { utility_water_included: v })} />
                <UtilityToggle label="Gas included" checked={form.gas_included} onChange={(v) => updateField("gas_included", v, { utility_gas_included: v })} />
                <UtilityToggle label="Electricity included" checked={form.electricity_included} onChange={(v) => updateField("electricity_included", v, { utility_electricity_included: v })} />
              </div>
              {form.gas_included && (
                <FormField label="Gas type">
                  <Select value={form.gas_type} onValueChange={(v) => updateField("gas_type", v)}>
                    <SelectTrigger className="min-h-[44px] max-w-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{GAS_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
              )}
            </div>
          </SectionShell>

          {/* Section 6 */}
          <SectionShell num={6} title="Rules & preferences" status={sectionStatuses[6]} summary={sectionSummary(6, form, images)}>
            <div className="space-y-4">
              <FormField label="Pet policy">
                <Select value={form.pet_policy} onValueChange={(v) => updateField("pet_policy", v)}>
                  <SelectTrigger className="min-h-[44px] max-w-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PET_POLICY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="House rules" hint="Vegetarian only? No smoking? Curfew? Anything tenants should know.">
                <Textarea value={form.building_rules} onChange={(e) => updateField("building_rules", e.target.value)} rows={3} />
              </FormField>
              <FormField label="About the building / neighborhood" hint="Gated society? Near a Metro? 5-min walk to market? Sell your building.">
                <Textarea value={form.building_notes} onChange={(e) => updateField("building_notes", e.target.value)} rows={3} />
              </FormField>
            </div>
          </SectionShell>

          {/* Section 7: Photos */}
          <SectionShell num={7} title="Photos" status={sectionStatuses[7]} summary={sectionSummary(7, form, images)}>
            {!propertyId ? (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                Complete the sections above first — we'll save a draft, then you can upload photos.
              </p>
            ) : (
              <div className="space-y-4">
                <div className={cn("text-xs font-medium", images.length < PHOTO_CONFIG.upload.minCount ? "text-destructive" : "text-muted-foreground")}>
                  {images.length} of {PHOTO_CONFIG.upload.maxCount} photos {images.length < PHOTO_CONFIG.upload.minCount && `(minimum ${PHOTO_CONFIG.upload.minCount} required)`}
                </div>
                <p className="text-xs text-muted-foreground">Landscape photos work best. Take from far enough that the whole room is visible.</p>
                <p className="text-xs text-muted-foreground">Accepted: JPG, PNG, WebP, HEIC. Max 15 MB per photo.</p>
                {[...PHOTO_CONFIG.sections.suggestions].map((section) => {
                  const sectionImgs = images.filter((i) => i.section === section);
                  return (
                    <div key={section} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
                        <span className="text-sm font-medium">{section} {sectionImgs.length > 0 && `· ${sectionImgs.length}`}</span>
                        <label className="text-xs text-primary hover:underline cursor-pointer">
                          + Upload
                          <input type="file" accept={PHOTO_CONFIG.upload.acceptAttribute} multiple className="hidden"
                            onChange={async (e) => {
                              if (!e.target.files) return;
                              const files = Array.from(e.target.files);
                              e.target.value = "";
                              for (const f of files) { await uploadPhoto(f, section); }
                            }} />
                        </label>
                      </div>
                      <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {sectionImgs.map((img) => (
                          <div key={img.id} className="relative group aspect-square rounded overflow-hidden bg-muted">
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                            {img.is_primary && <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">Cover</span>}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                              <button type="button" onClick={() => setPrimaryPhoto(img.id)} className="text-xs bg-white text-gray-800 px-2 py-1 rounded">★ Cover</button>
                              <button type="button" onClick={() => deletePhoto(img.id)} className="text-xs bg-white text-red-600 px-2 py-1 rounded">Delete</button>
                            </div>
                          </div>
                        ))}
                        {Object.keys(uploadingFiles).filter((k) => k.startsWith(section)).map((k) => (
                          <div key={k} className="aspect-square rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">Uploading…</div>
                        ))}
                        {sectionImgs.length === 0 && Object.keys(uploadingFiles).filter((k) => k.startsWith(section)).length === 0 && (
                          <div className="col-span-full py-4 text-center text-xs text-muted-foreground">No photos yet.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <FormField label="YouTube walkthrough URL" hint="Paste a YouTube link for a full walkthrough tour">
                  <Input value={form.youtube_walkthrough_url} onChange={(e) => updateField("youtube_walkthrough_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="min-h-[44px]" />
                </FormField>
              </div>
            )}
            {imagesLoading && <p className="text-xs text-muted-foreground">Loading photos...</p>}
          </SectionShell>

          {/* Section 8 */}
          <SectionShell num={8} title="Description" status={sectionStatuses[8]} summary={sectionSummary(8, form, images)}>
            <div className="space-y-4">
              <FormField label="Title" hint="Auto-generated if blank">
                <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder={`${BHK_OPTIONS.find((o) => o.value === form.bhk)?.label ?? ""} in ${form.locality || "..."}`.trim()} className="min-h-[44px]" />
              </FormField>
              <FormField label="Description" hint="What makes this property special? Nearby landmarks? Metro? Schools? Best time to see it?">
                <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={5} />
              </FormField>
            </div>
          </SectionShell>

          {/* Section 9 */}
          <SectionShell num={9} title="Final checks" status={sectionStatuses[9]} summary={sectionSummary(9, form, images)}>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={form.consent} onCheckedChange={(v) => setForm((f) => ({ ...f, consent: !!v }))} className="mt-1" />
                <span className="text-sm">
                  I confirm I am the legal owner or authorized representative of this property, and I have permission to list it.
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setShowPreview(true); posthog?.capture("commons_listing_preview_opened"); }}>
                  <Eye className="h-4 w-4 mr-1.5" /> Preview as tenant
                </Button>
              </div>
            </div>
          </SectionShell>
        </Accordion>

        {/* Sticky footer submit bar */}
        <div className="fixed bottom-0 md:bottom-0 left-0 right-0 z-30 bg-background border-t px-4 py-3 md:pl-64">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs">
              <SaveStateIndicator state={saveState} />
              <p className="text-muted-foreground mt-0.5">{requiredComplete}/5 required</p>
            </div>
            <div className="flex gap-2">
              {propertyId && path === "A" && (
                <Button variant="outline" onClick={() => saveNow()}>Save</Button>
              )}
              {!readOnly && (
                <Button
                  onClick={submit}
                  disabled={submitting || !propertyId || (path === "B" && Object.keys(editRequestPayload.field_changes).length === 0 && editRequestPayload.photo_changes.add.length === 0 && editRequestPayload.photo_changes.delete.length === 0 && editRequestPayload.photo_changes.update.length === 0)}
                  className={cn(path === "A" && (requiredComplete < 5 || !form.consent || images.length < 3) ? "opacity-70" : "")}
                >
                  {submitting ? "Submitting..." : path === "B" ? "Submit for review" : "Submit for review"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      <PropertyPreview open={showPreview} onOpenChange={setShowPreview} data={previewData} />

      {/* Draft-limit modal */}
      <Dialog open={showDraftLimit} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Draft limit reached</DialogTitle>
            <DialogDescription>
              You have reached the {DRAFT_LIMIT}-draft limit. Complete or discard some drafts before starting a new listing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => navigate("/my-properties")}>Go to my properties</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session storage restore prompt */}
      <Dialog open={!!pendingRestore} onOpenChange={(v) => !v && discardSaved()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore your unsaved changes?</DialogTitle>
            <DialogDescription>
              You had unsaved edits for this property from your last session. Restore them or start fresh?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={discardSaved}>Start fresh</Button>
            <Button onClick={restoreSaved}>Restore changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel pending edit confirmation */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel your pending edit?</DialogTitle>
            <DialogDescription>
              Your live listing will stay as it is now. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
              Keep pending
            </Button>
            <Button variant="destructive" onClick={cancelPendingEdit} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session-expired modal */}
      <Dialog open={sessionExpired} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Session expired</DialogTitle>
            <DialogDescription>
              Please log in again. Your work below will be preserved when you return.
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-muted p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap">
{JSON.stringify(form, null, 2)}
          </pre>
          <DialogFooter>
            <Button onClick={() => navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
              Log in again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// ─── Sub-renders ──────────────────────────────────────────────────────────────

function SectionShell({
  num, title, status, summary, children,
}: {
  num: SectionNum; title: string; status: SectionStatus; summary: string; children: React.ReactNode;
}) {
  return (
    <AccordionItem value={`section-${num}`} id={`section-${num}-header`}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between flex-1 gap-3 pr-2">
          <div className="flex items-center gap-3 min-w-0">
            <StatusIcon status={status} />
            <span className="text-sm font-medium text-left">{title}</span>
          </div>
          {summary && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{summary}</span>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2">{children}</AccordionContent>
    </AccordionItem>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />;
  if (status === "error") return <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />;
  if (status === "in_progress") return <div className="h-5 w-5 rounded-full bg-amber-400 shrink-0" />;
  return <Circle className="h-5 w-5 text-muted-foreground shrink-0" />;
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function UtilityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SaveStateIndicator({ state }: { state: string }) {
  if (state === "saving") return <span className="text-xs text-muted-foreground">Saving...</span>;
  if (state === "saved") return <span className="text-xs text-green-600">Saved</span>;
  if (state === "failed") return <span className="text-xs text-red-500">Save failed — retrying</span>;
  return null;
}

// ─── Field → DB column map ───────────────────────────────────────────────────
function mapFieldToDb<K extends keyof FormState>(key: K, value: FormState[K]): Record<string, unknown> | null {
  const strVal = value as unknown as string;
  switch (key) {
    case "building_name": return { building_name: strVal.trim() || null };
    case "street_address": return { street_address: strVal.trim() || null };
    case "locality": return { locality: strVal.trim() || null };
    case "city": return { city: strVal.trim() || null };
    case "state": return { state: strVal };
    case "pincode": return { pincode: strVal.trim() || null };
    case "google_maps_url": return { google_maps_url: strVal.trim() || null };
    case "bhk": return { bhk: strVal };
    case "property_type": return { property_type: strVal || null };
    case "floor_number": return { floor_number: parseNum(strVal) };
    case "total_floors": return { total_floors: parseNum(strVal) };
    case "square_footage": return { square_footage: parseNum(strVal) };
    case "facing": return { facing: strVal || null };
    case "building_age_years": return { building_age_years: parseNum(strVal) };
    case "listed_rent": return { listed_rent: parseNum(strVal) ?? 0 };
    case "security_deposit_amount": return { security_deposit_amount: parseNum(strVal) };
    case "society_maintenance_approx": return { society_maintenance_approx: parseNum(strVal) };
    case "furnishing": return { furnishing: strVal };
    case "bathrooms": return { bathrooms: parseNum(strVal) };
    case "balconies": return { balconies: parseNum(strVal) };
    case "parking_2w": return { parking_2w: strVal };
    case "parking_4w": return { parking_4w: strVal };
    case "gas_type": return { gas_type: strVal || null };
    case "pet_policy": return { pet_policy: strVal || null };
    case "building_rules": return { building_rules: strVal || null };
    case "building_notes": return { building_notes: strVal || null };
    case "youtube_walkthrough_url": return { youtube_walkthrough_url: strVal.trim() || null };
    case "title": return { title: strVal.trim() || null };
    case "description": return { description: strVal || null };
    // Local-only: consent, pet_policy_text, and JSONB-composed fields patched separately
    case "consent": case "pet_policy_text": return null;
    // Values handled through explicit dbPatch in updateField call
    default: return null;
  }
}
