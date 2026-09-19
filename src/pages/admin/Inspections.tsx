import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { REPORT_TYPES } from "@/lib/inspection-report/types";
import type { ReportType } from "@/lib/inspection-report/types";
import { formatINDate } from "@/lib/inspection-report/formatters";
import { buildSearchOrFilter } from "./inspectionsListUtils";

const PAGE_SIZE = 10;
const LIST_COLUMNS =
  "id,inspection_type,inspection_date,building_name,flat_number,locality,owner_name,owner_phone,created_at,updated_at";

type SortKey = "created_desc" | "created_asc" | "updated_desc";
const TYPE_ALL = "all";
const TYPE_NONE = "none";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "created_desc", label: "Newest created" },
  { value: "created_asc", label: "Oldest created" },
  { value: "updated_desc", label: "Recently updated" },
];

interface InspectionRow {
  id: string;
  inspection_type: string | null;
  inspection_date: string | null;
  building_name: string | null;
  flat_number: string | null;
  locality: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  created_at: string;
  updated_at: string;
}

function secondaryLine(row: InspectionRow): string {
  return [row.flat_number, row.locality].filter(Boolean).join(" · ");
}

export default function InspectionsList() {
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filters / sort / paging
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ReportType>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [page, setPage] = useState(0);

  // Data
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNext, setHasNext] = useState(false);
  const [errored, setErrored] = useState(false);
  const [rangeInvalid, setRangeInvalid] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const reqSeqRef = useRef(0);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<string>(TYPE_NONE);
  const [newBuilding, setNewBuilding] = useState("");
  const [newDate, setNewDate] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<InspectionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" || typeFilter !== "" || fromDate !== "" || toDate !== "";

  // Debounce the search input (~300ms) — avoids a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any criteria change returns to the first page.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, typeFilter, fromDate, toDate, sort]);

  useEffect(() => {
    if (authLoading || !user) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, page, debouncedSearch, typeFilter, fromDate, toDate, sort, refreshKey]);

  const fetchData = async () => {
    // Invalidate any earlier in-flight request first, so a late response cannot
    // overwrite the state we are about to set (incl. the invalid-range state).
    const seq = ++reqSeqRef.current;

    const invalid = fromDate !== "" && toDate !== "" && fromDate > toDate;
    setRangeInvalid(invalid);
    if (invalid) {
      setRows([]);
      setHasNext(false);
      setErrored(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrored(false);
    try {
      let q = supabase.from("property_inspections").select(LIST_COLUMNS);

      const orFilter = buildSearchOrFilter(debouncedSearch);
      if (orFilter) q = q.or(orFilter);
      if (typeFilter) q = q.eq("inspection_type", typeFilter);
      if (fromDate) q = q.gte("inspection_date", fromDate);
      if (toDate) q = q.lte("inspection_date", toDate);

      const ascending = sort === "created_asc";
      const primaryCol = sort === "updated_desc" ? "updated_at" : "created_at";
      q = q
        .order(primaryCol, { ascending })
        .order("id", { ascending })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

      const { data, error } = await q;
      if (seq !== reqSeqRef.current) return; // superseded by a newer request
      if (error) throw error;

      const all = (data ?? []) as InspectionRow[];
      setHasNext(all.length > PAGE_SIZE);
      setRows(all.slice(0, PAGE_SIZE));
    } catch (err: unknown) {
      if (seq !== reqSeqRef.current) return;
      setErrored(true);
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Failed to load inspections", description: message, variant: "destructive" });
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setTypeFilter("");
    setFromDate("");
    setToDate("");
    setSort("created_desc");
    setPage(0);
  };

  const handleCreate = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("property_inspections")
        .insert({
          inspector_user_id: user.id,
          inspection_type: newType === TYPE_NONE ? null : (newType as ReportType),
          building_name: newBuilding.trim() || null,
          inspection_date: newDate || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("No inspection id returned.");
      navigate(`/admin/inspections/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Failed to create inspection", description: message, variant: "destructive" });
      setCreating(false); // keep dialog open for retry
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("property_inspections")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      const wasLastOnPage = rows.length === 1;
      setDeleteTarget(null);
      if (wasLastOnPage && page > 0) {
        setPage((p) => p - 1); // avoid landing on an empty out-of-range page
      } else {
        setRefreshKey((k) => k + 1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Failed to delete inspection", description: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setNewType(TYPE_NONE);
    setNewBuilding("");
    setNewDate("");
    setCreating(false);
    setCreateOpen(true);
  };

  const TypeBadge = ({ type }: { type: string | null }) =>
    type ? (
      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
        {type}
      </Badge>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Inspections</h1>
          <p className="text-sm text-muted-foreground">Manual property inspections and reports.</p>
        </div>
        <Button onClick={openCreate} className="sm:shrink-0">
          <Plus className="h-4 w-4" />
          New Inspection
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search building, owner, phone"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search inspections"
          />
        </div>

        <Select
          value={typeFilter === "" ? TYPE_ALL : typeFilter}
          onValueChange={(v) => setTypeFilter(v === TYPE_ALL ? "" : (v as ReportType))}
        >
          <SelectTrigger aria-label="Filter by inspection type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TYPE_ALL}>All types</SelectItem>
            {REPORT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger aria-label="Sort inspections">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="from-date" className="text-xs text-muted-foreground">From</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-date" className="text-xs text-muted-foreground">To</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {rangeInvalid && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          “From” date must be on or before “To” date.
        </p>
      )}

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : errored && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border py-16 text-center">
            <p className="text-muted-foreground">Couldn’t load inspections.</p>
            <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border py-16 text-center">
            {rangeInvalid ? (
              <p className="text-muted-foreground">Adjust the date range to see inspections.</p>
            ) : hasActiveFilters ? (
              <>
                <p className="text-muted-foreground">No inspections match your filters.</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No inspections yet.</p>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  New Inspection
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table (xl+) */}
            <div className="hidden rounded-md border xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Inspection Date</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const secondary = secondaryLine(row);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.building_name || "Untitled inspection"}</div>
                          {secondary && <div className="text-xs text-muted-foreground">{secondary}</div>}
                        </TableCell>
                        <TableCell><TypeBadge type={row.inspection_type} /></TableCell>
                        <TableCell>{formatINDate(row.inspection_date)}</TableCell>
                        <TableCell>
                          <div>{row.owner_name || "—"}</div>
                          {row.owner_phone && (
                            <div className="text-xs text-muted-foreground">{row.owner_phone}</div>
                          )}
                        </TableCell>
                        <TableCell>{formatINDate(row.updated_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/admin/inspections/${row.id}`)}
                            >
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile / tablet cards (< xl) */}
            <div className="grid grid-cols-1 gap-3 xl:hidden">
              {rows.map((row) => {
                const secondary = secondaryLine(row);
                return (
                  <div key={row.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{row.building_name || "Untitled inspection"}</div>
                        {secondary && <div className="truncate text-xs text-muted-foreground">{secondary}</div>}
                      </div>
                      <TypeBadge type={row.inspection_type} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Inspection Date</dt>
                        <dd>{formatINDate(row.inspection_date)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Last Updated</dt>
                        <dd>{formatINDate(row.updated_at)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-muted-foreground">Owner</dt>
                        <dd>
                          {row.owner_name || "—"}
                          {row.owner_phone && (
                            <span className="text-muted-foreground"> · {row.owner_phone}</span>
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/admin/inspections/${row.id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page + 1}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {errored && !loading && rows.length > 0 && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Something went wrong loading inspections.
          </p>
        )}
      </div>

      {/* New Inspection dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!creating) setCreateOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Inspection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Inspection Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TYPE_NONE}>None</SelectItem>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-building">Building / Property Name</Label>
              <Input
                id="new-building"
                value={newBuilding}
                onChange={(e) => setNewBuilding(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-date">Inspection Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{deleteTarget?.building_name || "Untitled inspection"}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the inspection and its inspection data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
