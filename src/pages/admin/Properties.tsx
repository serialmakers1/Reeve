import { useState, useEffect, useCallback, useRef } from "react";
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
  formatLocalityCity, resolveAdminPrice, getStatusTargetsFor,
  buildStatusUpdatePayload, parsePageParam, totalPages, getPageWindow,
  validateSort, validateListingType, ADMIN_PAGE_SIZE,
  ADMIN_SORT_OPTIONS, LISTING_TYPE_OPTIONS,
} from "@/pages/admin/adminPropertyHelpers";

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: getStatusDisplay("draft").label },
  { value: "pending_review", label: getStatusDisplay("pending_review").label },
  { value: "changes_requested", label: getStatusDisplay("changes_requested").label },
  { value: "listed", label: getStatusDisplay("listed").label },
  { value: "edit_pending_review", label: getStatusDisplay("edit_pending_review").label },
  { value: "unlisted", label: getStatusDisplay("unlisted").label },
  { value: "archived", label: getStatusDisplay("archived").label },
];

export { STATUS_FILTER_OPTIONS };

/** Row shape returned by get_admin_properties_page. */
interface PropertyRow {
  property_id: string;
  building_name: string;
  locality: string | null;
  city: string | null;
  bhk: string;
  status: string;
  listing_type: string | null;
  listed_rent: number | null;
  sale_price: number | null;
  listed_at: string | null;
  updated_at: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  accepted_contact_requests: number;
  pending_contact_requests: number;
  rejected_contact_requests: number;
  total_contact_requests: number;
  view_count: number;
  comment_count: number;
  total_count: number;
}

type EmptyPageFallback = "first" | "previous";

