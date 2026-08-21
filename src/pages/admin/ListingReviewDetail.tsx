/**
 * ListingReviewDetail — admin per-listing / per-edit review page.
 *
 * URL: /admin/listing-reviews/(new|edit)/:id
 *   new  → :id is properties.id (status must be pending_review)
 *   edit → :id is property_edit_requests.id (status must be pending)
 *
 * Actions:
 *   Approve (new)      → direct UPDATE properties.status = 'listed' (trigger sets is_active + listed_at)
 *   Request Changes    → direct UPDATE properties.status = 'changes_requested' + manual activity log insert (D-118)
 *   Approve (edit)     → RPC approve_edit_request
 *   Reject   (edit)    → RPC reject_edit_request
 *
 * Race guard: RPCs verify pending status server-side and raise if superseded/cancelled. On any error the
 * detail refetches and shows a toast so the admin sees the fresh state.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import posthog from "posthog-js";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown, MapPin } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BHK_OPTIONS } from "@/config/property-form";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import EditRequestDiff from "@/components/property-management/EditRequestDiff";
import { ReviewField, CustomBadge } from "@/components/admin/ReviewField";
import { buildGoogleMapsLink } from "@/lib/googleMapsLink";
import {
  normalizeFurnishingForDisplay,
  normalizeAmenitiesForDisplay,
} from "@/lib/reviewAmenities";
import { validateYoutubeUrl } from "@/lib/ownerTextValidation";
import { cn } from "@/lib/utils";
import { REJECTION_REASONS, formatRejectionReason } from "@/lib/rejectionReasons";
import { AdminLocationPanel } from "@/components/property-address/AdminLocationPanel";

interface PropertyRow {
  id: string; owner_id: string; status: string;
  // Address
  building_name: string | null; building_name_source: string | null; street_address: string | null;
  locality: string | null; city: string | null; state: string | null; pincode: string | null;
  // Prompt 10 (P10): new address columns
  formatted_address: string | null;
  sublocality_1: string | null;
  // Location provenance + coordinates (used for the Google Maps link + manual warning)
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  address_mode: string | null;
  // Core
  bhk: string | null; property_type: string | null;
  square_footage: number | null; furnishing: string | null;
  // Prompt 9 additions (missing from prior interface)
  floor_number: number | null;
  total_floors: number | null;
  super_built_up_area: number | null;
  building_age_years: number | null;
  bathrooms: number | null;
  balconies: number | null;
  facing: string | null;
  furnishing_detail: unknown | null;
  amenities: unknown | null;
  lister_role: string | null;
  youtube_walkthrough_url: string | null;
  // Pricing
  listed_rent: number | null; security_deposit_amount: number | null;
  available_from: string | null;
  lock_in_months: number | null;
  move_in_charges_amount: number | null;
  rent_brokerage_fixed_amount: number | null;
  maintenance_included_in_rent: boolean | null;
  // Rules/notes
  building_rules: string | null; building_notes: string | null; pet_policy: string | null;
  // Admin-only flat numbers
  flat_number: string | null;           // D-091: never public
  lister_flat_number: string | null;    // owner-submitted unit number
  // Prompt 8 (D-159) — India fields
  landmark: string | null;
  notice_period_days: number | null;
  annual_rent_increase_pct: number | null;
  water_storage: string | null;
  utility_water_included: boolean | null;
  utility_gas_included: boolean | null;
  utility_electricity_included: boolean | null;
  gas_type: string | null;
  water_source: string[] | null;
  main_door_lock_type: string | null;
  parking_2w: string | null; parking_4w: string | null;
  parking_2w_count: number | null; parking_4w_count: number | null;
  parking_notes: string | null;
  // Prompt 10 (D-161/D-162) — rent/sale
  listing_type: string | null;
  sale_price: number | null;
  price_negotiable: boolean | null;
  expected_price_per_sqft: number | null;
  possession_status: string | null;
  possession_date: string | null;
  rera_registration_number: string | null;
  khata_type: string | null;
  property_tax_paid_upto: string | null;
  sale_brokerage_pct: number | null;
  // Prompt 10: Street View + location verification
  streetview_available: boolean | null;
  streetview_pano_id: string | null;
  streetview_show_in_listing: boolean;
  location_verified_by_owner: boolean;
  location_verified_at: string | null;
  // Prompt 10: owner contact via FK join
  owner: { full_name: string; email: string | null; phone: string | null } | null;
}

interface EditRequestRow {
  id: string; property_id: string; owner_id: string; status: string;
  payload: {
    field_changes?: Record<string, unknown>;
    photo_changes?: { add?: Array<{ url: string; section?: string | null }>; delete?: string[]; update?: unknown[] };
  };
  created_at: string;
  rejection_reason?: string | null;
  rejection_reason_text?: string | null;
}

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

const bhkLabel = (v: string | null): string =>
  v ? BHK_OPTIONS.find((o) => o.value === v)?.label ?? v : "";

const formatValue = (v: unknown): string => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** Capitalise each word: "living_room" → "Living Room" */
function sectionLabel(raw: string | null): string {
  if (!raw) return "Other";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Edit-request keys that get bespoke review rendering in the Proposed-changes
// section. Everything else keeps the generic scalar EditRequestDiff.
const FREE_TEXT_EDIT_KEYS = new Set([
  "parking_notes", "pet_policy", "building_rules", "building_notes", "youtube_walkthrough_url",
]);
// Deployed Prompt-1 payload stores custom deltas under these keys (NOT `amenities`/
// `furnishing_detail`). Each is Current-live + Proposed-additions, rendered readably.
const AMENITIES_ADD_KEY = "amenities_building_add";
const FURNISHING_ADD_KEY = "furnishing_detail_add";
const STRUCTURED_ADD_KEYS = new Set([AMENITIES_ADD_KEY, FURNISHING_ADD_KEY]);
const EDIT_KEY_LABEL: Record<string, string> = {
  building_notes: "About the Property",
  [AMENITIES_ADD_KEY]: "Amenities",
  [FURNISHING_ADD_KEY]: "Furnishing",
};

/**
 * Free-text snapshot field. Never truncates; wraps long words/URLs. On new
 * listings (`highlight`) it renders with the amber review treatment; on edit
 * reviews the live snapshot stays neutral (highlighting lives in the diff).
 */
function FreeText({
  k, v, highlight, multiline = false, badge = "Free text — review",
}: {
  k: string; v: unknown; highlight: boolean; multiline?: boolean; badge?: string;
}) {
  if (v == null || v === "") return null;
  const text = String(v);
  if (highlight) {
    return <ReviewField label={k} badge={badge} multiline={multiline}>{text}</ReviewField>;
  }
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className={cn("text-sm [overflow-wrap:anywhere] break-words", multiline && "whitespace-pre-line")}>
        {text}
      </p>
    </div>
  );
}

