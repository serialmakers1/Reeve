/**
 * ListingReviewQueue — admin review inbox. Two tabs:
 *   • New Listings   — properties with status='pending_review'
 *   • Edit Requests  — property_edit_requests with status='pending'
 *
 * City filter + oldest/newest/owner-name sort applied client-side per D-119.
 * Row → detail view at /admin/listing-reviews/(new|edit)/:id.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import posthog from "posthog-js";
import { formatDistanceToNow, format } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DecisionsTab from "@/components/admin/DecisionsTab";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BHK_OPTIONS } from "@/config/property-form";

type TabValue = "new" | "edit" | "decisions";
type SortKey = "oldest" | "newest" | "owner";

interface NewListingRow {
  id: string;
  owner_id: string;
  building_name: string | null;
  bhk: string | null;
  locality: string | null;
  city: string | null;
  listed_rent: number | null;
  created_at: string;
  primary_photo?: string | null;
  owner_name?: string;
  listing_type?: string | null;
}

interface EditRequestRow {
  id: string;
  property_id: string;
  owner_id: string;
  created_at: string;
  payload: {
    field_changes?: Record<string, unknown>;
    photo_changes?: { add?: unknown[]; delete?: string[]; update?: unknown[] };
  };
  property?: {
    building_name: string | null;
    bhk: string | null;
    locality: string | null;
    city: string | null;
    primary_photo?: string | null;
    listing_type?: string | null;
  };
  owner_name?: string;
  prior_revisions?: number;
}

const bhkLabel = (v: string | null): string =>
  v ? BHK_OPTIONS.find((o) => o.value === v)?.label ?? v : "";

export default function ListingReviewQueue() {
  const navigate = useNavigate();
  useRequireAuth({ requireAdmin: true });
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: TabValue = ((): TabValue => {
    const t = searchParams.get("tab");
    if (t === "edit" || t === "decisions") return t;
    return "new";
  })();
  const [tab, setTab] = useState<TabValue>(initialTab);
  const [city, setCity] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("oldest");

  const [newListings, setNewListings] = useState<NewListingRow[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const posthogFiredRef = useRef(false);

  useEffect(() => {
    if (posthogFiredRef.current) return;
    posthogFiredRef.current = true;
    posthog?.capture("commons_admin_review_queue_viewed");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    // New listings: properties.status = 'pending_review'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: props } = await (supabase as any)
      .from("properties")
      .select("id, owner_id, building_name, bhk, locality, city, listed_rent, created_at, listing_type")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true });

    // Edit requests: pending rows with property joined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: edits } = await (supabase as any)
      .from("property_edit_requests")
      .select("id, property_id, owner_id, created_at, payload")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const propRows = (props ?? []) as NewListingRow[];
    const editRows = (edits ?? []) as EditRequestRow[];

    // Prefetch photos + owner names + properties for edit rows in parallel.
    const propIds = new Set<string>();
    propRows.forEach((r) => propIds.add(r.id));
    editRows.forEach((r) => propIds.add(r.property_id));
    const propIdList = Array.from(propIds);

    const ownerIds = new Set<string>();
    propRows.forEach((r) => ownerIds.add(r.owner_id));
    editRows.forEach((r) => ownerIds.add(r.owner_id));

    const [photosRes, ownersRes, propertiesForEditsRes, priorRevRes] = await Promise.all([
      propIdList.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any).from("property_images")
            .select("property_id, url").in("property_id", propIdList).eq("is_primary", true)
        : Promise.resolve({ data: [] }),
      ownerIds.size
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any).from("users")
            .select("id, full_name").in("id", Array.from(ownerIds))
        : Promise.resolve({ data: [] }),
      editRows.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any).from("properties")
            .select("id, building_name, bhk, locality, city, listing_type")
            .in("id", editRows.map((r) => r.property_id))
        : Promise.resolve({ data: [] }),
      editRows.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any).from("property_edit_requests")
            .select("property_id, status")
            .in("property_id", editRows.map((r) => r.property_id))
            .in("status", ["superseded", "rejected", "withdrawn", "approved"])
        : Promise.resolve({ data: [] }),
    ]);

    // A thumbnail-fetch failure must not hide the queue rows — surface it once
    // per load and fall through with no thumbnails.
    if ((photosRes as { error?: unknown }).error) {
      toast({
        title: "Couldn't load listing thumbnails",
        description: "Rows are shown without preview images. Refresh to retry.",
        variant: "destructive",
      });
    }

    const photoMap: Record<string, string> = {};
    for (const p of (photosRes.data ?? []) as { property_id: string; url: string }[]) {
      photoMap[p.property_id] = p.url;
    }
    const ownerMap: Record<string, string> = {};
    for (const o of (ownersRes.data ?? []) as { id: string; full_name: string | null }[]) {
      // users.full_name is the canonical name source; || keeps empty strings
      // falling back to "Owner" (matching prior getUserDisplayName(...) || "Owner").
      ownerMap[o.id] = o.full_name || "Owner";
    }
    const propMap: Record<string, EditRequestRow["property"]> = {};
    for (const p of (propertiesForEditsRes.data ?? []) as Array<NonNullable<EditRequestRow["property"]> & { id: string }>) {
      propMap[p.id] = { ...p, primary_photo: photoMap[p.id] ?? null };
    }
    const priorCounts: Record<string, number> = {};
    for (const r of (priorRevRes.data ?? []) as { property_id: string }[]) {
      priorCounts[r.property_id] = (priorCounts[r.property_id] ?? 0) + 1;
    }

    setNewListings(propRows.map((r) => ({
      ...r,
      primary_photo: photoMap[r.id] ?? null,
      owner_name: ownerMap[r.owner_id] ?? "Owner",
    })));
    setEditRequests(editRows.map((r) => ({
      ...r,
      property: propMap[r.property_id],
      owner_name: ownerMap[r.owner_id] ?? "Owner",
      prior_revisions: priorCounts[r.property_id] ?? 0,
    })));
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const changeTab = (t: TabValue) => {
    setTab(t);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", t);
      return next;
    }, { replace: true });
    posthog?.capture("commons_admin_review_tab_changed", { tab: t, city_filter: city, sort });
  };

  const cities = useMemo(() => {
    const s = new Set<string>();
    newListings.forEach((r) => r.city && s.add(r.city));
    editRequests.forEach((r) => r.property?.city && s.add(r.property.city));
    return Array.from(s).sort();
  }, [newListings, editRequests]);

  const applySort = <T extends { created_at: string; owner_name?: string }>(rows: T[]): T[] => {
    const copy = [...rows];
    if (sort === "oldest") copy.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "newest") copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else copy.sort((a, b) => (a.owner_name ?? "").localeCompare(b.owner_name ?? ""));
    return copy;
  };

  const filteredNew = useMemo(() => {
    const rows = city === "all" ? newListings : newListings.filter((r) => r.city === city);
    return applySort(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newListings, city, sort]);
  const filteredEdits = useMemo(() => {
    const rows = city === "all" ? editRequests : editRequests.filter((r) => r.property?.city === city);
    return applySort(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequests, city, sort]);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        <header>
          <h1 className="text-xl font-bold text-foreground">Listing Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {newListings.length} new listing{newListings.length === 1 ? "" : "s"}
            {" · "}
            {editRequests.length} edit request{editRequests.length === 1 ? "" : "s"} awaiting review
          </p>
        </header>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-40 min-h-[40px]"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-44 min-h-[40px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="owner">Owner name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={load} className="ml-auto">Refresh</Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => changeTab(v as TabValue)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="new">
              New Listings {newListings.length > 0 && <Badge variant="secondary" className="ml-1.5">{newListings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="edit">
              Edit Requests {editRequests.length > 0 && <Badge variant="secondary" className="ml-1.5">{editRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-3">
            {loading ? (
              <QueueSkeleton />
            ) : filteredNew.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">No new listings pending review.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredNew.map((r) => (
                  <li key={r.id}>
                    <QueueRow
                      thumb={r.primary_photo ?? null}
                      title={`${bhkLabel(r.bhk)} · ${r.building_name ?? "—"}`}
                      location={[r.locality, r.city].filter(Boolean).join(", ")}
                      ownerName={r.owner_name}
                      rent={r.listed_rent}
                      submittedAt={r.created_at}
                      onReview={() => navigate(`/admin/listing-reviews/new/${r.id}`)}
                      listingType={r.listing_type}
                    />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-3">
            {loading ? (
              <QueueSkeleton />
            ) : filteredEdits.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">No edit requests pending review.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredEdits.map((r) => {
                  const fieldCount = Object.keys(r.payload.field_changes ?? {}).length;
                  const photoAdd = r.payload.photo_changes?.add?.length ?? 0;
                  const photoDel = r.payload.photo_changes?.delete?.length ?? 0;
                  const changeCount = photoAdd + photoDel;
                  return (
                    <li key={r.id}>
                      <QueueRow
                        thumb={r.property?.primary_photo ?? null}
                        title={`${bhkLabel(r.property?.bhk ?? null)} · ${r.property?.building_name ?? "—"}`}
                        location={[r.property?.locality, r.property?.city].filter(Boolean).join(", ")}
                        ownerName={r.owner_name}
                        submittedAt={r.created_at}
                        onReview={() => navigate(`/admin/listing-reviews/edit/${r.id}`)}
                        listingType={r.property?.listing_type}
                        badges={[
                          `${fieldCount} field${fieldCount === 1 ? "" : "s"}`,
                          changeCount > 0 ? `${changeCount} photo change${changeCount === 1 ? "" : "s"}` : "",
                          (r.prior_revisions ?? 0) > 0 ? `Revised ${r.prior_revisions}×` : "",
                        ].filter(Boolean)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          {/* Prompt 13 (G3, D-165) — read-only audit tab. Aggregates two separate
              queries client-side (never UNION — same event lives in both tables). */}
          <TabsContent value="decisions" className="mt-3">
            <DecisionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function QueueRow({
  thumb, title, location, ownerName, rent, submittedAt, onReview, badges, listingType,
}: {
  thumb: string | null;
  title: string;
  location: string;
  ownerName: string | undefined;
  rent?: number | null;
  submittedAt: string;
  onReview: () => void;
  badges?: string[];
  // Prompt 10b (D-162). Optional so pre-existing call sites without it still compile.
  listingType?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors">
      <div className="w-16 h-12 sm:w-20 sm:h-14 shrink-0 bg-muted rounded overflow-hidden">
        {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[location, ownerName].filter(Boolean).join(" · ")}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {/* Prompt 10b — muted chip; smaller weight than status/rent badges. */}
          <Badge variant="outline" className="text-[10px] bg-muted/40 text-muted-foreground">
            {listingType === "sale" ? "For Sale" : "For Rent"}
          </Badge>
          {rent != null && rent > 0 && (
            <Badge variant="outline" className="text-[10px]">₹{rent.toLocaleString("en-IN")}/mo</Badge>
          )}
          <Badge variant="outline" className="text-[10px]" title={format(new Date(submittedAt), "PPpp")}>
            {formatDistanceToNow(new Date(submittedAt), { addSuffix: true })}
          </Badge>
          {badges?.map((b) => <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>)}
        </div>
      </div>
      <Button size="sm" onClick={onReview}>Review</Button>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="rounded-lg border bg-card p-3 flex items-center gap-3">
          <Skeleton className="w-20 h-14 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </li>
      ))}
    </ul>
  );
}
