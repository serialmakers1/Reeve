import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search as SearchIcon, Trash2, RotateCcw, Eye, MessageSquare,
  ChevronDown, PencilLine,
} from "lucide-react";
import { format } from "date-fns";
import { getStatusDisplay } from "@/lib/propertyStatus";
import {
  formatLocalityCity, bucketApplications, resolveAdminPrice,
  getStatusTargetsFor, buildStatusUpdatePayload,
  type AppBucket, type AppStatusRow,
} from "@/pages/admin/adminPropertyHelpers";

// Prompt 12 (D-164) — status filter options. Commons statuses shown individually;
// legacy PM statuses grouped under a single "Legacy PM" option to keep the
// dropdown scannable. "" = no filter.
const LEGACY_PM_STATUSES = [
  "inspection_proposed",
  "inspection_accepted",
  "inspection_scheduled",
  "inspected",
  "agreement_pending",
  "occupied",
  "off_market",
  "expiring",
  "turnover",
  "inactive",
] as const;

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: getStatusDisplay("draft").label },
  { value: "pending_review", label: getStatusDisplay("pending_review").label },
  { value: "changes_requested", label: getStatusDisplay("changes_requested").label },
  { value: "listed", label: getStatusDisplay("listed").label },
  { value: "edit_pending_review", label: getStatusDisplay("edit_pending_review").label },
  { value: "unlisted", label: getStatusDisplay("unlisted").label },
  { value: "archived", label: getStatusDisplay("archived").label },
  { value: "legacy_pm", label: "Legacy PM" },
];

interface Property {
  id: string;
  building_name: string;
  locality: string | null;
  city: string | null;
  bhk: string;
  status: string;
  is_active: boolean;
  listing_type: "rent" | "sale" | null;
  listed_rent: number | null;
  sale_price: number | null;
  updated_at: string;
  owner: { full_name: string | null; email: string | null; phone: string | null } | null;
}

interface FinalRent {
  property_id: string;
  proposed_rent: number | null;
  final_agreed_rent: number | null;
  owner_counter_rent: number | null;
}

interface ActivityCount {
  views: number;
  comments: number;
}

/**
 * Prompt 12 (D-164) — client-side search across building + owner fields.
 * Exported for test coverage. Case-insensitive substring match.
 */
export function filterPropertiesBySearch<
  T extends {
    building_name: string;
    owner: { full_name: string | null; email: string | null; phone: string | null } | null;
  },