/**
 * YouTube walkthrough — always shows the exact owner-entered string (wrapping),
 * clickable ONLY when it passes the shared validator. Invalid values are shown
 * but explicitly labelled as not safely openable and never linked.
 */
function YoutubeReviewBlock({ url, highlight }: { url: string; highlight: boolean }) {
  const valid = validateYoutubeUrl(url).ok;
  const body = valid ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary underline [overflow-wrap:anywhere] break-all"
    >
      {url}
    </a>
  ) : (
    <div className="space-y-0.5">
      <p className="text-sm [overflow-wrap:anywhere] break-all">{url}</p>
      <p className="text-xs text-destructive">Not a valid YouTube link — not safely openable.</p>
    </div>
  );
  if (highlight) {
    return <ReviewField label="Video walkthrough (YouTube)" badge="Free text — review">{body}</ReviewField>;
  }
  return (
    <div>
      <p className="text-xs text-muted-foreground">Video walkthrough (YouTube)</p>
      {body}
    </div>
  );
}

/** Readable furniture list (with Custom badges). Falls back safely on bad shapes. */
function FurnishingList({ raw }: { raw: unknown }) {
  const { items, malformed } = normalizeFurnishingForDisplay(raw);
  if (malformed) {
    return (
      <pre className="text-[11px] bg-muted rounded p-2 whitespace-pre-wrap [overflow-wrap:anywhere]">
        Could not display (unexpected format): {JSON.stringify(raw)}
      </pre>
    );
  }
  if (items.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="space-y-1">
      {items.map((f, i) => (
        <li key={i} className="flex flex-wrap items-center gap-1.5 text-sm [overflow-wrap:anywhere]">
          <span>{f.label}</span>
          {f.count != null && <span className="text-muted-foreground">×{f.count}</span>}
          {f.size && <span className="text-xs text-muted-foreground">({f.size})</span>}
          {f.rooms && <span className="text-xs text-muted-foreground">[{f.rooms}]</span>}
          {f.custom && <CustomBadge />}
        </li>
      ))}
    </ul>
  );
}