/** Confirmation copy for a status change, keyed on target + restore semantics. */
function statusDialogCopy(
  currentStatus: string,
  target: string,
): { title: string; description: string; action: string } {
  const isRestore = currentStatus === "archived" && target === "draft";
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

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const seqRef = useRef(0);

  // ── URL is the single source of truth for filters/sort/page ────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const cityFilter = searchParams.get("city") || "";
  const typeFilter = validateListingType(searchParams.get("type"));
  const sort = validateSort(searchParams.get("sort"));
  const page = parsePageParam(searchParams.get("page"));
  const qParam = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState<string>(qParam);

  // Keep the input in sync when q changes externally (Back/forward, copied URL).
  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Write a param patch. Empty/default values are dropped from the URL. Any
  // filter/search/sort change resets to page 1; page navigation passes resetPage=false.
  const setParams = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(patch)) {
        const isDefault =
          v === null || v === "" ||
          (k === "status" && v === "all") ||
          (k === "type" && v === "all") ||
          (k === "sort" && v === "latest") ||
          (k === "page" && v === "1");
        if (isDefault) next.delete(k);
        else next.set(k, v);
      }
      if (resetPage) next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const gotoPage = useCallback((n: number) => setParams({ page: String(n) }, false), [setParams]);

  // Debounce the search box → URL q (resets to page 1).
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== qParam) setParams({ q: searchInput || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Row-action state.
  const [deleteTarget, setDeleteTarget] = useState<PropertyRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ property: PropertyRow; target: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // ── Load the current page from the RPC ─────────────────────────────────────
  const load = useCallback(
    async (emptyPageFallback: EmptyPageFallback = "first") => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const seq = ++seqRef.current;

      const { data, error } = await supabase.rpc("get_admin_properties_page", {
        p_search: qParam || null,
        p_status: statusFilter,
        p_city: cityFilter || null,
        p_listing_type: typeFilter,
        p_sort: sort,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: (page - 1) * ADMIN_PAGE_SIZE,
      });

      if (seq !== seqRef.current) return; // a newer load superseded this one

      if (error) {
        toast({ title: "Failed to load properties", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const resultRows = (data as unknown as PropertyRow[]) ?? [];

      // Empty page beyond the first: out-of-range URL → page 1; post-action → previous.
      if (resultRows.length === 0 && page > 1) {
        setLoading(false);
        gotoPage(emptyPageFallback === "previous" ? page - 1 : 1);
        return;
      }

      setRows(resultRows);
      setTotal(resultRows[0]?.total_count ?? 0);

      setLoading(false);
    },
    [user, qParam, statusFilter, cityFilter, typeFilter, sort, page, toast, gotoPage],
  );

  useEffect(() => {
    load("first");
  }, [load]);

  // Distinct cities — loaded once (admin-only RPC).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_admin_property_cities");
      if (error) {
        toast({ title: "Failed to load cities", description: error.message, variant: "destructive" });
        return;
      }
      setCities(((data as unknown as Array<{ city: string }>) ?? []).map((r) => r.city).filter(Boolean));
    })();
  }, [user, toast]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("admin_delete_draft_property", {
        p_property_id: deleteTarget.property_id,
      });
      if (error) {
        toast({ title: "Cannot delete draft", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Draft deleted" });
      setDeleteTarget(null);
      await load("previous");
    } finally {
      setActionBusy(false);
    }
  }, [deleteTarget, toast, load]);

  // Shared status-change mutation. Restore (archived → draft) is derived, not passed.
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
        .eq("id", property.property_id)
        .eq("status", property.status) // optimistic concurrency guard
        .select("id");
      if (error) {
        toast({ title: "Could not change status", description: error.message, variant: "destructive" });
        return;
      }
      if (!data || data.length === 0) {
        toast({
          title: "Status changed elsewhere",
          description: "This property's status changed elsewhere. The list has been refreshed.",
          variant: "destructive",
        });
        setStatusTarget(null);
        await load("previous");
        return;
      }
      toast({ title: isRestore ? "Property restored to draft" : "Status updated" });
      setStatusTarget(null);
      await load("previous");
    } finally {
      setActionBusy(false);
    }
  }, [statusTarget, toast, load]);

  if (authLoading || (loading && rows.length === 0)) {
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

  const dialogCopy = statusTarget ? statusDialogCopy(statusTarget.property.status, statusTarget.target) : null;
  const pageCount = totalPages(total);
  const firstRow = total === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1;
  const lastRow = Math.min(page * ADMIN_PAGE_SIZE, total);

  const renderStatusBadge = (status: string) => {
    const d = getStatusDisplay(status);
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit ${d.color}`}>
        {d.label}
      </span>
    );
  };

  const renderContactPopover = (p: PropertyRow) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${p.total_contact_requests} contact requests — view breakdown`}
        >
          {p.total_contact_requests}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium text-muted-foreground mb-2">Contact requests</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Accepted</span><span className="font-medium">{p.accepted_contact_requests}</span></div>
          <div className="flex justify-between"><span>Pending</span><span className="font-medium">{p.pending_contact_requests}</span></div>
          <div className="flex justify-between"><span>Rejected</span><span className="font-medium">{p.rejected_contact_requests}</span></div>
          <div className="flex justify-between border-t pt-1 mt-1"><span>Total</span><span className="font-medium">{p.total_contact_requests}</span></div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderActivity = (p: PropertyRow) => (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1" aria-label={`${p.view_count} views`}>
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        {p.view_count}
      </span>
      <span className="inline-flex items-center gap-1" aria-label={`${p.comment_count} comments`}>
        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        {p.comment_count}
      </span>
    </div>
  );

  const renderActions = (p: PropertyRow) => {
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
              <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()} className="h-7 text-xs">
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

  const GRID = "grid-cols-[1.8fr_0.6fr_1fr_1fr_1.3fr_0.9fr_1fr_1.6fr]";
  const pageWindow = getPageWindow(page, pageCount);

  return (
    <AdminLayout>
      <div className="max-w-6xl space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Properties</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>

        {/* Filters + search. */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setParams({ status: v })}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cityFilter || "all"} onValueChange={(v) => setParams({ city: v === "all" ? null : v })}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by city">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setParams({ type: v })}>
            <SelectTrigger className="w-full sm:w-32" aria-label="Filter by listing type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {LISTING_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setParams({ sort: v })}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Sort properties">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[12rem]">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search building, locality, city, owner…"
              className="pl-9"
              aria-label="Search properties"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No properties found.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className={`hidden md:grid ${GRID} gap-4 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide`}>
              <span>Property</span>
              <span>BHK</span>
              <span>Status</span>
              <span>Price</span>
              <span>Owner</span>
              <span>Contact Requests</span>
              <span>Activity</span>
              <span className="text-right">Actions</span>
            </div>

            {rows.map((p) => {
              const price = resolveAdminPrice(
                { id: p.property_id, status: p.status, listing_type: p.listing_type, listed_rent: p.listed_rent, sale_price: p.sale_price },
              );
              const location = formatLocalityCity(p.locality, p.city);

              return (
                <div
                  key={p.property_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/properties/${p.property_id}`)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/admin/properties/${p.property_id}`);
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
                      <span>{p.owner_name ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-foreground">
                        {price.amount}
                        <span className="ml-1 text-muted-foreground">{price.kind}</span>
                      </span>
                      <span className="text-muted-foreground">{p.total_contact_requests} requests</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {renderActivity(p)}
                      <span className="text-muted-foreground">{format(new Date(p.updated_at), "d MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {renderContactPopover(p)}
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
                    <span className="text-sm text-foreground truncate" title={p.owner_email ?? undefined}>
                      {p.owner_name ?? "—"}
                    </span>
                    <span>{renderContactPopover(p)}</span>
                    {renderActivity(p)}
                    <div className="flex justify-end">{renderActions(p)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <nav className="flex flex-col sm:flex-row items-center justify-between gap-3" aria-label="Pagination">
            <p className="text-xs text-muted-foreground">
              Showing {firstRow}–{lastRow} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={page <= 1}
                onClick={() => gotoPage(page - 1)}
                aria-label="Previous page"
              >
                Previous
              </Button>
              {pageWindow.map((tok, i) =>
                tok === "ellipsis" ? (
                  <span key={`e${i}`} className="px-1.5 text-muted-foreground" aria-hidden="true">…</span>
                ) : (
                  <Button
                    key={tok}
                    size="sm"
                    variant={tok === page ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    aria-label={`Page ${tok}`}
                    aria-current={tok === page ? "page" : undefined}
                    onClick={() => gotoPage(tok)}
                  >
                    {tok}
                  </Button>
                ),
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={page >= pageCount}
                onClick={() => gotoPage(page + 1)}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          </nav>
        )}

        {/* Delete-draft confirmation. */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the draft property and its photos. This action cannot be undone.
                {deleteTarget && (
                  <span className="block mt-2 text-foreground font-medium">
                    {deleteTarget.building_name}
                    {deleteTarget.owner_name && ` · ${deleteTarget.owner_name}`}
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

        {/* Status-change confirmation. */}
        <AlertDialog open={!!statusTarget} onOpenChange={(o) => { if (!o) setStatusTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogCopy?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {dialogCopy?.description}
                {statusTarget && (
                  <span className="block mt-2 text-foreground font-medium">
                    {statusTarget.property.building_name}
                    {statusTarget.property.owner_name && ` · ${statusTarget.property.owner_name}`}
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
