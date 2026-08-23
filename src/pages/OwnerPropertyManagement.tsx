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
import { format, parseISO, isValid } from "date-fns";
import { AlertCircle, ExternalLink, Pencil } from "lucide-react";

import Layout from "@/components/Layout";
import RejectionPanel from "@/components/property-management/RejectionPanel";
import StatusGuidance from "@/components/property-management/StatusGuidance";
import StatusActionGlossary from "@/components/property-management/StatusActionGlossary";
import { getOwnerActions } from "@/lib/ownerStatusGlossary";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getStatusDisplay } from "@/lib/propertyStatus";
import { formatSalePrice } from "@/utils/property/formatSalePrice";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
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
  youtube_walkthrough_url: string | null;
  bhk: string | null; property_type: string | null;
  floor_number: number | null; total_floors: number | null;
  square_footage: number | null; facing: string | null;
  building_age_years: number | null; bathrooms: number | null; balconies: number | null;
  listed_rent: number | null; security_deposit_amount: number | null;
  society_maintenance_approx: number | null; maintenance_included_in_rent: boolean | null;
  available_from: string | null;
  furnishing: string | null; furnishing_detail: FurnishingDetailItem[] | null;
  amenities: { building?: string[]; furnishing_items?: string[] } | null;
  parking_2w: string | null; parking_4w: string | null;
  utility_water_included: boolean | null; utility_gas_included: boolean | null;
  utility_electricity_included: boolean | null; gas_type: string | null;
  pet_policy: string | null; building_rules: string | null; building_notes: string | null;
  description: string | null;
  // Phase 1 additions
  formatted_address: string | null;
  sublocality_1: string | null;
  landmark: string | null;
  lister_flat_number: string | null;
  lister_role: string | null;
  super_built_up_area: number | null;
  lock_in_months: number | null;
  notice_period_days: number | null;
  annual_rent_increase_pct: number | null;
  move_in_charges_amount: number | null;
  rent_brokerage_fixed_amount: number | null;
  water_storage: string | null;
  water_source: string[] | null;
  main_door_lock_type: string | null;
  parking_2w_count: number | null;
  parking_4w_count: number | null;
  parking_notes: string | null;
  listing_type: string | null;
  sale_price: number | null;
  sale_brokerage_pct: number | null;
  price_negotiable: boolean | null;
  expected_price_per_sqft: number | null;
  possession_status: string | null;
  possession_date: string | null;
  rera_registration_number: string | null;
  khata_type: string | null;
  property_tax_paid_upto: string | null;
  streetview_show_in_listing: boolean | null;
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