>(rows: T[], rawQuery: string): T[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((p) => {
    const haystack = [
      p.building_name,
      p.owner?.full_name,
      p.owner?.email,
      p.owner?.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Exported so tests + docs can enumerate the same set. */
export { LEGACY_PM_STATUSES, STATUS_FILTER_OPTIONS };

/** Confirmation copy for a status change, keyed on target + restore semantics. */
function statusDialogCopy(
  property: Property,
  target: string,
): { title: string; description: string; action: string } {
  const isRestore = property.status === "archived" && target === "draft";
  if (isRestore) {
    return {
      title: "Restore this property?",
      description:
        "This returns the property to Draft. The owner must edit and submit it for review again before it can become live.",
      action: "Restore to draft",
    };
  }
  switch (target) {
    case "listed":
      return {
        title: "List this property publicly?",
        description:
          "This makes the property visible to tenants in search immediately and bypasses the normal review approval step.",
        action: "Make live",
      };
    case "draft":
      return {
        title: "Move to draft?",
        description:
          "The property becomes hidden. The owner can edit it and must submit it for review again. It may become eligible for the delete-draft action, subject to backend guards.",
        action: "Move to draft",
      };
    case "archived":
      return {
        title: "Archive this property?",
        description:
          "The property becomes hidden and archived. Any pending contact requests may be auto-cancelled.",
        action: "Archive",
      };
    case "pending_review":
      return {
        title: "Send to review?",
        description: "The property moves into the listing review queue.",
        action: "Send to review",
      };
    case "unlisted":
      return {
        title: "Unlist this property?",
        description: "The property is hidden from search. The owner can re-list it later.",
        action: "Unlist",
      };
    default:
      return {
        title: "Change status?",
        description: `The property status will change to ${getStatusDisplay(target).label}.`,
        action: "Confirm",
      };
  }
}

export default function AdminProperties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const [properties, setProperties] = useState<Property[]>([]);
  const [appMap, setAppMap] = useState<Map<string, AppBucket>>(new Map());
  const [rentMap, setRentMap] = useState<Map<string, number>>(new Map());
  const [countMap, setCountMap] = useState<Map<string, ActivityCount>>(new Map());
  const [loading, setLoading] = useState(true);

  // Prompt 12 (D-164) — filter + search state; URL param persistence.
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "all");
  const [searchInput, setSearchInput] = useState<string>(() => searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchInput);

  // Debounce search input → debouncedSearch (300ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Write URL params on filter/search change.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (statusFilter === "all") params.delete("status");
    else params.set("status", statusFilter);
    if (!debouncedSearch) params.delete("q");
    else params.set("q", debouncedSearch);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, debouncedSearch]);

  // Row-action state.
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ property: Property; target: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }

    // Prompt 12: server-side status filter for perf. Search stays client-side —
    // multi-column ILIKE across joined `users` is awkward; admin dataset size
    // fits in memory. Revisit if / when it doesn't.
    let query = supabase
      .from("properties")
      .select(`
        id, building_name, locality, city, bhk, status, is_active,
        listing_type, listed_rent, sale_price, updated_at,
        owner:users!properties_owner_id_fkey(full_name, email, phone)
      `)
      .order("updated_at", { ascending: false });

    if (statusFilter === "legacy_pm") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).in("status", LEGACY_PM_STATUSES);
    } else if (statusFilter !== "all") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).eq("status", statusFilter);
    }

    const { data: props, error: propsError } = await query;

    if (propsError) {
      // Property list is essential — this is a fatal page-load error.
      toast({ title: "Failed to load properties", description: propsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = (props as unknown as Property[]) ?? [];
    const ids = rows.map((p) => p.id);

    setProperties(rows);

    // No rows → skip secondary queries (never issue `.in("property_id", [])`).
    if (ids.length === 0) {
      setAppMap(new Map());
      setRentMap(new Map());
      setCountMap(new Map());
      setLoading(false);
      return;
    }

    // Secondary engagement/count queries run in parallel and degrade independently:
    // a failure in one must not discard the others, and must not blank the list.
    // Supabase resolves with { data, error } even on DB failure, so inspect .error
    // (and treat a rejected settle the same way).
    const [appRes, rentRes, countRes] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("applications").select("property_id, status").in("property_id", ids),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("applications")
        .select("property_id, proposed_rent, final_agreed_rent, owner_counter_rent")
        .eq("status", "lease_active")
        .in("property_id", ids),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("get_property_counts", { p_property_ids: ids }),
    ]);

    // 1) Application buckets.
    if (appRes.status === "fulfilled" && !appRes.value.error) {
      setAppMap(bucketApplications((appRes.value.data as AppStatusRow[]) ?? []));
    } else {
      const msg = appRes.status === "fulfilled" ? appRes.value.error?.message : String(appRes.reason);
      toast({ title: "Failed to load application counts", description: msg, variant: "destructive" });
      setAppMap(new Map());
    }

    // 2) Final (occupied) rent override.
    if (rentRes.status === "fulfilled" && !rentRes.value.error) {
      const rMap = new Map<string, number>();
      for (const a of (rentRes.value.data as FinalRent[]) ?? []) {
        const rent = a.final_agreed_rent ?? a.owner_counter_rent ?? a.proposed_rent;
        if (rent != null) rMap.set(a.property_id, rent);
      }
      setRentMap(rMap);
    } else {
      const msg = rentRes.status === "fulfilled" ? rentRes.value.error?.message : String(rentRes.reason);
      toast({ title: "Failed to load rent data", description: msg, variant: "destructive" });
      setRentMap(new Map());
    }

    // 3) View + comment counts (batched RPC).
    if (countRes.status === "fulfilled" && !countRes.value.error) {
      const cMap = new Map<string, ActivityCount>();
      for (const r of (countRes.value.data as Array<{ property_id: string; view_count: number; comment_count: number }>) ?? []) {
        cMap.set(r.property_id, { views: Number(r.view_count) || 0, comments: Number(r.comment_count) || 0 });
      }
      setCountMap(cMap);
    } else {
      const msg = countRes.status === "fulfilled" ? countRes.value.error?.message : String(countRes.reason);
      toast({ title: "Failed to load view/comment counts", description: msg, variant: "destructive" });
      setCountMap(new Map());
    }

    setLoading(false);
  }, [user, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Prompt 12 — client-side search across building_name + owner.full_name/email/phone.
  const visibleProperties = useMemo(
    () => filterPropertiesBySearch(properties, debouncedSearch),
    [properties, debouncedSearch],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("admin_delete_draft_property", {
        p_property_id: deleteTarget.id,
      });
      if (error) {
        // RPC surfaces guard errors ("Property has N applications", etc.) as a
        // Postgres RAISE — legibly show them.
        toast({ title: "Cannot delete draft", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Draft deleted" });
      setDeleteTarget(null);
      await load();
    } finally {
      setActionBusy(false);
    }
  }, [deleteTarget, toast, load]);

  // Shared status-change mutation. Restore (archived → draft) is derived, not a
  // separate path. Admin bypasses enforce_property_owner_transitions; existing
  // triggers manage is_active + activity logging.
  const confirmStatusChange = useCallback(async () => {
    if (!statusTarget) return;
    const { property, target } = statusTarget;
    const isRestore = property.status === "archived" && target === "draft";
    setActionBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("properties")
        .update(buildStatusUpdatePayload(target))
        .eq("id", property.id)
        .eq("status", property.status) // optimistic concurrency guard
        .select("id");
      if (error) {
        toast({ title: "Could not change status", description: error.message, variant: "destructive" });
        return;
      }
      if (!data || data.length === 0) {
        // 0 rows updated → the status changed elsewhere since we loaded.
        toast({
          title: "Status changed elsewhere",
          description: "This property's status changed elsewhere. The list has been refreshed.",
          variant: "destructive",
        });
        setStatusTarget(null);
        await load();
        return;
      }
      toast({ title: isRestore ? "Property restored to draft" : "Status updated" });
      setStatusTarget(null);
      await load();
    } finally {
      setActionBusy(false);
    }
  }, [statusTarget, toast, load]);

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-6xl">
          <Skeleton className="h-8 w-48" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  const dialogCopy = statusTarget ? statusDialogCopy(statusTarget.property, statusTarget.target) : null;

  const renderStatusBadge = (status: string) => {
    const d = getStatusDisplay(status);
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit ${d.color}`}>
        {d.label}
      </span>
    );
  };

  const renderAppsPopover = (p: Property) => {
    const b = appMap.get(p.id) ?? { total: 0, accepted: 0, pending: 0, rejected: 0 };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${b.total} applications — view breakdown`}
          >
            {b.total}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-44 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium text-muted-foreground mb-2">Applications</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Accepted</span><span className="font-medium">{b.accepted}</span></div>
            <div className="flex justify-between"><span>Pending</span><span className="font-medium">{b.pending}</span></div>
            <div className="flex justify-between"><span>Rejected</span><span className="font-medium">{b.rejected}</span></div>
            <div className="flex justify-between border-t pt-1 mt-1"><span>Total</span><span className="font-medium">{b.total}</span></div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderActivity = (p: Property) => {
    const c = countMap.get(p.id) ?? { views: 0, comments: 0 };
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1" aria-label={`${c.views} views`}>
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {c.views}
        </span>
        <span className="inline-flex items-center gap-1" aria-label={`${c.comments} comments`}>
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {c.comments}
        </span>
      </div>
    );
  };

  // Actions cluster (shared desktop + mobile). All controls stopPropagation.
  const renderActions = (p: Property) => {
    const targets = getStatusTargetsFor(p.status);
    return (
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {p.status === "draft" && (
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
            className="h-7 text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete draft
          </Button>
        )}

        {p.status === "archived" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); setStatusTarget({ property: p, target: "draft" }); }}
            className="h-7 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Restore
          </Button>
        )}

        {p.status === "edit_pending_review" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); navigate("/admin/listing-reviews?tab=edit"); }}
            className="h-7 text-xs"
          >
            <PencilLine className="h-3 w-3 mr-1" /> Review pending edit
          </Button>
        )}

        {p.status !== "archived" && p.status !== "edit_pending_review" && targets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => e.stopPropagation()}
                className="h-7 text-xs"
              >
                Change status <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {targets.map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={(e) => { e.stopPropagation(); setStatusTarget({ property: p, target: t }); }}
                >
                  {getStatusDisplay(t).label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const GRID = "grid-cols-[1.8fr_0.6fr_1fr_1fr_1.3fr_0.8fr_1fr_1.6fr]";

  return (
    <AdminLayout>
      <div className="max-w-6xl space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Properties</h1>
          <Badge variant="secondary">{visibleProperties.length}</Badge>
        </div>

        {/* Prompt 12 (D-164) — filter + search bar. */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by building, owner name, email, or phone"
              className="pl-9"
              aria-label="Search properties"
            />
          </div>
        </div>

        {visibleProperties.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No properties found.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            {/* Table header. */}
            <div className={`hidden md:grid ${GRID} gap-4 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide`}>
              <span>Property</span>
              <span>BHK</span>
              <span>Status</span>
              <span>Price</span>
              <span>Owner</span>
              <span>Applications</span>
              <span>Activity</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows. Row-scope click/keyboard navigates to detail; nested controls
                stopPropagation, and the keyboard handler ignores keys bubbling from
                nested controls (event.target !== event.currentTarget). */}
            {visibleProperties.map((p) => {
              const price = resolveAdminPrice(p, rentMap);
              const location = formatLocalityCity(p.locality, p.city);
              const bucket = appMap.get(p.id) ?? { total: 0, accepted: 0, pending: 0, rejected: 0 };

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/properties/${p.id}`)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/admin/properties/${p.id}`);
                    }
                  }}
                  className="w-full text-left border-t first:border-t-0 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{p.building_name}</span>
                      {renderStatusBadge(p.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {location !== "—" && <span>{location}</span>}
                      <span>{p.bhk}</span>
                      <span>{p.owner?.full_name ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-foreground">
                        {price.amount}
                        <span className="ml-1 text-muted-foreground">{price.kind}</span>
                      </span>
                      <span className="text-muted-foreground">{bucket.total} apps</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {renderActivity(p)}
                      <span className="text-muted-foreground">{format(new Date(p.updated_at), "d MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {renderAppsPopover(p)}
                      {renderActions(p)}
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className={`hidden md:grid ${GRID} gap-4 items-center`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.building_name}</p>
                      {location !== "—" && <p className="text-xs text-muted-foreground truncate">{location}</p>}
                    </div>
                    <span className="text-sm text-foreground">{p.bhk}</span>
                    {renderStatusBadge(p.status)}
                    <span className="text-sm text-foreground">
                      {price.amount}
                      <span className="block text-xs text-muted-foreground">{price.kind}</span>
                    </span>
                    <span className="text-sm text-foreground truncate" title={p.owner?.email ?? undefined}>
                      {p.owner?.full_name ?? "—"}
                    </span>
                    <span>{renderAppsPopover(p)}</span>
                    {renderActivity(p)}
                    <div className="flex justify-end">{renderActions(p)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete-draft confirmation. RPC pre-checks applications/visits — errors surface via toast. */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the draft property and its photos. This action cannot be undone.
                {deleteTarget && (
                  <span className="block mt-2 text-foreground font-medium">
                    {deleteTarget.building_name}
                    {deleteTarget.owner?.full_name && ` · ${deleteTarget.owner.full_name}`}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={actionBusy}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {actionBusy ? "Deleting…" : "Delete draft"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Status-change confirmation. Admin bypasses enforce_property_owner_transitions;
            triggers manage is_active + activity logging. */}
        <AlertDialog open={!!statusTarget} onOpenChange={(o) => { if (!o) setStatusTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogCopy?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {dialogCopy?.description}
                {statusTarget && (
                  <span className="block mt-2 text-foreground font-medium">
                    {statusTarget.property.building_name}
                    {statusTarget.property.owner?.full_name && ` · ${statusTarget.property.owner.full_name}`}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStatusChange} disabled={actionBusy}>
                {actionBusy ? "Working…" : dialogCopy?.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