/** Readable amenities list (Building + Furnishing chips, Custom badges). */
function AmenitiesList({ raw }: { raw: unknown }) {
  const { building, furnishingItems, malformed } = normalizeAmenitiesForDisplay(raw);
  if (malformed) {
    return (
      <pre className="text-[11px] bg-muted rounded p-2 whitespace-pre-wrap [overflow-wrap:anywhere]">
        Could not display (unexpected format): {JSON.stringify(raw)}
      </pre>
    );
  }
  if (building.length === 0 && furnishingItems.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <div className="space-y-2">
      {building.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {building.map((a) => (
            <span
              key={a.value}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium [overflow-wrap:anywhere]",
                a.custom
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border/60 bg-muted/40 text-muted-foreground",
              )}
            >
              {a.label}{a.custom && <CustomBadge />}
            </span>
          ))}
        </div>
      )}
      {furnishingItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {furnishingItems.map((f) => (
            <span key={f.value} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingReviewDetail() {
  const { type, id } = useParams<{ type: "new" | "edit"; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useRequireAuth({ requireAdmin: true });

  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [editRequest, setEditRequest] = useState<EditRequestRow | null>(null);
  const [ownerName, setOwnerName] = useState<string>("Owner");
  const [priorRevisions, setPriorRevisions] = useState<EditRequestRow[]>([]);
  const [expandedRev, setExpandedRev] = useState<string | null>(null);
  const [images, setImages] = useState<Array<{ id: string; url: string; is_primary: boolean; section: string | null }>>([]);
  const [imagesError, setImagesError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [reason, setReason] = useState<typeof REJECTION_REASONS[number]["value"]>("incomplete_details");
  const [reasonText, setReasonText] = useState("");

  const load = useCallback(async () => {
    if (!id || !type) return;
    setLoading(true);
    let propertyId: string | null = null;

    if (type === "edit") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: er, error: erError } = await (supabase as any).from("property_edit_requests")
        .select("id, property_id, owner_id, status, payload, created_at, rejection_reason, rejection_reason_text")
        .eq("id", id).maybeSingle();
      // A real query/network failure must NOT masquerade as "not found" (which
      // redirects the admin away). Only a genuinely null row is "not found".
      if (erError) {
        setLoading(false);
        toast({ title: "Couldn't load edit request", description: erError.message, variant: "destructive" });
        return;
      }
      if (!er) {
        toast({ title: "Edit request not found", variant: "destructive" });
        navigate("/admin/listing-reviews?tab=edit", { replace: true });
        return;
      }
      setEditRequest(er as EditRequestRow);
      propertyId = (er as EditRequestRow).property_id;
    } else {
      propertyId = id;
    }

    if (!propertyId) return;
    // Prompt 10: owner FK join replaces the separate public_profiles query.
    // Exact syntax from Properties.tsx line 170.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prop, error: propError } = await (supabase as any).from("properties")
      .select("*, owner:users!properties_owner_id_fkey(full_name, email, phone)")
      .eq("id", propertyId).maybeSingle();
    if (propError) {
      setLoading(false);
      toast({ title: "Couldn't load property", description: propError.message, variant: "destructive" });
      return;
    }
    if (!prop) {
      toast({ title: "Property not found", variant: "destructive" });
      navigate("/admin/listing-reviews", { replace: true });
      return;
    }
    setProperty(prop as PropertyRow);
    setOwnerName((prop as PropertyRow).owner?.full_name ?? "Owner");

    // Photos — reset stale state before the query so a route change never shows
    // the previous property's photos, and a prior error never persists.
    setImagesError(false);
    setImages([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: imgs, error: imgsError } = await (supabase as any).from("property_images")
      .select("id, url, is_primary, section").eq("property_id", propertyId)
      .order("is_primary", { ascending: false });
    if (imgsError) {
      // A failed read must NOT look like a genuine empty gallery.
      setImagesError(true);
      toast({ title: "Couldn't load photos", description: imgsError.message, variant: "destructive" });
    } else {
      setImages((imgs ?? []) as Array<{ id: string; url: string; is_primary: boolean; section: string | null }>);
    }

    // Prior revisions for edit type
    if (type === "edit") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: hist } = await (supabase as any).from("property_edit_requests")
        .select("id, property_id, owner_id, status, payload, created_at, rejection_reason, rejection_reason_text")
        .eq("property_id", propertyId)
        .in("status", ["superseded", "rejected", "withdrawn", "approved"])
        .order("created_at", { ascending: false });
      setPriorRevisions((hist ?? []) as EditRequestRow[]);
    }
    setLoading(false);

    posthog?.capture("commons_admin_review_detail_viewed", { type, id });
  }, [id, type, navigate, toast]);

  useEffect(() => { void load(); }, [load]);

  // ── Actions ──
  const approveNewListing = async () => {
    if (!property || busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("properties")
      .update({ status: "listed" }).eq("id", property.id);
    setBusy(false);
    if (error) {
      const publishBlocked = /location_not_ready:publish_location_incomplete/.test(error.message ?? "");
      toast({
        title: publishBlocked ? "Location not ready to publish" : "Could not approve",
        description: publishBlocked ? "Finalize the property's location (below) before publishing." : error.message,
        variant: "destructive",
      });
      await load();
      return;
    }
    posthog?.capture("commons_admin_new_listing_approved", { property_id: property.id });
    toast({ title: "Listing approved" });
    navigate("/admin/listing-reviews?tab=new");
  };

  const requestChangesOnNewListing = async () => {
    if (!property || busy) return;
    setBusy(true);
    // Prompt 11 (D-163): single-RPC path replaces the two-step D-118 UPDATE+INSERT.
    // reject_property_listing (admin-only, applied via MCP) transitions status +
    // writes the listing_rejected activity_log entry atomically. The
    // property_activity_log_writer trigger skips its automatic log for the
    // pending_review→changes_requested transition, so no double-log.
    // Store the raw category value (consistent with reject_edit_request); the UI
    // renders it via formatRejectionReason. See src/lib/rejectionReasons.ts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("reject_property_listing", {
      p_property_id: property.id,
      p_reason: reason,
      p_reason_text: reasonText.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not request changes", description: error.message, variant: "destructive" });
      await load();
      return;
    }
    posthog?.capture("commons_admin_new_listing_changes_requested", { property_id: property.id, reason });
    toast({ title: "Changes requested" });
    setShowRequestChanges(false);
    navigate("/admin/listing-reviews?tab=new");
  };

  const approveEdit = async () => {
    if (!editRequest || busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("approve_edit_request", { p_edit_request_id: editRequest.id });
    setBusy(false);
    if (error) {
      const msg = /no longer pending/i.test(error.message)
        ? "This edit was superseded or cancelled by the owner. Refreshing…"
        : /location_not_ready:publish_location_incomplete/.test(error.message)
        ? "The property's location must be finalized before this edit can be re-published."
        : error.message;
      toast({ title: "Could not approve", description: msg, variant: "destructive" });
      await load();
      return;
    }
    const fieldCount = Object.keys(editRequest.payload.field_changes ?? {}).length;
    posthog?.capture("commons_admin_edit_approved", {
      edit_request_id: editRequest.id,
      property_id: editRequest.property_id,
      field_count: fieldCount,
    });
    toast({ title: "Edit approved" });
    navigate("/admin/listing-reviews?tab=edit");
  };

  const rejectEdit = async () => {
    if (!editRequest || busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("reject_edit_request", {
      p_edit_request_id: editRequest.id,
      p_reason: reason,
      p_reason_text: reasonText.trim() || null,
    });
    setBusy(false);
    if (error) {
      const msg = /no longer pending/i.test(error.message)
        ? "This edit was superseded or cancelled by the owner. Refreshing…"
        : error.message;
      toast({ title: "Could not reject", description: msg, variant: "destructive" });
      await load();
      return;
    }
    posthog?.capture("commons_admin_edit_rejected", {
      edit_request_id: editRequest.id,
      property_id: editRequest.property_id,
      reason,
    });
    // Rejection is authoritative. Now best-effort clean the abandoned staged R2 objects
    // (Prompt 1 deferred this to Prompt 3). Order matters: the DB blocks staged-delete
    // while the request is still `pending`, so this runs only AFTER a successful reject.
    // A cleanup failure never undoes/false-fails the rejection — surface a warning.
    const stagedUrls = Array.from(new Set(
      (editRequest.payload.photo_changes?.add ?? []).map((p) => p.url).filter(Boolean),
    ));
    if (stagedUrls.length && session?.access_token) {
      let cleanupFailed = false;
      for (const url of stagedUrls) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-property-image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ staged_url: url, property_id: editRequest.property_id }),
          });
          if (!res.ok) cleanupFailed = true;
        } catch { cleanupFailed = true; }
      }
      if (cleanupFailed) {
        toast({
          title: "Edit rejected — photo cleanup incomplete",
          description: "The edit was rejected, but some proposed photos couldn't be removed from storage. This is safe to ignore.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Edit rejected" });
      }
    } else {
      toast({ title: "Edit rejected" });
    }
    setShowReject(false);
    navigate("/admin/listing-reviews?tab=edit");
  };

  const isNewType = type === "new";

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }
  if (!property) return null;

  const fieldChanges = editRequest?.payload.field_changes ?? {};
  const changedKeys = Object.keys(fieldChanges);
  const photoAdd = editRequest?.payload.photo_changes?.add ?? [];

  // Build grouped image map — shown for BOTH new-listing and edit reviews. For
  // edit reviews this is the current live (approved) gallery; the staged add/
  // remove diff sections below render proposed changes separately and are never
  // merged into this gallery.
  const imageGroups: Map<string, typeof images> = new Map();
  images.forEach((img) => {
    const key = img.section ?? "Other";
    if (!imageGroups.has(key)) imageGroups.set(key, []);
    imageGroups.get(key)!.push(img);
  });

  // Edit-review hierarchy (Prompt 3): compact neutral context + prominent proposed changes,
  // rendered ABOVE the full comprehensive live snapshot. New-listing review is unchanged.
  const priceLabel = property.listing_type === "sale"
    ? (property.sale_price ? `₹${property.sale_price.toLocaleString("en-IN")}` : "—")
    : (property.listed_rent ? `₹${property.listed_rent.toLocaleString("en-IN")}/mo` : "—");
  const contextBits = [
    property.building_name, bhkLabel(property.bhk), property.property_type,
    property.locality, priceLabel,
    property.square_footage ? `${property.square_footage} sqft` : null,
    property.lister_role,
  ].filter(Boolean) as string[];

  const editReviewTop = !isNewType && editRequest ? (
    <>
      <section className="rounded-lg border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {contextBits.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-border">·</span>}
              <span className="[overflow-wrap:anywhere]">{b}</span>
            </span>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-amber-300 bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-amber-900">Changes requiring review</h2>
        {changedKeys.length > 0 ? (
          <div className="space-y-3">
            {changedKeys.map((k) => {
              const liveRaw = (property as unknown as Record<string, unknown>)[k];
              const label = EDIT_KEY_LABEL[k] ?? k.replace(/_/g, " ");
              if (STRUCTURED_ADD_KEYS.has(k)) {
                const isAmenity = k === AMENITIES_ADD_KEY;
                const additions = fieldChanges[k];
                const proposedRaw = isAmenity
                  ? { building: Array.isArray(additions) ? additions : [] }
                  : additions;
                return (
                  <div key={k} className="rounded-md border border-amber-300 bg-amber-50/40 p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-900">{label} — new custom items to review</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Currently live</p>
                        {isAmenity ? <AmenitiesList raw={liveRaw} /> : <FurnishingList raw={liveRaw} />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-amber-700">Proposed additions</p>
                        {isAmenity ? <AmenitiesList raw={proposedRaw} /> : <FurnishingList raw={proposedRaw} />}
                      </div>
                    </div>
                  </div>
                );
              }
              if (FREE_TEXT_EDIT_KEYS.has(k)) {
                return (
                  <ReviewField key={k} label={label} badge="Free text — review" multiline>
                    <span className="[overflow-wrap:anywhere] break-words">{formatValue(fieldChanges[k])}</span>
                    <p className="text-[11px] text-amber-800/80 mt-1 whitespace-normal [overflow-wrap:anywhere]">
                      Currently live: {formatValue(liveRaw)}
                    </p>
                  </ReviewField>
                );
              }
              return (
                <EditRequestDiff key={k} label={label} proposedValue={formatValue(fieldChanges[k])} liveValue={formatValue(liveRaw)} />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No field changes</p>
        )}
        {photoAdd.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium text-amber-900 mb-1">New photos — pending review ({photoAdd.length})</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {photoAdd.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt="" className="aspect-square object-cover rounded ring-2 ring-amber-400" />
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-amber-500 text-white text-[9px] font-semibold px-1 py-0.5 leading-none">Proposed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  ) : null;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <button
          onClick={() => navigate(`/admin/listing-reviews?tab=${isNewType ? "new" : "edit"}`)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to queue
        </button>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">
            {isNewType ? "Review new listing" : "Review edit request"}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <ProfileAvatar photoUrl={null} displayName={ownerName} size="sm" />
            <div className="text-right">
              <p className="text-xs font-medium">{ownerName}</p>
              <p className="text-[10px] text-muted-foreground">
                Submitted {formatDistanceToNow(new Date(isNewType ? (property as PropertyRow & { created_at?: string }).created_at ?? "" : editRequest?.created_at ?? ""), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Edit-review: compact context + changes-requiring-review shown ABOVE the snapshot. */}
        {editReviewTop}
        {!isNewType && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
            Current live listing details
          </p>
        )}

        {/* Property snapshot — includes India (Prompt 8) + rent/sale (Prompt 10) fields,
            admin-only flat numbers, and Prompt 10 new address/SV/verification fields. */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Property</h2>
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {property.listing_type === "sale" ? "For Sale" : "For Rent"}
            </span>
          </div>

          {/* Admin-only flat / owner unit numbers (D-091: flat_number never public).
              Amber = admin-only + owner free-text requiring review. */}
          <div className="rounded-md border border-amber-300 bg-amber-50/60 px-3 py-2 text-xs space-y-1">
            <div className="[overflow-wrap:anywhere] break-words">
              <span className="font-medium text-amber-900">Flat number (admin only):</span>{" "}
              <span className="text-amber-800">{property.flat_number ?? "—"}</span>
            </div>
            {property.lister_flat_number && (
              <div className="[overflow-wrap:anywhere] break-words">
                <span className="font-medium text-amber-900">Lister-submitted unit (review):</span>{" "}
                <span className="text-amber-800">{property.lister_flat_number}</span>
              </div>
            )}
          </div>

          {/* Location provenance — distinguish genuine manual entry from a merely
              unlinked place. Never falsely call an unlinked listing "manual". */}
          {property.address_mode === "manual" ? (
            <ReviewField badge="Location — review">
              Google couldn't identify this building — the owner entered it manually. The building name below is
              owner-entered, and the location is an approximate address/locality. Verify the building, the address
              details, and the map pin before approving.
            </ReviewField>
          ) : !property.place_id ? (
            <ReviewField badge="Location — review">
              Location requires review — this listing is not linked to a Google place. Verify the address details and
              the map pin before approving.
            </ReviewField>
          ) : null}

          {/* Admin location review + correction (Prompt 3) — trusted final engine: exact pin/building,
              Discovery geography, and finalization. Replaces the read-only CanonicalLocationPanel. */}
          <AdminLocationPanel propertyId={property.id} token={session?.access_token ?? null} onChanged={load} />

          {/* Location free-text fields — highlighted for new listings; neutral on
              edit reviews (edits cannot change location, and the diff carries any
              highlighting). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <FreeText k="Building" v={property.building_name} highlight={isNewType} />
            <FreeText k="Address" v={property.street_address} highlight={isNewType} />
            <FreeText k="Locality" v={property.locality} highlight={isNewType} />
            <FreeText k="City" v={property.city} highlight={isNewType} />
            <FreeText k="State" v={property.state} highlight={isNewType} />
            <FreeText k="Landmark" v={property.landmark} highlight={isNewType} />
          </div>

          {/* Basic info (neutral facts) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <Field k="Formatted address" v={property.formatted_address} />
            <Field k="Neighbourhood" v={property.sublocality_1} />
            <Field k="Pincode" v={property.pincode} />
            <Field k="Lister role" v={property.lister_role} />
            <Field k="BHK" v={bhkLabel(property.bhk)} />
            <Field k="Type" v={property.property_type} />
            <Field k="Furnishing" v={property.furnishing} />
            <Field k="Area (sqft)" v={property.square_footage} />
            <Field k="Super built-up area (sqft)" v={property.super_built_up_area} />
            <Field k="Floor" v={
              property.floor_number != null && property.total_floors != null
                ? `${property.floor_number} / ${property.total_floors}`
                : property.floor_number != null ? String(property.floor_number) : null
            } />
            <Field k="Building age (yrs)" v={property.building_age_years} />
            <Field k="Bathrooms" v={property.bathrooms} />
            <Field k="Balconies" v={property.balconies} />
            <Field k="Facing" v={property.facing} />
          </div>

          {/* Rent-side pricing block */}
          {property.listing_type !== "sale" && (
            <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Rent & Deposit</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <Field k="Rent" v={property.listed_rent ? `₹${property.listed_rent.toLocaleString("en-IN")}` : null} />
                <Field k="Deposit" v={property.security_deposit_amount ? `₹${property.security_deposit_amount.toLocaleString("en-IN")}` : null} />
                <Field k="Available from" v={property.available_from ? format(new Date(property.available_from), "PPP") : null} />
                <Field k="Notice period" v={property.notice_period_days != null ? property.notice_period_days + " days" : null} />
                <Field k="Lock-in (months)" v={property.lock_in_months} />
                <Field k="Annual rent increase (%)" v={property.annual_rent_increase_pct != null ? `${property.annual_rent_increase_pct}%` : null} />
                <Field k="Move-in charges" v={property.move_in_charges_amount ? `₹${property.move_in_charges_amount.toLocaleString("en-IN")}` : null} />
                <Field k="Brokerage" v={property.rent_brokerage_fixed_amount != null ? `₹${property.rent_brokerage_fixed_amount.toLocaleString("en-IN")}` : null} />
                <Field k="Maintenance included" v={property.maintenance_included_in_rent != null ? (property.maintenance_included_in_rent ? "Yes" : "No") : null} />
              </div>
            </div>
          )}

          {/* Sale-side pricing block */}
          {property.listing_type === "sale" && (
            <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Sale Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <Field k="Sale price" v={property.sale_price ? `₹${property.sale_price.toLocaleString("en-IN")}` : null} />
                <Field k="Negotiable" v={property.price_negotiable ? "Yes" : "No"} />
                <Field k="Expected ₹/sqft" v={property.expected_price_per_sqft ? `₹${property.expected_price_per_sqft.toLocaleString("en-IN")}` : null} />
                <Field k="Possession status" v={property.possession_status?.replace(/_/g, " ") ?? null} />
                {property.possession_status === "under_construction" && (
                  <Field k="Possession from" v={property.possession_date ? format(new Date(property.possession_date), "PPP") : null} />
                )}
                <Field k="RERA number" v={property.rera_registration_number} />
                <Field k="Khata type" v={property.khata_type} />
                <Field k="Tax paid up to" v={property.property_tax_paid_upto ? format(new Date(property.property_tax_paid_upto), "PPP") : null} />
                <Field k="Sale brokerage %" v={property.sale_brokerage_pct != null ? `${property.sale_brokerage_pct}%` : null} />
              </div>
            </div>
          )}

          {/* Building / parking / utilities */}
          <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Building & Society</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <Field k="2W parking" v={property.parking_2w && property.parking_2w !== "none" ? `${property.parking_2w}${property.parking_2w_count ? ` · ${property.parking_2w_count} slot${property.parking_2w_count === 1 ? "" : "s"}` : ""}` : null} />
              <Field k="4W parking" v={property.parking_4w && property.parking_4w !== "none" ? `${property.parking_4w}${property.parking_4w_count ? ` · ${property.parking_4w_count} slot${property.parking_4w_count === 1 ? "" : "s"}` : ""}` : null} />
              <Field k="Water storage" v={property.water_storage?.replace(/_/g, " ") ?? null} />
              <Field k="Water" v={property.utility_water_included != null ? (property.utility_water_included ? "Included" : "Extra") : null} />
              <Field k="Gas" v={property.utility_gas_included != null ? (property.utility_gas_included ? `Included${property.gas_type ? ` (${property.gas_type})` : ""}` : "Extra") : property.gas_type ? `Type: ${property.gas_type}` : null} />
              <Field k="Electricity" v={property.utility_electricity_included != null ? (property.utility_electricity_included ? "Included" : "Extra") : null} />
              <Field k="Water source" v={property.water_source && property.water_source.length > 0 ? property.water_source.join(", ") : null} />
              <Field k="Main door lock" v={property.main_door_lock_type} />
            </div>
            {property.parking_notes && (
              <FreeText k="Parking notes" v={property.parking_notes} highlight={isNewType} multiline />
            )}
          </div>

          {/* Furnishing detail (JSONB) — readable list with Custom badges. */}
          {property.furnishing_detail != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Furnishing detail</p>
              <FurnishingList raw={property.furnishing_detail} />
            </div>
          )}

          {/* Building / furnishing amenities (JSONB) — Custom badges on non-curated. */}
          {property.amenities != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amenities</p>
              <AmenitiesList raw={property.amenities} />
            </div>
          )}

          {/* Location & Street View */}
          <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Location & Street View</p>
            {(() => {
              const mapUrl = buildGoogleMapsLink(property);
              return mapUrl ? (
                <Button asChild variant="outline" size="sm" className="min-h-11 w-full sm:w-auto">
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> Open in Google Maps
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Location not resolved</p>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Street View</p>
                {property.streetview_available === null ? (
                  <p className="text-sm text-muted-foreground">Not checked</p>
                ) : property.streetview_available ? (
                  <p className="text-sm font-medium text-green-700">✓ Available</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
              {property.streetview_available && property.streetview_pano_id && (
                <div>
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&pano=${property.streetview_pano_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    View Street View →
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Show in listing</p>
                <p className="text-sm">{property.streetview_show_in_listing ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owner verified location</p>
                <p className="text-sm">
                  {property.location_verified_by_owner
                    ? `Yes${property.location_verified_at ? ` · ${format(new Date(property.location_verified_at), "PPP")}` : ""}`
                    : "No"}
                </p>
              </div>
            </div>
          </div>

          <FreeText k="Pet policy" v={property.pet_policy} highlight={isNewType} multiline />
          <FreeText k="House rules" v={property.building_rules} highlight={isNewType} multiline />
          <FreeText k="About the Property" v={property.building_notes} highlight={isNewType} multiline />
          {property.youtube_walkthrough_url && (
            <YoutubeReviewBlock url={property.youtube_walkthrough_url} highlight={isNewType} />
          )}
        </section>

        {/* Owner contact — from users FK join (Prompt 10) */}
        {property.owner && (property.owner.email || property.owner.phone) && (
          <section className="rounded-lg border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold">Owner contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {property.owner.email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${property.owner.email}`} className="text-sm text-primary underline truncate block">
                    {property.owner.email}
                  </a>
                </div>
              )}
              {property.owner.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a href={`tel:+${property.owner.phone}`} className="text-sm text-primary underline">
                    +91 {property.owner.phone.replace(/^(\+91|91)/, "")}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Photos read failure — distinct from a genuine empty gallery. */}
        {imagesError && (
          <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <h2 className="text-sm font-semibold text-destructive">Couldn't load photos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              The photo read failed — this is not the same as the listing having no photos. Refresh to retry.
            </p>
          </section>
        )}

        {/* Photos gallery — current live/approved photos, grouped by section with
            clickable thumbnails. Shown for both new-listing and edit reviews. */}
        {!imagesError && images.length > 0 && (
          <section className="rounded-lg border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Photos ({images.length})</h2>
            {Array.from(imageGroups.entries()).map(([section, imgs]) => (
              <div key={section}>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {sectionLabel(section === "Other" ? null : section)} ({imgs.length})
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {imgs.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block"
                    >
                      <img src={img.url} alt="" className="aspect-square object-cover rounded w-full" />
                      {img.is_primary && (
                        <span className="absolute bottom-0.5 left-0.5 rounded text-[9px] font-bold bg-primary text-primary-foreground px-1 py-0.5 leading-none">
                          Cover
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Revision history (edit type) */}
        {!isNewType && priorRevisions.length > 0 && (
          <section className="rounded-lg border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold">Previous versions ({priorRevisions.length})</h2>
            <ul className="divide-y">
              {priorRevisions.map((r) => {
                const isOpen = expandedRev === r.id;
                const fc = r.payload.field_changes ?? {};
                return (
                  <li key={r.id} className="py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedRev(isOpen ? null : r.id)}
                      className="w-full text-left flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{r.status}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(fc).length} field change{Object.keys(fc).length === 1 ? "" : "s"}
                          {formatRejectionReason(r.rejection_reason) ? ` · reason: ${formatRejectionReason(r.rejection_reason)}` : ""}
                        </p>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="mt-2 text-sm space-y-1 pl-2">
                        {Object.entries(fc).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-2 gap-2 text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="truncate">{formatValue(v)}</span>
                          </div>
                        ))}
                        {r.rejection_reason_text && (
                          <div className="mt-1 text-xs text-muted-foreground bg-muted rounded p-2 whitespace-pre-line">
                            {r.rejection_reason_text}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {isNewType ? (
            <>
              <Button onClick={approveNewListing} disabled={busy}>Approve</Button>
              <Button variant="outline" onClick={() => setShowRequestChanges(true)} disabled={busy}>
                Request changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={approveEdit} disabled={busy}>Approve edit</Button>
              <Button variant="outline" onClick={() => setShowReject(true)} disabled={busy} className="text-destructive">
                Reject edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Request Changes modal (new listing) */}
      <ReasonDialog
        open={showRequestChanges}
        onOpenChange={setShowRequestChanges}
        title="Request changes"
        description="Tell the owner what needs updating."
        confirmLabel="Send"
        onConfirm={requestChangesOnNewListing}
        reason={reason} setReason={setReason}
        reasonText={reasonText} setReasonText={setReasonText}
        busy={busy}
      />

      {/* Reject Edit modal */}
      <ReasonDialog
        open={showReject}
        onOpenChange={setShowReject}
        title="Reject edit"
        description="The owner will see this reason and the property returns to its previous live state."
        confirmLabel="Reject"
        confirmVariant="destructive"
        onConfirm={rejectEdit}
        reason={reason} setReason={setReason}
        reasonText={reasonText} setReasonText={setReasonText}
        busy={busy}
      />
    </AdminLayout>
  );
}

function Field({ k, v }: { k: string; v: unknown }) {
  const empty = v == null || v === "";
  if (empty) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="text-sm [overflow-wrap:anywhere] break-words">{String(v)}</p>
    </div>
  );
}

function ReasonDialog({
  open, onOpenChange, title, description, confirmLabel, confirmVariant = "default",
  onConfirm, reason, setReason, reasonText, setReasonText, busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => Promise<void>;
  reason: typeof REJECTION_REASONS[number]["value"];
  setReason: (v: typeof REJECTION_REASONS[number]["value"]) => void;
  reasonText: string;
  setReasonText: (v: string) => void;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger className="min-h-[40px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">
              Message to owner {reason === "other" ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={4}
              placeholder="Add specifics the owner should address…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={busy || (reason === "other" && !reasonText.trim())}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
