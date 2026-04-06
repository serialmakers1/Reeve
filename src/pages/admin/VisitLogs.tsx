import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  ScrollText,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitLogRow {
  id: string;
  visit_id: string;
  event_type: string;
  initiated_by: string;
  scheduled_at: string | null;
  notes: string | null;
  note_type: string | null;
  created_at: string;
  tenant: { full_name: string | null; phone: string | null } | null;
  property: {
    building_name: string | null;
    locality: string | null;
    city: string | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toIST(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + IST_OFFSET_MS);
}

function formatIST(iso: string): string {
  return format(toIST(new Date(iso)), "d MMM yyyy, h:mm a");
}

function truncate(text: string | null, max = 40): string {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

type EventType =
  | "scheduled"
  | "rescheduled"
  | "cancelled"
  | "no_show"
  | "completed";

const ALL_EVENT_TYPES: EventType[] = [
  "scheduled",
  "rescheduled",
  "cancelled",
  "no_show",
  "completed",
];

const EVENT_LABELS: Record<EventType, string> = {
  scheduled: "Scheduled",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  no_show: "No-Show",
  completed: "Completed",
};

// ─── Event badge ──────────────────────────────────────────────────────────────

function EventBadge({ type }: { type: string }) {
  const classMap: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 border-blue-200",
    rescheduled: "bg-amber-100 text-amber-800 border-amber-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    no_show: "bg-red-100 text-red-800 border-red-200",
    completed: "bg-green-100 text-green-800 border-green-200",
  };
  const label = EVENT_LABELS[type as EventType] ?? type;
  return (
    <Badge
      variant="outline"
      className={`text-[11px] ${classMap[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {label}
    </Badge>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Tenant stats (computed from all rows) ────────────────────────────────────

function TenantStats({
  tenantId,
  allRows,
}: {
  tenantId: string | null;
  allRows: VisitLogRow[];
}) {
  if (!tenantId) return null;
  // Find tenant rows by matching tenant full_name isn't unique enough;
  // match by visit_id set belonging to this tenant across all events
  // We don't have tenant_id on the fetched row, so match by full_name
  // Actually we need to find rows that belong to the same tenant.
  // Since we don't store tenant_id in the fetched shape, use full_name as proxy.
  // But full_name is not guaranteed unique. Better: match by visit_id set.
  // The detail panel passes the row itself, so we can match by row.tenant.full_name.
  // This is approximate — for a real system tenant_id would be better.
  // We'll use it since it's the data we have.
  return null; // computed in parent where we have the row
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VisitLogs() {
  const { loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const [rows, setRows] = useState<VisitLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(
    new Set(ALL_EVENT_TYPES)
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [initiatedBy, setInitiatedBy] = useState("all");

  // Detail sheet
  const [selectedRow, setSelectedRow] = useState<VisitLogRow | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("visit_events")
      .select(
        `id, visit_id, event_type, initiated_by, scheduled_at, notes,
         note_type, created_at,
         tenant:users!visit_events_tenant_id_fkey(full_name, phone),
         property:properties!visit_events_property_id_fkey(
           building_name, locality, city
         )`
      )
      .order("created_at", { ascending: false });

    setRows((data as unknown as VisitLogRow[]) ?? []);
    setLoading(false);
  };

  // ─── Client-side filtering ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // Event type
      if (!selectedTypes.has(r.event_type as EventType)) return false;

      // Date from
      if (dateFrom) {
        const rowDate = new Date(r.created_at);
        const from = new Date(dateFrom + "T00:00:00");
        if (rowDate < from) return false;
      }

      // Date to
      if (dateTo) {
        const rowDate = new Date(r.created_at);
        const to = new Date(dateTo + "T23:59:59");
        if (rowDate > to) return false;
      }

      // Tenant search
      if (tenantSearch.trim()) {
        const name = r.tenant?.full_name?.toLowerCase() ?? "";
        if (!name.includes(tenantSearch.trim().toLowerCase())) return false;
      }

      // Property search
      if (propertySearch.trim()) {
        const bname = r.property?.building_name?.toLowerCase() ?? "";
        if (!bname.includes(propertySearch.trim().toLowerCase())) return false;
      }

      // Initiated by
      if (initiatedBy !== "all" && r.initiated_by !== initiatedBy) return false;

      return true;
    });
  }, [
    rows,
    selectedTypes,
    dateFrom,
    dateTo,
    tenantSearch,
    propertySearch,
    initiatedBy,
  ]);

  // ─── Tenant all-time stats from full rows ─────────────────────────────────

  function getTenantStats(row: VisitLogRow) {
    const tenantName = row.tenant?.full_name;
    if (!tenantName) return null;
    const tenantRows = rows.filter(
      (r) => r.tenant?.full_name === tenantName
    );
    const uniqueVisitIds = new Set(tenantRows.map((r) => r.visit_id));
    const countByType = (type: string) =>
      tenantRows.filter((r) => r.event_type === type).length;
    return {
      totalEvents: tenantRows.length,
      uniqueVisits: uniqueVisitIds.size,
      completed: countByType("completed"),
      missed: countByType("no_show"),
      cancelled: countByType("cancelled"),
      rescheduled: countByType("rescheduled"),
    };
  }

  // ─── Toggle event type ────────────────────────────────────────────────────

  const toggleType = (type: EventType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const allSelected = selectedTypes.size === ALL_EVENT_TYPES.length;
  const toggleAll = () => {
    if (allSelected) {
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes(new Set(ALL_EVENT_TYPES));
    }
  };

  if (authLoading) return null;

  const stats = selectedRow ? getTenantStats(selectedRow) : null;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Visit Logs</h1>
          <p className="text-sm text-muted-foreground">
            All visit events across tenants and properties
          </p>
        </div>

        {/* Filter bar */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Event type checkboxes */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
              Event
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs text-foreground">All</span>
            </label>
            {ALL_EVENT_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <Checkbox
                  checked={selectedTypes.has(type)}
                  onCheckedChange={() => toggleType(type)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs text-foreground">
                  {EVENT_LABELS[type]}
                </span>
              </label>
            ))}
          </div>

          {/* Row 2: date range, search, initiated by */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                From
              </span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">To</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <Input
              placeholder="Search tenant..."
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              className="h-8 text-xs w-40"
            />
            <Input
              placeholder="Search property..."
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              className="h-8 text-xs w-44"
            />
            <Select value={initiatedBy} onValueChange={setInitiatedBy}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-auto bg-card">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Date / Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tenant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <ScrollText className="h-10 w-10 opacity-40" />
                      <p className="text-sm">No visit activity yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedRow(row)}
                  >
                    {/* Date/Time */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatIST(row.created_at)}
                    </td>

                    {/* Event */}
                    <td className="px-4 py-3">
                      <EventBadge type={row.event_type} />
                    </td>

                    {/* Tenant */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {row.tenant?.full_name ?? "—"}
                      </p>
                      {row.tenant?.phone && (
                        <p className="text-xs text-muted-foreground">
                          {row.tenant.phone}
                        </p>
                      )}
                    </td>

                    {/* Property */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground leading-tight">
                        {row.property?.building_name ?? "—"}
                      </p>
                      {row.property?.locality && (
                        <p className="text-xs text-muted-foreground">
                          {row.property.locality}
                        </p>
                      )}
                    </td>

                    {/* By */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          row.initiated_by === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.initiated_by === "admin" ? "Admin" : "Tenant"}
                      </Badge>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px]">
                      {truncate(row.notes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Row count */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
              {filtered.length !== rows.length && ` (filtered from ${rows.length})`}
            </div>
          )}
        </div>
      </div>

      {/* Detail sheet */}
      <Sheet
        open={!!selectedRow}
        onOpenChange={(v) => { if (!v) setSelectedRow(null); }}
      >
        <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
          {selectedRow && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <EventBadge type={selectedRow.event_type} />
                  <span className="text-base">Event Detail</span>
                </SheetTitle>
              </SheetHeader>

              {/* Core details */}
              <div className="space-y-3 text-sm">
                <DetailRow label="Date / Time" value={formatIST(selectedRow.created_at)} />
                <DetailRow label="Initiated by" value={selectedRow.initiated_by === "admin" ? "Admin" : "Tenant"} />
                {selectedRow.scheduled_at && (
                  <DetailRow
                    label="Scheduled for"
                    value={formatIST(selectedRow.scheduled_at)}
                  />
                )}
                <DetailRow label="Visit ID" value={selectedRow.visit_id} mono />
                {selectedRow.note_type && (
                  <DetailRow label="Note type" value={selectedRow.note_type} />
                )}
              </div>

              {/* Tenant */}
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tenant
                </p>
                <DetailRow
                  label="Name"
                  value={selectedRow.tenant?.full_name ?? "—"}
                />
                <DetailRow
                  label="Phone"
                  value={selectedRow.tenant?.phone ?? "—"}
                />
              </div>

              {/* Property */}
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Property
                </p>
                <DetailRow
                  label="Building"
                  value={selectedRow.property?.building_name ?? "—"}
                />
                <DetailRow
                  label="Locality"
                  value={selectedRow.property?.locality ?? "—"}
                />
                <DetailRow
                  label="City"
                  value={selectedRow.property?.city ?? "—"}
                />
              </div>

              {/* Tenant stats */}
              {stats && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Tenant all-time stats
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Total visits" value={stats.uniqueVisits} />
                    <StatCard label="Completed" value={stats.completed} color="text-green-700" />
                    <StatCard label="Missed" value={stats.missed} color="text-red-600" />
                    <StatCard label="Cancelled" value={stats.cancelled} color="text-red-500" />
                    <StatCard label="Rescheduled" value={stats.rescheduled} color="text-amber-600" />
                    <StatCard label="Log entries" value={stats.totalEvents} />
                  </div>
                </div>
              )}

              {/* Full notes */}
              {selectedRow.notes && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3">
                    {selectedRow.notes}
                  </p>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}

// ─── Small detail components ──────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-foreground text-right break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
      <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
        {label}
      </p>
    </div>
  );
}