// Safe date-only formatter — parseISO avoids the UTC/Safari day-shift that
// `new Date("YYYY-MM-DD")` causes. Returns null for missing/invalid values.
const formatDateOnly = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? format(d, "PPP") : null;
};

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
    const propRpcPromise = supabase.rpc("get_owner_property", { p_property_id: id })
      .then(({ data: rows }) => ({ data: (rows ?? [])[0] ?? null }));
    const [{ data: propRow }, { data: imgRows }, { data: peRow }, { data: logRows }] = await Promise.all([
      propRpcPromise,
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
      const publishBlocked = nextStatus === "listed" && /location_not_ready:publish_location_incomplete/.test(error.message ?? "");
      toast({
        title: `Could not ${actionLabel}`,
        description: publishBlocked ? "This property's location needs Admin finalization before it can be re-listed." : error.message,
        variant: "destructive",
      });
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
              {[labelForValue(BHK_OPTIONS as unknown as { value:string; label:string }[], property.bhk), property.building_name?.trim()].filter(Boolean).join(" · ") || "Property"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[property.locality, property.city].filter(Boolean).join(", ") || "—"}
            </p>
            <div className="flex items-baseline justify-between pt-1 gap-3">
              {property.listing_type === "sale" ? (
                <p className="text-sm text-foreground">
                  {formatSalePrice(property.sale_price) ?? "Sale price not set"}
                </p>
              ) : (
                <p className="text-sm text-foreground">
                  {property.listed_rent && property.listed_rent > 0 ? (
                    <>
                      {formatRupees(property.listed_rent)}<span className="text-xs text-muted-foreground">/mo</span>
                      {property.security_deposit_amount && property.security_deposit_amount > 0 && (
                        <span className="text-xs text-muted-foreground ml-3">Deposit {formatRupees(property.security_deposit_amount)}</span>
                      )}
                    </>
                  ) : (
                    "Rent not set"
                  )}
                </p>
              )}
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
            <RequestsTab propertyId={property.id} propertyStatus={property.status} listingType={property.listing_type} />
          </TabsContent>

          {/* Details */}
          <TabsContent value="details" className="space-y-6">
            {/* Prompt 11 (H3, D-138) — always-visible status explainer. */}
            <StatusGuidance status={property.status} />
            {/* Full status + action glossary (collapsible). Complements the
                current-status card above. */}
            {isCommons && <StatusActionGlossary status={property.status} />}
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
              <FieldRow k="Full address" v={view.formatted_address} />
              <FieldRow k="Sublocality" v={view.sublocality_1} />
              <FieldRow k="Landmark" v={view.landmark} />
              <FieldRow k="Unit number" v={view.lister_flat_number} />
            </DetailsSection>

            <DetailsSection title="Listing details">
              <FieldRow k="Listing type" v={view.listing_type === "sale" ? "Sale" : view.listing_type === "rent" ? "Rent" : view.listing_type} />
              <FieldRow k="Listed by" v={view.lister_role} />
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
              <FieldRow k="Super built-up area" v={view.super_built_up_area ? `${view.super_built_up_area} sqft` : null} />
            </DetailsSection>

            <DetailsSection title="Price & Terms">
              {view.listing_type === "sale" ? (
                <>
                  {/* Primary price — always shown (non-empty fallback keeps FieldRow visible) */}
                  <FieldRow
                    k="Sale price"
                    v={formatSalePrice(view.sale_price) ?? "Sale price not set"}
                    pending={pendingFieldKeys.has("sale_price")}
                    live={formatSalePrice(property.sale_price) ?? "Sale price not set"}
                  />
                  <FieldRow
                    k="Price/sqft"
                    v={formatRupees(view.expected_price_per_sqft)}
                    pending={pendingFieldKeys.has("expected_price_per_sqft")}
                    live={formatRupees(property.expected_price_per_sqft)}
                  />
                  <FieldRow
                    k="Negotiable"
                    v={view.price_negotiable == null ? null : view.price_negotiable ? "Open to offers" : "Firm price"}
                    pending={pendingFieldKeys.has("price_negotiable")}
                    live={property.price_negotiable == null ? null : property.price_negotiable ? "Open to offers" : "Firm price"}
                  />
                  <FieldRow
                    k="Brokerage"
                    v={view.sale_brokerage_pct != null ? `${view.sale_brokerage_pct}%` : null}
                    pending={pendingFieldKeys.has("sale_brokerage_pct")}
                    live={property.sale_brokerage_pct != null ? `${property.sale_brokerage_pct}%` : null}
                  />
                  <FieldRow
                    k="Possession"
                    v={formatEnumLabel("possession_status", view.possession_status)}
                    pending={pendingFieldKeys.has("possession_status")}
                    live={formatEnumLabel("possession_status", property.possession_status)}
                  />
                  <FieldRow
                    k="Possession date"
                    v={formatDateOnly(view.possession_date)}
                    pending={pendingFieldKeys.has("possession_date")}
                    live={formatDateOnly(property.possession_date)}
                  />
                  <FieldRow
                    k="RERA no."
                    v={view.rera_registration_number}
                    pending={pendingFieldKeys.has("rera_registration_number")}
                    live={property.rera_registration_number}
                  />
                  <FieldRow
                    k="Khata type"
                    v={formatEnumLabel("khata_type", view.khata_type)}
                    pending={pendingFieldKeys.has("khata_type")}
                    live={formatEnumLabel("khata_type", property.khata_type)}
                  />
                  <FieldRow
                    k="Property tax paid upto"
                    v={formatDateOnly(view.property_tax_paid_upto)}
                    pending={pendingFieldKeys.has("property_tax_paid_upto")}
                    live={formatDateOnly(property.property_tax_paid_upto)}
                  />
                </>
              ) : (
                <>
                  {/* Primary price — always shown (non-empty fallback keeps FieldRow visible) */}
                  <FieldRow
                    k="Rent/mo"
                    v={view.listed_rent && view.listed_rent > 0 ? formatRupees(view.listed_rent) : "Rent not set"}
                    pending={pendingFieldKeys.has("listed_rent")}
                    live={property.listed_rent && property.listed_rent > 0 ? formatRupees(property.listed_rent) : "Rent not set"}
                  />
                  <FieldRow k="Society maintenance" v={formatRupees(view.society_maintenance_approx)} pending={pendingFieldKeys.has("society_maintenance_approx")} live={formatRupees(property.society_maintenance_approx)} />
                  <FieldRow
                    k="Maintenance included"
                    v={view.maintenance_included_in_rent == null ? null : view.maintenance_included_in_rent ? "Yes" : "No"}
                    pending={pendingFieldKeys.has("maintenance_included_in_rent")}
                    live={property.maintenance_included_in_rent == null ? null : property.maintenance_included_in_rent ? "Yes" : "No"}
                  />
                  <FieldRow k="Deposit" v={formatRupees(view.security_deposit_amount)} pending={pendingFieldKeys.has("security_deposit_amount")} live={formatRupees(property.security_deposit_amount)} />
                  <FieldRow k="Available from" v={formatDateOnly(view.available_from)} pending={pendingFieldKeys.has("available_from")} live={formatDateOnly(property.available_from)} />
                  <FieldRow k="Lock-in" v={view.lock_in_months ? `${view.lock_in_months} months` : null} pending={pendingFieldKeys.has("lock_in_months")} live={property.lock_in_months ? `${property.lock_in_months} months` : null} />
                  <FieldRow k="Notice period" v={view.notice_period_days ? `${view.notice_period_days} days` : null} pending={pendingFieldKeys.has("notice_period_days")} live={property.notice_period_days ? `${property.notice_period_days} days` : null} />
                  <FieldRow k="Annual increase" v={view.annual_rent_increase_pct != null ? `${view.annual_rent_increase_pct}%` : null} pending={pendingFieldKeys.has("annual_rent_increase_pct")} live={property.annual_rent_increase_pct != null ? `${property.annual_rent_increase_pct}%` : null} />
                  <FieldRow k="Move-in charges" v={formatRupees(view.move_in_charges_amount)} pending={pendingFieldKeys.has("move_in_charges_amount")} live={formatRupees(property.move_in_charges_amount)} />
                  <FieldRow k="Brokerage" v={formatRupees(view.rent_brokerage_fixed_amount)} pending={pendingFieldKeys.has("rent_brokerage_fixed_amount")} live={formatRupees(property.rent_brokerage_fixed_amount)} />
                </>
              )}
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
              <FieldRow k="Water storage" v={view.water_storage} />
              <FieldRow k="Water source" v={view.water_source?.length ? view.water_source.join(", ") : null} />
              <FieldRow k="Main door lock" v={view.main_door_lock_type} />
              <FieldRow k="2W parking count" v={view.parking_2w_count} />
              <FieldRow k="4W parking count" v={view.parking_4w_count} />
              {view.parking_notes && (
                <div><p className="text-xs text-muted-foreground">Parking notes</p><p className="text-sm whitespace-pre-line">{view.parking_notes}</p></div>
              )}
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

            <DetailsSection title="Media">
              <FieldRow k="Street View in listing" v={view.streetview_show_in_listing != null ? (view.streetview_show_in_listing ? "Yes" : "No") : null} />
              {view.youtube_walkthrough_url && (
                <div>
                  <p className="text-xs text-muted-foreground">Video walkthrough</p>
                  <a href={view.youtube_walkthrough_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View →</a>
                </div>
              )}
            </DetailsSection>

            {view.description && (
              <DetailsSection title="Description">
                <p className="text-sm text-muted-foreground whitespace-pre-line">{view.description}</p>
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
        title="Withdraw your submission?"
        description="This takes your listing out of the review queue and back to draft. It stays hidden from tenants, and you can edit and submit it again anytime."
        confirmLabel="Withdraw" onConfirm={() => doTransition("draft", "withdraw")}
      />
      <ConfirmDialog
        open={confirmKind === "archive"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Cancel this listing?"
        description="This archives the listing and removes it from your dashboard and from tenants. Any pending contact requests are cancelled. You'll need to contact support to restore it."
        confirmLabel="Yes, archive" variant="destructive" onConfirm={() => doTransition("archived", "archive")}
      />
      <ConfirmDialog
        open={confirmKind === "unlist"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Unlist this property?"
        description="Tenants won't see this listing until you re-list it. Your details are kept and nothing is deleted — re-listing makes it visible again."
        confirmLabel="Unlist" variant="destructive" onConfirm={() => doTransition("unlisted", "unlist")}
      />
      <ConfirmDialog
        open={confirmKind === "relist"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Re-list this property?"
        description="This makes your listing visible to tenants again immediately. If you haven't changed anything, it goes live right away."
        confirmLabel="Re-list" onConfirm={() => doTransition("listed", "relist")}
      />
      <ConfirmDialog
        open={confirmKind === "cancel_edit"} onOpenChange={(v) => !v && setConfirmKind(null)}
        title="Cancel your pending edit?"
        description="This discards the edit that's under review. Your live listing keeps its current details and tenants see no change."
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
  // getOwnerActions is the single source of truth for availability (shared with
  // the card info trigger). Labels/variants/handlers stay identical to before.
  const actions = getOwnerActions(status);
  const editLabel =
    status === "listed" ? "Edit listing" : status === "edit_pending_review" ? "Modify edit" : "Continue editing";

  return (
    <div className="pt-2 flex flex-wrap gap-2">
      {actions.map((a) => {
        switch (a) {
          case "edit":
            return <Button key={a} onClick={onEdit}><Pencil className="h-4 w-4 mr-1.5" /> {editLabel}</Button>;
          case "withdraw_submission":
            return <Button key={a} variant="outline" onClick={onWithdraw}>Withdraw submission</Button>;
          case "unlist":
            return <Button key={a} variant="outline" onClick={onUnlist} className="text-destructive">Unlist</Button>;
          case "relist":
            return <Button key={a} onClick={onRelist}>Re-list</Button>;
          case "cancel_edit":
            return <Button key={a} variant="outline" onClick={onCancelEdit}>Cancel pending edit</Button>;
          case "archive":
            return <Button key={a} variant="ghost" onClick={onArchive} className="text-destructive">Cancel listing</Button>;
          default:
            return null;
        }
      })}
    </div>
  );
}
