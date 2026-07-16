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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search as SearchIcon, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { getStatusDisplay } from "@/lib/propertyStatus";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  inspection_proposed: "bg-yellow-100 text-yellow-700",
  inspection_scheduled: "bg-blue-100 text-blue-700",
  inspected: "bg-purple-100 text-purple-700",
  agreement_pending: "bg-orange-100 text-orange-700",
  listed: "bg-green-100 text-green-700",
  occupied: "bg-teal-100 text-teal-700",
  off_market: "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-400",
};

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
  bhk: string;
  status: string;
  is_active: boolean;
  listed_rent: number | null;
  updated_at: string;
  owner: { full_name: string | null; email: string | null; phone: string | null } | null;
}

interface AppCount {
  property_id: string;
  status: string;
}

interface FinalRent {
  property_id: string;
  proposed_rent: number | null;
  final_agreed_rent: number | null;
  owner_counter_rent: number | null;
}

const formatCurrency = (n: number | null | undefined) =>
  n != null && n > 0 ? `₹${n.toLocaleString("en-IN")}` : "—";

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

export default function AdminProperties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const [properties, setProperties] = useState<Property[]>([]);
  const [countMap, setCountMap] = useState<Record<string, number>>({});
  const [rentMap, setRentMap] = useState<Record<string, number>>({});
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
  const [restoreTarget, setRestoreTarget] = useState<Property | null>(null);
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
        id, building_name, locality, bhk, status, is_active,
        listed_rent, updated_at,
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
      toast({ title: "Failed to load properties", description: propsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: appCounts, error: appCountsError } = await supabase
      .from("applications")
      .select("property_id, status")
      .not("status", "in", '("draft","withdrawn","expired")');

    if (appCountsError) {
      toast({ title: "Failed to load application counts", description: appCountsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: finalRents, error: finalRentsError } = await supabase
      .from("applications")
      .select("property_id, proposed_rent, final_agreed_rent, owner_counter_rent")
      .eq("status", "lease_active");

    if (finalRentsError) {
      toast({ title: "Failed to load rent data", description: finalRentsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const cMap = (appCounts as AppCount[] | null)?.reduce((acc, a) => {
      acc[a.property_id] = (acc[a.property_id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>) ?? {};

    const rMap = (finalRents as FinalRent[] | null)?.reduce((acc, a) => {
      const rent = a.final_agreed_rent ?? a.owner_counter_rent ?? a.proposed_rent;
      if (rent != null) acc[a.property_id] = rent;
      return acc;
    }, {} as Record<string, number>) ?? {};

    setProperties((props as unknown as Property[]) ?? []);
    setCountMap(cMap);
    setRentMap(rMap);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("admin_delete_draft_property", {
      p_property_id: deleteTarget.id,
    });
    setActionBusy(false);
    if (error) {
      // RPC surfaces guard errors ("Property has N applications", etc.) as a
      // Postgres RAISE — legibly show them.
      toast({
        title: "Cannot delete draft",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Draft deleted" });
    setDeleteTarget(null);
    await load();
  }, [deleteTarget, toast, load]);

  const confirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setActionBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("properties")
      .update({ status: "unlisted" })
      .eq("id", restoreTarget.id);
    setActionBusy(false);
    if (error) {
      toast({ title: "Could not restore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Property restored to unlisted" });
    setRestoreTarget(null);
    await load();
  }, [restoreTarget, toast, load]);

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-5xl">
          <Skeleton className="h-8 w-48" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-4">
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
            {/* Table header — Prompt 12 adds Actions column. */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_1fr_1.2fr] gap-4 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Property</span>
              <span>BHK</span>
              <span>Status</span>
              <span>Live</span>
              <span>Owner</span>
              <span>Rent</span>
              <span>Apps</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows. Row-scope click navigates to detail; action buttons stopPropagation
                so their click doesn't bubble to the row. */}
            {visibleProperties.map((p) => {
              const rent = p.status === "occupied" ? rentMap[p.id] : (p.listed_rent ?? undefined);
              const appCount = countMap[p.id] ?? 0;
              const canDelete = p.status === "draft";
              const canRestore = p.status === "archived";

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/properties/${p.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/admin/properties/${p.id}`);
                    }
                  }}
                  className="w-full text-left border-t first:border-t-0 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{p.building_name}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {p.locality && <span>{p.locality}</span>}
                      <span>{p.bhk}</span>
                      <span>{p.owner?.full_name ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span>{formatCurrency(rent)}</span>
                      <span className="text-muted-foreground">{appCount} apps</span>
                      <span className="text-muted-foreground">{format(new Date(p.updated_at), "d MMM yyyy")}</span>
                    </div>
                    {(canDelete || canRestore) && (
                      <div className="flex items-center gap-2 pt-1">
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                            className="h-7 text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete draft
                          </Button>
                        )}
                        {canRestore && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); setRestoreTarget(p); }}
                            className="h-7 text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Restore
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_1fr_1.2fr] gap-4 items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.building_name}</p>
                      {p.locality && <p className="text-xs text-muted-foreground">{p.locality}</p>}
                    </div>
                    <span className="text-sm text-foreground">{p.bhk}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                    <span>
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${p.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    </span>
                    <span className="text-sm text-foreground truncate" title={p.owner?.email ?? undefined}>
                      {p.owner?.full_name ?? "—"}
                    </span>
                    <span className="text-sm text-foreground">{formatCurrency(rent)}</span>
                    <span className="text-sm text-foreground">{appCount > 0 ? appCount : "—"}</span>
                    <div className="flex items-center justify-end gap-1.5">
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                          className="h-7 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete draft
                        </Button>
                      )}
                      {canRestore && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); setRestoreTarget(p); }}
                          className="h-7 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Restore
                        </Button>
                      )}
                    </div>
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

        {/* Restore-archived confirmation. Admin bypasses enforce_property_owner_transitions. */}
        <AlertDialog open={!!restoreTarget} onOpenChange={(o) => { if (!o) setRestoreTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore this property?</AlertDialogTitle>
              <AlertDialogDescription>
                The property will be restored to unlisted status. You can then list it from the listing review queue.
                {restoreTarget && (
                  <span className="block mt-2 text-foreground font-medium">
                    {restoreTarget.building_name}
                    {restoreTarget.owner?.full_name && ` · ${restoreTarget.owner.full_name}`}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRestore} disabled={actionBusy}>
                {actionBusy ? "Restoring…" : "Restore"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
