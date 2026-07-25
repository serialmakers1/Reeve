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
import { ChevronDown } from "lucide-react";
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

const REJECTION_REASONS = [
  { value: "incomplete_details", label: "Incomplete details" },
  { value: "photos_insufficient", label: "Photos insufficient" },
  { value: "pricing_unclear", label: "Pricing unclear" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "policy_violation", label: "Policy violation" },
  { value: "other", label: "Other" },
] as const;

interface PropertyRow {
  id: string; owner_id: string; status: string;
  // Address
  building_name: string | null; street_address: string | null;
  locality: string | null; city: string | null; state: string | null; pincode: string | null;
  // Prompt 10 (P10): new address columns
  formatted_address: string | null;
  sublocality_1: string | null;
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

export default function ListingReviewDetail() {
  const { type, id } = useParams<{ type: "new" | "edit"; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  useRequireAuth({ requireAdmin: true });

  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [editRequest, setEditRequest] = useState<EditRequestRow | null>(null);
  const [ownerName, setOwnerName] = useState<string>("Owner");
  const [priorRevisions, setPriorRevisions] = useState<EditRequestRow[]>([]);
  const [expandedRev, setExpandedRev] = useState<string | null>(null);
  const [images, setImages] = useState<Array<{ id: string; url: string; is_primary: boolean; section: string | null }>>([]);
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
      const { data: er } = await (supabase as any).from("property_edit_requests")
        .select("id, property_id, owner_id, status, payload, created_at, rejection_reason, rejection_reason_text")
        .eq("id", id).maybeSingle();
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
    const { data: prop } = await (supabase as any).from("properties")
      .select("*, owner:users!properties_owner_id_fkey(full_name, email, phone)")
      .eq("id", propertyId).maybeSingle();
    if (!prop) {
      toast({ title: "Property not found", variant: "destructive" });
      navigate("/admin/listing-reviews", { replace: true });
      return;
    }
    setProperty(prop as PropertyRow);
    setOwnerName((prop as PropertyRow).owner?.full_name ?? "Owner");

    // Photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: imgs } = await (supabase as any).from("property_images")
      .select("id, url, is_primary, section").eq("property_id", propertyId)
      .order("is_primary", { ascending: false });
    setImages((imgs ?? []) as Array<{ id: string; url: string; is_primary: boolean; section: string | null }>);

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
      toast({ title: "Could not approve", description: error.message, variant: "destructive" });
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
    const reasonLabel = REJECTION_REASONS.find((r) => r.value === reason)?.label ?? reason;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("reject_property_listing", {
      p_property_id: property.id,
      p_reason: reasonLabel,
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
    toast({ title: "Edit rejected" });
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
  const photoDelete = editRequest?.payload.photo_changes?.delete ?? [];

  // Build grouped image map for new-listing gallery
  const imageGroups: Map<string, typeof images> = new Map();
  if (isNewType) {
    images.forEach((img) => {
      const key = img.section ?? "Other";
      if (!imageGroups.has(key)) imageGroups.set(key, []);
      imageGroups.get(key)!.push(img);
    });
  }

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

        {/* Property snapshot — includes India (Prompt 8) + rent/sale (Prompt 10) fields,
            admin-only flat numbers, and Prompt 10 new address/SV/verification fields. */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Property</h2>
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {property.listing_type === "sale" ? "For Sale" : "For Rent"}
            </span>
          </div>

          {/* Admin-only flat numbers (D-091: flat_number never public) */}
          <div className="rounded border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs space-y-1">
            <div>
              <span className="font-medium text-amber-900">Flat number (admin only):</span>{" "}
              <span className="text-amber-800">{property.flat_number ?? "—"}</span>
            </div>
            {property.lister_flat_number && (
              <div>
                <span className="font-medium text-amber-900">Lister-submitted unit:</span>{" "}
                <span className="text-amber-800">{property.lister_flat_number}</span>
              </div>
            )}
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <Field k="Building" v={property.building_name} />
            <Field k="Formatted address" v={property.formatted_address} />
            <Field k="Address" v={property.street_address} />
            <Field k="Locality" v={property.locality} />
            <Field k="Neighbourhood" v={property.sublocality_1} />
            <Field k="Landmark" v={property.landmark} />
            <Field k="City" v={property.city} />
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
              <div><p className="text-xs text-muted-foreground">Parking notes</p><p className="text-sm whitespace-pre-line">{property.parking_notes}</p></div>
            )}
          </div>

          {/* Furnishing detail (JSONB — raw display for admin review) */}
          {property.furnishing_detail != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Furnishing detail</p>
              <pre className="text-xs whitespace-pre-wrap bg-muted rounded p-2 overflow-x-auto">
                {JSON.stringify(property.furnishing_detail, null, 2)}
              </pre>
            </div>
          )}

          {/* Building amenities (JSONB — raw display for admin review) */}
          {property.amenities != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Building amenities</p>
              <pre className="text-xs whitespace-pre-wrap bg-muted rounded p-2 overflow-x-auto">
                {JSON.stringify(property.amenities, null, 2)}
              </pre>
            </div>
          )}

          {/* Location & Street View */}
          <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Location & Street View</p>
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

          {property.pet_policy && <div><p className="text-xs text-muted-foreground">Pet policy</p><p className="text-sm">{property.pet_policy}</p></div>}
          {property.building_rules && <div><p className="text-xs text-muted-foreground">House rules</p><p className="text-sm whitespace-pre-line">{property.building_rules}</p></div>}
          {property.building_notes && <div><p className="text-xs text-muted-foreground">About the building</p><p className="text-sm whitespace-pre-line">{property.building_notes}</p></div>}
          {property.youtube_walkthrough_url && (
            <div>
              <p className="text-xs text-muted-foreground">Video walkthrough</p>
              <a href={property.youtube_walkthrough_url} target="_blank" rel="noopener noreferrer"
                 className="text-sm text-primary underline">
                View on YouTube →
              </a>
            </div>
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

        {/* Diff view for edit type — unchanged (D-165). */}
        {!isNewType && editRequest && (
          <section className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Proposed changes</h2>
            {changedKeys.length > 0 ? (
              <div className="space-y-3">
                {changedKeys.map((k) => (
                  <EditRequestDiff
                    key={k}
                    label={k.replace(/_/g, " ")}
                    proposedValue={formatValue(fieldChanges[k])}
                    liveValue={formatValue((property as unknown as Record<string, unknown>)[k])}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No field changes</p>
            )}
            {(photoAdd.length > 0 || photoDelete.length > 0) && (
              <div className="pt-2 border-t space-y-2">
                {photoAdd.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Photos to add ({photoAdd.length})</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {photoAdd.map((p, i) => (
                        <img key={i} src={p.url} alt="" className="aspect-square object-cover rounded" />
                      ))}
                    </div>
                  </div>
                )}
                {photoDelete.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Photos to remove ({photoDelete.length})</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {images.filter((img) => photoDelete.includes(img.id)).map((img) => (
                        <div key={img.id} className="relative">
                          <img src={img.url} alt="" className="aspect-square object-cover rounded opacity-50" />
                          <span className="absolute inset-0 flex items-center justify-center text-xs bg-red-500/30 rounded text-white font-semibold">
                            REMOVE
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Photos gallery — new-listing reviews only, grouped by section with clickable thumbnails */}
        {isNewType && images.length > 0 && (
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
                          {r.rejection_reason ? ` · reason: ${r.rejection_reason}` : ""}
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
      <p className="text-sm truncate">{String(v)}</p>
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
