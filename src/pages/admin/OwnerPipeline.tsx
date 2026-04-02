import { useState, useEffect, useMemo, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Search, MoreHorizontal, X, Inbox, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface ConflictItem {
  type: "inspection" | "visit";
  label: string;
  time: string;
}

const toIST12 = (utcStr: string) => {
  const d = new Date(utcStr);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
};

const STAGES = [
  { label: "New", value: "draft" },
  { label: "Inspection Requested", value: "inspection_proposed" },
  { label: "Inspection Scheduled", value: "inspection_scheduled" },
  { label: "Inspected", value: "inspected" },
  { label: "Agreement In Progress", value: "agreement_pending" },
  { label: "Listed", value: "listed" },
] as const;

type StageValue = (typeof STAGES)[number]["value"];

const STAGE_AT_COLUMN: Record<string, string> = {
  draft: "created_at",
  inspection_proposed: "inspection_proposed_at",
  inspection_accepted: "inspection_accepted_at",
  inspection_scheduled: "inspection_scheduled_at",
  inspected: "inspected_at",
  agreement_pending: "agreement_pending_at",
  listed: "listed_at",
};

interface PropertyRow {
  id: string;
  status: string;
  building_name: string;
  locality: string | null;
  city: string;
  created_at: string;
  listed_at: string | null;
  inspection_proposed_at: string | null;
  inspection_accepted_at: string | null;
  inspection_scheduled_at: string | null;
  inspected_at: string | null;
  agreement_pending_at: string | null;
  inspection_date: string | null;
  inspection_start_time: string | null;
  inspection_end_time: string | null;
  inspection_notes: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  owner_id: string;
}

const TIME_OPTIONS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

const formatTime12 = (t: string) => {
  const [h] = t.split(":");
  const hour = parseInt(h);
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  return hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
};

const STATUS_ACTIONS: { label: string; to: StageValue; atCol: string }[] = [
  { label: "Request Inspection Time", to: "inspection_proposed", atCol: "inspection_proposed_at" },
  { label: "Schedule Inspection", to: "inspection_scheduled", atCol: "inspection_scheduled_at" },
  { label: "Mark Inspected", to: "inspected", atCol: "inspected_at" },
  { label: "Move to Agreement", to: "agreement_pending", atCol: "agreement_pending_at" },
  { label: "Mark Listed", to: "listed", atCol: "listed_at" },
];

export default function OwnerPipeline() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const [data, setData] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StageValue>("draft");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailDrawer, setDetailDrawer] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Propose Inspection modal state
  const [proposeModalId, setProposeModalId] = useState<string | null>(null);
  const [proposeDate, setProposeDate] = useState("");
  const [proposeStart, setProposeStart] = useState("");
  const [proposeEnd, setProposeEnd] = useState("");
  const [proposeNotes, setProposeNotes] = useState("");
  const [proposeLoading, setProposeLoading] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user) return;

    const { data: rows, error: err } = await supabase
      .from("properties")
      .select(`
        id,
        status,
        building_name,
        locality,
        city,
        created_at,
        listed_at,
        inspection_date,
        inspection_start_time,
        inspection_end_time,
        inspection_notes,
        draft_at,
        inspection_proposed_at,
        inspection_accepted_at,
        inspection_scheduled_at,
        inspected_at,
        agreement_pending_at,
        owner:users!properties_owner_id_fkey(full_name, email, phone)
      `);

    if (err) {
      setError("Failed to load properties. Please try again.");
      setLoading(false);
      return;
    }

    const mapped: PropertyRow[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      building_name: r.building_name,
      locality: r.locality,
      city: r.city,
      created_at: r.created_at,
      listed_at: r.listed_at,
      inspection_proposed_at: r.inspection_proposed_at,
      inspection_accepted_at: r.inspection_accepted_at,
      inspection_scheduled_at: r.inspection_scheduled_at,
      inspected_at: r.inspected_at,
      agreement_pending_at: r.agreement_pending_at,
      inspection_date: r.inspection_date,
      inspection_start_time: r.inspection_start_time,
      inspection_end_time: r.inspection_end_time,
      inspection_notes: r.inspection_notes,
      owner_id: r.owner_id ?? "",
      owner_name: r.owner?.full_name ?? "",
      owner_email: r.owner?.email ?? null,
      owner_phone: r.owner?.phone ?? null,
    }));

    setData(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (!authLoading && user) fetchData(); }, [fetchData, authLoading, user]);

  const daysSince = (row: PropertyRow) => {
    const atCol = STAGE_AT_COLUMN[row.status];
    const dateStr = (row as any)[atCol] || row.created_at;
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    return `${d} day${d !== 1 ? "s" : ""}`;
  };

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s.value] = 0));
    data.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });
    return counts;
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data.filter((r) => r.status === activeTab);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        r.owner_name.toLowerCase().includes(q) ||
        r.building_name.toLowerCase().includes(q) ||
        (r.locality ?? "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) rows = rows.filter((r) => r.created_at >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.created_at <= dateTo + "T23:59:59");
    return rows;
  }, [data, activeTab, searchQuery, statusFilter, dateFrom, dateTo]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.id)));
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const updateStatus = async (ids: string[], newStatus: StageValue, atCol: string) => {
    const updatePayload: any = { status: newStatus, [atCol]: new Date().toISOString() };
    const { error: err } = await supabase.from("properties").update(updatePayload).in("id", ids);
    if (err) {
      toast({ title: "Update failed. Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Status updated successfully" });
    await fetchData();
    setSelected(new Set());
  };

  const handleAction = (rowId: string, action: typeof STATUS_ACTIONS[number]) => {
    if (action.to === "inspection_proposed") {
      setProposeModalId(rowId);
      setProposeDate("");
      setProposeStart("");
      setProposeEnd("");
      setProposeNotes("");
      setProposeError(null);
    } else {
      updateStatus([rowId], action.to, action.atCol);
    }
  };

  const handleProposeSubmit = async () => {
    if (!proposeModalId || !proposeDate || !proposeStart || !proposeEnd) return;
    setProposeLoading(true);
    setProposeError(null);

    const { error: err } = await supabase.from("properties").update({
      inspection_date: proposeDate,
      inspection_start_time: proposeStart,
      inspection_end_time: proposeEnd,
      inspection_notes: proposeNotes || null,
      status: "inspection_proposed" as any,
      inspection_proposed_at: new Date().toISOString(),
    }).eq("id", proposeModalId);

    if (err) {
      setProposeError("Failed to propose inspection. Please try again.");
      setProposeLoading(false);
      return;
    }

    toast({ title: "Inspection time proposed" });
    setProposeModalId(null);
    setProposeLoading(false);
    await fetchData();
  };

  const handleBulkAction = async (newStatus: StageValue, atCol: string) => {
    setBulkLoading(true);
    await updateStatus(Array.from(selected), newStatus, atCol);
    setBulkLoading(false);
  };

  const drawerOwner = useMemo(() => {
    if (!detailDrawer) return null;
    const row = data.find((r) => r.id === detailDrawer);
    if (!row) return null;
    const ownerProps = data.filter((r) => r.owner_id === row.owner_id);
    return { ...row, properties: ownerProps };
  }, [detailDrawer, data]);

  const formatInspectionDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Owner Pipeline</h1>

        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search owner, building, locality…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 min-h-[44px]" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 min-h-[44px]"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="min-h-[44px] w-full sm:w-auto" placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="min-h-[44px] w-full sm:w-auto" placeholder="To" />
          </div>
        </div>

        {/* Stage tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STAGES.map((stage) => (
            <button
              key={stage.value}
              onClick={() => { setActiveTab(stage.value); setSelected(new Set()); }}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === stage.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {stage.label}
              <Badge variant={activeTab === stage.value ? "secondary" : "outline"} className="ml-1 text-xs">
                {stageCounts[stage.value] ?? 0}
              </Badge>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        )}

        {loading && (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No owners in this stage yet.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead>Building Name</TableHead>
                  <TableHead className="hidden md:table-cell">Locality</TableHead>
                  <TableHead className="hidden lg:table-cell">Date Added</TableHead>
                  <TableHead>Days in Stage</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      const tag = (e.target as HTMLElement).closest("button, [role=menuitem], [role=checkbox]");
                      if (!tag) navigate(`/admin/properties/${row.id}`);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} aria-label={`Select ${row.owner_name}`} />
                    </TableCell>
                    <TableCell className="font-medium">{row.owner_name || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{row.owner_phone || "—"}</TableCell>
                    <TableCell>{row.building_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{row.locality || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>{daysSince(row)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {STATUS_ACTIONS.map((a) => (
                            <DropdownMenuItem key={a.to} onClick={() => handleAction(row.id, a)} className="min-h-[44px]">
                              {a.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
            <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
            <Button size="sm" className="min-h-[44px]" disabled={bulkLoading} onClick={() => handleBulkAction("inspection_proposed", "inspection_proposed_at")}>
              Propose Inspection Time
            </Button>
            <Button size="sm" className="min-h-[44px]" disabled={bulkLoading} onClick={() => handleBulkAction("inspection_scheduled", "inspection_scheduled_at")}>
              Schedule Inspection
            </Button>
          </div>
        )}

        {/* Propose Inspection Modal */}
        <Dialog open={!!proposeModalId} onOpenChange={(o) => !o && setProposeModalId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Propose Inspection Time</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground">Inspection Date</label>
                <Input type="date" value={proposeDate} onChange={(e) => setProposeDate(e.target.value)} className="mt-1 min-h-[44px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">From</label>
                  <Select value={proposeStart} onValueChange={setProposeStart}>
                    <SelectTrigger className="mt-1 min-h-[44px]"><SelectValue placeholder="Start time" /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{formatTime12(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">To</label>
                  <Select value={proposeEnd} onValueChange={setProposeEnd}>
                    <SelectTrigger className="mt-1 min-h-[44px]"><SelectValue placeholder="End time" /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{formatTime12(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Notes (optional)</label>
                <Textarea value={proposeNotes} onChange={(e) => setProposeNotes(e.target.value)} className="mt-1" rows={3} />
              </div>
              {proposeError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{proposeError}</div>
              )}
              <Button
                className="w-full min-h-[44px]"
                disabled={!proposeDate || !proposeStart || !proposeEnd || proposeLoading}
                onClick={handleProposeSubmit}
              >
                {proposeLoading ? "Saving…" : "Confirm & Propose"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail drawer */}
        <Sheet open={!!detailDrawer} onOpenChange={(o) => !o && setDetailDrawer(null)}>
          <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
            {drawerOwner && (
              <div className="space-y-5 pt-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{drawerOwner.owner_name || "Owner"}</h2>
                  <p className="text-sm text-muted-foreground">{drawerOwner.owner_email || "No email"}</p>
                  <p className="text-sm text-muted-foreground">{drawerOwner.owner_phone || "No phone"}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Properties</h3>
                  <div className="space-y-3">
                    {drawerOwner.properties.map((p) => (
                      <div key={p.id} className="rounded-md border p-3 space-y-1">
                        <p className="text-sm font-medium text-foreground">{p.building_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.locality ? `${p.locality}, ` : ""}{p.city}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{p.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Added {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {p.listed_at && (
                            <span className="text-xs text-muted-foreground">
                              Listed {new Date(p.listed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        {p.inspection_date && (
                          <div className="mt-2 rounded bg-muted p-2 space-y-0.5">
                            <p className="text-xs font-medium text-foreground">
                              Inspection Slot: {formatInspectionDate(p.inspection_date)}
                              {p.inspection_start_time && p.inspection_end_time && (
                                <> · {formatTime12(p.inspection_start_time)} – {formatTime12(p.inspection_end_time)}</>
                              )}
                            </p>
                            {p.inspection_notes && (
                              <p className="text-xs text-muted-foreground">Notes: {p.inspection_notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
