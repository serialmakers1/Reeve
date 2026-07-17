/**
 * OwnerPropertyManagement — full 4-tab property management page.
 *
 * Tabs: Requests | Details | Photos | Activity. Tab state persisted in ?tab=.
 * Summary card always visible. Confirmation modals for all owner state
 * transitions. Legacy PM statuses render read-only with no owner actions.
 *
 * Replaces the Prompt 6 placeholder.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import posthog from "posthog-js";
import { format } from "date-fns";
import { AlertCircle, ExternalLink, Pencil } from "lucide-react";

import Layout from "@/components/Layout";
import RejectionPanel from "@/components/property-management/RejectionPanel";
import StatusGuidance from "@/components/property-management/StatusGuidance";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getStatusDisplay } from "@/lib/propertyStatus";
import {
  BHK_OPTIONS, PROPERTY_TYPE_OPTIONS, FURNISHING_OPTIONS, BUILDING_AMENITIES,
  FURNISHING_ITEM_OPTIONS, PARKING_OPTIONS, PET_POLICY_OPTIONS,
  type FurnishingDetailItem,
} from "@/config/property-form";
import { cn } from "@/lib/utils";

import ConfirmDialog from "@/components/property-management/ConfirmDialog";
import ActivityTimeline, { type TimelineRow } from "@/components/property-management/ActivityTimeline";
import RequestsTab, { fetchPendingCount } from "@/components/owner-dashboard/RequestsTab";
import { Badge } from "@/components/ui/badge";

// Commons statuses eligible for owner actions.
const COMMONS_STATUSES = new Set([
  "draft", "pending_review", "changes_requested", "listed",
  "edit_pending_review", "unlisted", "archived",
]);

type TabValue = "requests" | "details" | "photos" | "activity";

interface PropertyRow {
  id: string; owner_id: string; status: string; is_active: boolean;
  building_name: string | null; street_address: string | null;
  locality: string | null; city: string | null; state: string | null; pincode: string | null;
  google_maps_url: string | null; youtube_walkthrough_url: string | null;
  bhk: string | null; property_type: string | null;
  floor_number: number | null; total_floors: number | null;
  square_footage: number | null; facing: string | null;
  building_age_years: number | null; bathrooms: number | null; balconies: number | null;
  listed_rent: number | null; security_deposit_amount: number | null;
  security_deposit_months: number | null;
  society_maintenance_approx: number | null; maintenance_included_in_rent: boolean | null;
  available_from: string | null;
  furnishing: string | null; furnishing_detail: FurnishingDetailItem[] | null;
  amenities: { building?: string[]; furnishing_items?: string[] } | null;
  parking_2w: string | null; parking_4w: string | null;
  utility_water_included: boolean | null; utility_gas_included: boolean | null;
  utility_electricity_included: boolean | null; gas_type: string | null;
  pet_policy: string | null; building_rules: string | null; building_notes: string | null;
  title: string | null; description: string | null;
}

interface ImageRow {
  id: string; url: string; is_primary: boolean; is_floor_plan: boolean;
  section: string | null; sort_order: number;
}

interface PendingEditRow {
  id: string;
  payload: {
    field_changes?: Record<string, unknown>;
    photo_changes?: { add?: PendingAdd[]; delete?: string[]; update?: unknown[] };
  };
}

interface PendingAdd { temp_id?: string; url: string; section?: string | null; is_floor_plan?: boolean }

const labelForValue = (opts: readonly { value: string; label: string }[], v: string | null) =>
  v ? opts.find((o) => o.value === v)?.label ?? v : "";

const formatRupees = (n: number | null): string =>
  n && n > 0 ? "₹" + n.toLocaleString("en-IN") : "—";

export default function OwnerPropertyManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useRequireAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [pendingEdit, setPendingEdit] = useState<PendingEditRow | null>(null);
  const [activity, setActivity] = useState<TimelineRow[]>([]);
  // Prompt 11: local banner/ack state removed — RejectionPanel owns fetch + ack (D-141).
  const [loading, setLoading] = useState(true);
  const [pendingReqCount, setPendingReqCount] = useState<number>(0);

  const [confirmKind, setConfirmKind] = useState<null | "withdraw" | "archive" | "unlist" | "relist" | "cancel_edit">(null);

  const load = useCallback(async () => {
    if (!id || !user?.id) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: propRow }, { data: imgRows }, { data: peRow }, { data: logRows }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("properties").select("*").eq("id", id).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("property_images")
        .select("id, url, is_primary, is_floor_plan, section, sort_order")
        .eq("property_id", id).order("section", { ascending: true, nullsFirst: true }).order("sort_order", { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("property_edit_requests")
        .select("id, payload").eq("property_id", id).eq("status", "pending").maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("property_activity_log")
        .select("id, actor_id, actor_role, action, payload, created_at").eq("property_id", id).order("created_at", { ascending: false }),
    ]);
    if (!propRow) {
      toast({ title: "Property not found", variant: "destructive" });
      navigate("/owner-dashboard", { replace: true });
      return;
    }
    if (propRow.owner_id !== user.id) {
      toast({ title: "You can only view your own properties", variant: "destructive" });
      navigate("/owner-dashboard", { replace: true });
      return;
    }
    setProperty(propRow as PropertyRow);
    setImages((imgRows ?? []) as ImageRow[]);
    setPendingEdit((peRow ?? null) as PendingEditRow | null);
    setActivity((logRows ?? []) as TimelineRow[]);
    setLoading(false);
  }, [id, user?.id, navigate, toast]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  useEffect(() => {
    if (!property) return;
    posthog?.capture("commons_property_management_viewed", {
      property_id: property.id,
      status: property.status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id, property?.status]);

  const tab: TabValue = (() => {
    const raw = searchParams.get("tab");
    if (raw === "requests" || raw === "details" || raw === "photos" || raw === "activity") return raw;
    // Default: Requests when count > 0 (Phase 1 count is always 0), otherwise Details.
    return "details";
  })();

  const changeTab = (t: TabValue) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", t);
      return next;
    }, { replace: true });
    posthog?.capture("commons_property_management_tab_changed", { tab: t });
  };

  const isCommons = !!property && COMMONS_STATUSES.has(property.status);

  // Pending request count for the Requests tab badge. Refreshed on any
  // contact_requests change for this property (realtime — same pattern as
  // RequestsTab itself).
  useEffect(() => {
    if (!property?.id) return;
    let cancelled = false;
    const refresh = async () => {
      const n = await fetchPendingCount(property.id);
      if (!cancelled) setPendingReqCount(n);
    };
    refresh();
    const channel = supabase
      .channel(`contact_requests:badge:${property.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests", filter: `property_id=eq.${property.id}` },
        refresh,
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [property?.id]);
  const isLegacyPm = !!property && !isCommons;

  // Effective view values: merge pending edit changes over property for display
  const view: PropertyRow | null = useMemo(() => {
    if (!property) return null;
    if (property.status === "edit_pending_review" && pendingEdit?.payload.field_changes) {
      return { ...property, ...(pendingEdit.payload.field_changes as Partial<PropertyRow>) };
    }
    return property;
  }, [property, pendingEdit]);

  const pendingFieldKeys = new Set(
    property?.status === "edit_pending_review" && pendingEdit?.payload.field_changes
      ? Object.keys(pendingEdit.payload.field_changes)
      : []
  );

  const primaryPhoto = images.find((i) => i.is_primary) ?? images[0];
  const pendingAdds = (pendingEdit?.payload.photo_changes?.add ?? []) as PendingAdd[];
  const pendingDeletes = new Set(pendingEdit?.payload.photo_changes?.delete ?? []);

  // Prompt 11: acknowledgeBanner removed — RejectionPanel owns the upsert with activity_log_id.

  // ── Owner state transitions ──
  const doTransition = useCallback(async (nextStatus: string, actionLabel: string) => {
    if (!property?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("properties").update({ status: nextStatus }).eq("id", property.id);
    if (error) {
      toast({ title: `Could not ${actionLabel}`, description: error.message, variant: "destructive" });
      return;
    }
    posthog?.capture("commons_property_action", {
      action: actionLabel, property_id: property.id, from_status: property.status, to_status: nextStatus,
    });
    toast({ title: `${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} complete` });
    setConfirmKind(null);
    await load();
  }, [property?.id, property?.status, toast, load]);

  const doCancelPendingEdit = useCallback(async () => {
    if (!property?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("cancel_pending_edit_request", { p_property_id: property.id });
    if (error) {
      toast({ title: "Could not cancel edit", description: error.message, variant: "destructive" });
      return;
    }
    posthog?.capture("commons_property_action", { action: "cancel_edit", property_id: property.id });
    toast({ title: "Pending edit cancelled" });
    setConfirmKind(null);
    await load();
  }, [property?.id, toast, load]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }
  if (!property || !view) return null;

  const status = getStatusDisplay(property.status);

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-6 pb-16">
        {/* Back link */}
        <button
          onClick={() => navigate("/owner-dashboard")}
          className="text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          ← Back to my listings
        </button>

        {/* Summary card */}
        <div className="rounded-xl border bg-card overflow-hidden mb-4">
          <div className="aspect-[16/9] bg-muted relative">
            {primaryPhoto ? (
              <img src={primaryPhoto.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                No photo yet
              </div>
            )}
            <span className={cn(
              "absolute top-3 right-3 rounded-full border px-2.5 py-1 text-xs font-medium bg-white/90 backdrop-blur",
              status.color,
            )}>
              {status.label}
            </span>
          </div>
          <div className="p-4 space-y-1">
            <h1 className="text-lg font-bold text-foreground">
              {[labelForValue(BHK_OPTIONS as unknown as { value:string; label:string }[], property.bhk), property.building_name].filter(Boolean).join(" · ") || "Property"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[property.locality, property.city].filter(Boolean).join(", ") || "—"}
            </p>
            <div className="flex items-baseline justify-between pt-1 gap-3">
              <p className="text-sm text-foreground">
                {formatRupees(property.listed_rent)}<span className="text-xs text-muted-foreground">/mo</span>
                <span className="text-xs text-muted-foreground ml-3">Deposit {formatRupees(property.security_deposit_amount)}</span>
              </p>
              {property.status === "listed" || property.status === "edit_pending_review" ? (
                <a
                  href={`/property/${property.id}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> View public listing
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Prompt 11 (H1/H2, D-140/D-141): rejection panel now lives inside the
            Details tab via <RejectionPanel />. That component owns its own log
            fetch + activity_log_id-scoped ack query — second rejection reappears. */}

        {/* edit_pending_review banner */}
        {property.status === "edit_pending_review" && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              Your edit is under review — usually takes 24-48 hours. Your live listing stays visible unchanged.
            </p>
          </div>
        )}

        {isLegacyPm && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm text-gray-800">
              This property is in a PM-era state. Contact your account manager for changes.
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => changeTab(v as TabValue)}>
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="requests" className="gap-2">
              Requests
              {pendingReqCount > 0 && (
                <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">{pendingReqCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Phase 3 Prompt 4 — live requests tab */}
          <TabsContent value="requests" className="space-y-4">
            <RequestsTab propertyId={property.id} propertyStatus={property.status} />
          </TabsContent>

          {/* Details */}
          <TabsContent value="details" className="space-y-6">
            {/* Prompt 11 (H3, D-138) — always-visible status explainer. */}
            <StatusGuidance status={property.status} />
            {/* Prompt 11 (H1/H2, D-140/D-141) — persistent amber rejection panel;
                ack scoped to activity_log_id so second rejection reappears. */}
            {user?.id && <RejectionPanel propertyId={property.id} userId={user.id} />}
            <DetailsSection title="Location">
              <FieldRow k="Building" v={view.building_name} pending={pendingFieldKeys.has("building_name")} live={property.building_name} />
              <FieldRow k="Address" v={view.street_address} pending={pendingFieldKeys.has("street_address")} live={property.street_address} />
              <FieldRow k="Locality" v={view.locality} pending={pendingFieldKeys.has("locality")} live={property.locality} />
              <FieldRow k="City" v={view.city} pending={pendingFieldKeys.has("city")} live={property.city} />
              <FieldRow k="State" v={view.state} />
              <FieldRow k="Pincode" v={view.pincode} pending={pendingFieldKeys.has("pincode")} live={property.pincode} />
              {view.google_maps_url && (
                <FieldRow k="Google Maps" v={<a href={view.google_maps_url} className="text-primary underline" target="_blank" rel="noopener noreferrer">Open →</a>} />
              )}
            </DetailsSection>

            <DetailsSection title="Basics">
              <FieldRow k="BHK" v={labelForValue(BHK_OPTIONS as unknown as { value:string; label:string }[], view.bhk)} pending={pendingFieldKeys.has("bhk")} live={labelForValue(BHK_OPTIONS as unknown as { value:string; label:string }[], property.bhk)} />
              <FieldRow k="Property type" v={labelForValue(PROPERTY_TYPE_OPTIONS as unknown as { value:string; label:string }[], view.property_type)} pending={pendingFieldKeys.has("property_type")} live={labelForValue(PROPERTY_TYPE_OPTIONS as unknown as { value:string; label:string }[], property.property_type)} />
              <FieldRow k="Floor" v={view.floor_number} pending={pendingFieldKeys.has("floor_number")} live={property.floor_number} />
              <FieldRow k="Total floors" v={view.total_floors} pending={pendingFieldKeys.has("total_floors")} live={property.total_floors} />
              <FieldRow k="Carpet area" v={view.square_footage ? `${view.square_footage} sqft` : null} pending={pendingFieldKeys.has("square_footage")} live={property.square_footage ? `${property.square_footage} sqft` : null} />
              <FieldRow k="Facing" v={view.facing} pending={pendingFieldKeys.has("facing")} live={property.facing} />
              <FieldRow k="Building age" v={view.building_age_years ? `${view.building_age_years} years` : null} pending={pendingFieldKeys.has("building_age_years")} live={property.building_age_years ? `${property.building_age_years} years` : null} />
              <FieldRow k="Bathrooms" v={view.bathrooms} pending={pendingFieldKeys.has("bathrooms")} live={property.bathrooms} />
              <FieldRow k="Balconies" v={view.balconies} pending={pendingFieldKeys.has("balconies")} live={property.balconies} />
            </DetailsSection>

            <DetailsSection title="Rent & Deposit">
              <FieldRow k="Rent/mo" v={formatRupees(view.listed_rent)} pending={pendingFieldKeys.has("listed_rent")} live={formatRupees(property.listed_rent)} />
              <FieldRow k="Deposit" v={formatRupees(view.security_deposit_amount)} pending={pendingFieldKeys.has("security_deposit_amount")} live={formatRupees(property.security_deposit_amount)} />
              <FieldRow k="Society maintenance" v={formatRupees(view.society_maintenance_approx)} pending={pendingFieldKeys.has("society_maintenance_approx")} live={formatRupees(property.society_maintenance_approx)} />
              <FieldRow k="Maintenance included" v={view.maintenance_included_in_rent ? "Yes" : "No"} pending={pendingFieldKeys.has("maintenance_included_in_rent")} live={property.maintenance_included_in_rent ? "Yes" : "No"} />
              <FieldRow k="Available from" v={view.available_from ? format(new Date(view.available_from), "PPP") : null} pending={pendingFieldKeys.has("available_from")} live={property.available_from ? format(new Date(property.available_from), "PPP") : null} />
            </DetailsSection>

            <DetailsSection title="Furnishing">
              <FieldRow k="Type" v={labelForValue(FURNISHING_OPTIONS as unknown as { value:string; label:string }[], view.furnishing)} pending={pendingFieldKeys.has("furnishing")} live={labelForValue(FURNISHING_OPTIONS as unknown as { value:string; label:string }[], property.furnishing)} />
              {view.furnishing_detail && view.furnishing_detail.length > 0 && (
                <div className="text-sm text-foreground pt-1">
                  <ul className="space-y-0.5">
                    {view.furnishing_detail.map((f, i) => {
                      const label = f.custom ? f.item : labelForValue(FURNISHING_ITEM_OPTIONS as unknown as { value:string; label:string }[], f.item);
                      return <li key={i} className="text-sm text-muted-foreground">· {label}{f.count && f.count > 1 ? ` × ${f.count}` : ""}{f.size ? ` (${f.size})` : ""}{f.rooms ? ` — ${f.rooms}` : ""}</li>;
                    })}
                  </ul>
                </div>
              )}
            </DetailsSection>

            <DetailsSection title="Building & Society">
              {view.amenities?.building && view.amenities.building.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {view.amenities.building.map((a) => (
                      <span key={a} className="rounded-full border bg-muted px-2 py-0.5 text-xs">
                        {labelForValue(BUILDING_AMENITIES as unknown as { value:string; label:string }[], a) || a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <FieldRow k="2W parking" v={labelForValue(PARKING_OPTIONS as unknown as { value:string; label:string }[], view.parking_2w)} pending={pendingFieldKeys.has("parking_2w")} live={labelForValue(PARKING_OPTIONS as unknown as { value:string; label:string }[], property.parking_2w)} />
              <FieldRow k="4W parking" v={labelForValue(PARKING_OPTIONS as unknown as { value:string; label:string }[], view.parking_4w)} pending={pendingFieldKeys.has("parking_4w")} live={labelForValue(PARKING_OPTIONS as unknown as { value:string; label:string }[], property.parking_4w)} />
              <FieldRow k="Water included" v={view.utility_water_included ? "Yes" : "No"} />
              <FieldRow k="Gas included" v={view.utility_gas_included ? `Yes${view.gas_type ? ` (${view.gas_type})` : ""}` : "No"} />
              <FieldRow k="Electricity included" v={view.utility_electricity_included ? "Yes" : "No"} />
            </DetailsSection>

            <DetailsSection title="Rules & Preferences">
              <FieldRow k="Pet policy" v={labelForValue(PET_POLICY_OPTIONS as unknown as { value:string; label:string }[], view.pet_policy)} pending={pendingFieldKeys.has("pet_policy")} live={labelForValue(PET_POLICY_OPTIONS as unknown as { value:string; label:string }[], property.pet_policy)} />
              {view.building_rules && (
                <div><p className="text-xs text-muted-foreground">House rules</p><p className="text-sm whitespace-pre-line">{view.building_rules}</p></div>
              )}
              {view.building_notes && (
                <div><p className="text-xs text-muted-foreground">About the building</p><p className="text-sm whitespace-pre-line">{view.building_notes}</p></div>
              )}
            </DetailsSection>

            {(view.title || view.description) && (
              <DetailsSection title="Description">
                {view.title && <p className="text-sm font-medium">{view.title}</p>}
                {view.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{view.description}</p>}
              </DetailsSection>
            )}

            {/* Actions */}
            {isCommons && (
              <ActionsBar
                status={property.status}
                onEdit={() => navigate(`/list/${property.id}`)}
                onWithdraw={() => setConfirmKind("withdraw")}
                onArchive={() => setConfirmKind("archive")}
                onUnlist={() => setConfirmKind("unlist")}
                onRelist={() => setConfirmKind("relist")}
                onCancelEdit={() => setConfirmKind("cancel_edit")}
              />
            )}
            {isLegacyPm && (
              <p className="text-sm text-muted-foreground">
                Contact your account manager for changes to this property.
              </p>
            )}
          </TabsContent>

          {/* Photos */}
          <TabsContent value="photos" className="space-y-4">
            {property.status === "edit_pending_review" && (
              <p className="text-xs text-muted-foreground">
                Photos marked "Pending review" appear on your listing only after admin approval.
              </p>
            )}
            {images.length === 0 && pendingAdds.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">No photos yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((img) => {
                  const markedDelete = pendingDeletes.has(img.id);
                  return (
                    <div key={img.id} className={cn("relative aspect-square rounded overflow-hidden bg-muted", markedDelete && "opacity-40")}>
                      <img src={img.url} alt="" className={cn("w-full h-full object-cover", markedDelete && "grayscale")} />
                      {img.is_primary && <span className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>}
                      {img.is_floor_plan && <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">Plan</span>}
                      {markedDelete && <span className="absolute bottom-1 left-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">Marked for deletion</span>}
                    </div>
                  );
                })}
                {pendingAdds.map((p, i) => (
                  <div key={p.temp_id ?? `add-${i}`} className="relative aspect-square rounded overflow-hidden bg-muted">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-blue-500 text-white text-[10px] py-0.5 text-center">Pending review</span>
                  </div>
                ))}
              </div>
            )}
            {isCommons && property.status !== "archived" && property.status !== "unlisted" && (
              <Button variant="outline" onClick={() => navigate(`/list/${property.id}`)}>
                <Pencil className="h-4 w-4 mr-1.5" /> Manage photos
              </Button>
            )}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="space-y-4">
            <ActivityTimeline rows={activity} currentUserId={user?.id ?? null} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation modals */}
      <ConfirmDialog
        open={confirmKind === "withdraw"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Withdraw your submission?" description="Your listing will go back to draft. You can edit and resubmit anytime."
        confirmLabel="Withdraw" onConfirm={() => doTransition("draft", "withdraw")}
      />
      <ConfirmDialog
        open={confirmKind === "archive"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Cancel this listing?" description="It will be archived and hidden from your dashboard. Contact support to restore it."
        confirmLabel="Yes, archive" variant="destructive" onConfirm={() => doTransition("archived", "archive")}
      />
      <ConfirmDialog
        open={confirmKind === "unlist"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Unlist this property?" description="It won't be visible to tenants until you re-list it."
        confirmLabel="Unlist" variant="destructive" onConfirm={() => doTransition("unlisted", "unlist")}
      />
      <ConfirmDialog
        open={confirmKind === "relist"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Re-list this property?" description="It will be visible to tenants immediately."
        confirmLabel="Re-list" onConfirm={() => doTransition("listed", "relist")}
      />
      <ConfirmDialog
        open={confirmKind === "cancel_edit"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Cancel your pending edit?" description="Your live listing will stay as it is now."
        confirmLabel="Yes, cancel edit" onConfirm={doCancelPendingEdit}
      />
    </Layout>
  );
}

// ─── Sub-renders ──────────────────────────────────────────────────────────────

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
      <div className="rounded-lg border bg-card p-4 space-y-2">
        {children}
      </div>
    </section>
  );
}

function FieldRow({
  k, v, pending, live,
}: {
  k: string;
  v: React.ReactNode;
  pending?: boolean;
  live?: React.ReactNode;
}) {
  const empty = v == null || v === "" || v === "—";
  if (empty && !pending) return null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <div className="text-right min-w-0">
        <span className={cn("text-foreground", pending && "text-blue-700 font-medium")}>{empty ? "—" : v}</span>
        {pending && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Currently live: {live == null || live === "" || live === "—" ? "—" : live}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionsBar({
  status, onEdit, onWithdraw, onArchive, onUnlist, onRelist, onCancelEdit,
}: {
  status: string;
  onEdit: () => void;
  onWithdraw: () => void;
  onArchive: () => void;
  onUnlist: () => void;
  onRelist: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="pt-2 flex flex-wrap gap-2">
      {(status === "draft" || status === "changes_requested") && (
        <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-1.5" /> Continue editing</Button>
      )}
      {status === "listed" && <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-1.5" /> Edit listing</Button>}
      {status === "edit_pending_review" && <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-1.5" /> Modify edit</Button>}
      {status === "pending_review" && <Button variant="outline" onClick={onWithdraw}>Withdraw submission</Button>}
      {status === "listed" && <Button variant="outline" onClick={onUnlist} className="text-destructive">Unlist</Button>}
      {status === "unlisted" && <Button onClick={onRelist}>Re-list</Button>}
      {status === "edit_pending_review" && <Button variant="outline" onClick={onCancelEdit}>Cancel pending edit</Button>}
      {(status === "draft" || status === "pending_review" || status === "changes_requested" || status === "listed" || status === "edit_pending_review" || status === "unlisted") && (
        <Button variant="ghost" onClick={onArchive} className="text-destructive">Cancel listing</Button>
      )}
    </div>
  );
}
