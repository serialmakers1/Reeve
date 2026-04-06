import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  Phone,
  MessageCircle,
  Send,
  MoreHorizontal,
  Inbox,
  FileText,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CALLBACK_SLOT_LABELS } from "@/components/RequestCallbackModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallbackRow {
  id: string;
  user_id: string;
  intent: "owner" | "tenant";
  name: string;
  phone: string | null;
  is_international: boolean;
  contact_channel: string;
  contact_handle: string | null;
  timezone: string | null;
  preferred_date: string;
  preferred_slot: string;
  preferred_datetime_ist: string | null;
  property_id: string | null;
  status: string;
  admin_notes: string | null;
  called_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user: { full_name: string | null; phone: string | null } | null;
  property: { building_name: string | null; locality: string | null } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: "Pending", value: "pending" },
  { label: "Called", value: "called" },
  { label: "Completed", value: "completed" },
  { label: "Missed", value: "missed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "all" },
] as const;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  called: { label: "Called", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  missed: { label: "Missed", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

// Slot sort order for client-side ordering within a date group
const SLOT_ORDER = [
  "asap", "09_10", "10_11", "11_12", "12_13", "13_14",
  "14_15", "15_16", "16_17", "17_18", "18_19", "19_20", "02_03",
];

const CHANNEL_LABELS: Record<string, string> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  botim: "Botim",
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  phone: <Phone className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  telegram: <Send className="h-3.5 w-3.5" />,
  botim: <Phone className="h-3.5 w-3.5" />,
};

// ─── IST helpers (matches VisitLogs.tsx pattern) ──────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toIST(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + IST_OFFSET_MS);
}

function slotSortIndex(slot: string): number {
  const i = SLOT_ORDER.indexOf(slot);
  return i === -1 ? 99 : i;
}

function timeAgo(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return format(new Date(isoString), "MMM d");
}

function formatCallbackTime(cb: CallbackRow): string {
  // International: use preferred_datetime_ist if available
  if (cb.preferred_datetime_ist) {
    const ist = toIST(new Date(cb.preferred_datetime_ist));
    if (cb.preferred_slot === "02_03") {
      return format(ist, "EEE MMM d") + ", 2:00–3:00 AM IST";
    }
    return format(ist, "EEE MMM d, h:mm a") + " IST";
  }
  // India: date + slot label
  if (cb.preferred_date && cb.preferred_slot) {
    const dateObj = new Date(cb.preferred_date + "T00:00:00");
    const dateLabel = format(dateObj, "EEE MMM d");
    if (cb.preferred_slot === "asap") return `${dateLabel}, ASAP`;
    return `${dateLabel}, ${CALLBACK_SLOT_LABELS[cb.preferred_slot] ?? cb.preferred_slot}`;
  }
  return "—";
}

function contactDisplay(cb: CallbackRow): string {
  if (cb.is_international && cb.contact_handle) return cb.contact_handle;
  return cb.phone ?? cb.user?.phone ?? "—";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Callbacks() {
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });

  // Data
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [filterIntent, setFilterIntent] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  // Sheet
  const [sheetCb, setSheetCb] = useState<CallbackRow | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: "missed" | "cancelled";
    id: string;
  } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("callback_requests")
      .select(`
        id, user_id, intent, name, phone,
        is_international, contact_channel, contact_handle,
        timezone, preferred_date, preferred_slot, preferred_datetime_ist,
        property_id, status, admin_notes, called_at, completed_at,
        created_at, updated_at,
        user:users!callback_requests_user_id_fkey (
          full_name, phone
        ),
        property:properties!callback_requests_property_id_fkey (
          building_name, locality
        )
      `)
      .order("preferred_date", { ascending: true })
      .order("created_at", { ascending: true });

    setCallbacks((data as CallbackRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [fetchData, authLoading, user]);

  // ── Update helpers ─────────────────────────────────────────────────────────

  const showSaved = () => {
    setSaveState("saved");
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setSaveState("idle"), 2000);
  };

  const updateCallback = useCallback(
    async (id: string, patch: Record<string, any>) => {
      setSaveState("saving");
      await (supabase as any)
        .from("callback_requests")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      showSaved();
      await fetchData();
      setSheetCb((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
    },
    [fetchData]
  );

  const handleMarkCalled = (id: string) =>
    updateCallback(id, { status: "called", called_at: new Date().toISOString() });

  const handleMarkCompleted = (id: string) =>
    updateCallback(id, { status: "completed", completed_at: new Date().toISOString() });

  const handleConfirmDestructive = () => {
    if (!confirmAction) return;
    updateCallback(confirmAction.id, { status: confirmAction.type });
    setConfirmAction(null);
  };

  const handleSaveNote = (id: string, notes: string) =>
    updateCallback(id, { admin_notes: notes || null });

  // ── Computed values ────────────────────────────────────────────────────────

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: callbacks.length };
    STATUS_TABS.forEach((t) => {
      if (t.value !== "all") counts[t.value] = 0;
    });
    callbacks.forEach((cb) => {
      if (counts[cb.status] !== undefined) counts[cb.status]++;
    });
    return counts;
  }, [callbacks]);

  const filtered = useMemo(() => {
    let rows = callbacks;

    if (activeTab !== "all") rows = rows.filter((cb) => cb.status === activeTab);
    if (filterIntent !== "all") rows = rows.filter((cb) => cb.intent === filterIntent);
    if (filterType !== "all")
      rows = rows.filter((cb) =>
        filterType === "international" ? cb.is_international : !cb.is_international
      );
    if (filterChannel !== "all")
      rows = rows.filter((cb) => cb.contact_channel === filterChannel);
    if (filterFrom)
      rows = rows.filter((cb) => cb.preferred_date >= filterFrom);
    if (filterTo)
      rows = rows.filter((cb) => cb.preferred_date <= filterTo);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (cb) =>
          cb.name.toLowerCase().includes(q) ||
          (cb.phone ?? "").includes(q) ||
          (cb.contact_handle ?? "").toLowerCase().includes(q)
      );
    }

    // Sort: preferred_date ASC, then slot order within same date
    return [...rows].sort((a, b) => {
      const dc = (a.preferred_date ?? "").localeCompare(b.preferred_date ?? "");
      if (dc !== 0) return dc;
      return slotSortIndex(a.preferred_slot) - slotSortIndex(b.preferred_slot);
    });
  }, [callbacks, activeTab, filterIntent, filterType, filterChannel, filterFrom, filterTo, search]);

  // ── Row action availability ────────────────────────────────────────────────

  const canMarkCalled = (status: string) => status === "pending";
  const canMarkCompleted = (status: string) => status === "called";
  const canMarkMissed = (status: string) =>
    status === "pending" || status === "called";
  const canCancel = (status: string) =>
    status === "pending" || status === "called";

  // ── Empty state label ──────────────────────────────────────────────────────

  const emptyLabel = () => {
    if (activeTab === "all") return "No callback requests yet.";
    const tab = STATUS_TABS.find((t) => t.value === activeTab);
    return `No ${tab?.label.toLowerCase() ?? activeTab} callbacks.`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Callback Requests</h1>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
              <Badge
                variant={activeTab === tab.value ? "secondary" : "outline"}
                className="ml-1 text-xs"
              >
                {tabCounts[tab.value] ?? 0}
              </Badge>
            </button>
          ))}
        </div>

        {/* Additional filters */}
        <div className="flex flex-wrap gap-2">
          <Input
            type="text"
            placeholder="Search name, phone, handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 min-w-[200px] flex-1"
          />
          <Select value={filterIntent} onValueChange={setFilterIntent}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Intent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All intents</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="india">India</SelectItem>
              <SelectItem value="international">International</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="botim">Botim</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="h-9 w-[140px]"
            title="From date"
          />
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="h-9 w-[140px]"
            title="To date"
          />
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="mb-3 h-12 w-12 opacity-40" />
            <p className="text-sm">{emptyLabel()}</p>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead className="hidden md:table-cell">Channel</TableHead>
                  <TableHead>Callback time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Property</TableHead>
                  <TableHead className="hidden md:table-cell">Requested</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cb) => {
                  const statusStyle =
                    STATUS_STYLE[cb.status] ?? STATUS_STYLE.pending;

                  return (
                    <TableRow
                      key={cb.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSheetCb(cb);
                        setNoteText(cb.admin_notes ?? "");
                      }}
                    >
                      {/* Name */}
                      <TableCell className="font-medium">
                        {cb.name}
                        {cb.is_international && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            🌐
                          </span>
                        )}
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {contactDisplay(cb)}
                      </TableCell>

                      {/* Intent */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            cb.intent === "owner"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {cb.intent === "owner" ? "Owner" : "Tenant"}
                        </span>
                      </TableCell>

                      {/* Channel */}
                      <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          {CHANNEL_ICON[cb.contact_channel]}
                          {CHANNEL_LABELS[cb.contact_channel] ?? cb.contact_channel}
                        </span>
                      </TableCell>

                      {/* Callback time */}
                      <TableCell className="text-sm">
                        {formatCallbackTime(cb)}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}
                        >
                          {statusStyle.label}
                        </span>
                      </TableCell>

                      {/* Property */}
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {cb.property
                          ? [cb.property.building_name, cb.property.locality]
                              .filter(Boolean)
                              .join(" · ")
                          : "—"}
                      </TableCell>

                      {/* Requested at */}
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {timeAgo(cb.created_at)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="text-right"
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!canMarkCalled(cb.status)}
                              onClick={() => handleMarkCalled(cb.id)}
                            >
                              Mark as Called
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canMarkCompleted(cb.status)}
                              onClick={() => handleMarkCompleted(cb.id)}
                            >
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canMarkMissed(cb.status)}
                              onClick={() =>
                                setConfirmAction({ type: "missed", id: cb.id })
                              }
                            >
                              Mark as Missed
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSheetCb(cb);
                                setNoteText(cb.admin_notes ?? "");
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              {cb.admin_notes ? "Edit Note" : "Add Note"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!canCancel(cb.status)}
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setConfirmAction({ type: "cancelled", id: cb.id })
                              }
                            >
                              Cancel Request
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail sheet */}
        <Sheet
          open={!!sheetCb}
          onOpenChange={(o) => !o && setSheetCb(null)}
        >
          <SheetContent side="right" className="w-96 overflow-y-auto">
            {sheetCb && (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-lg">{sheetCb.name}</SheetTitle>
                    {saveState !== "idle" && (
                      <span className="text-xs text-muted-foreground">
                        {saveState === "saving" ? "Saving..." : "Saved ✓"}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 text-sm text-muted-foreground">
                    <p>{contactDisplay(sheetCb)}</p>
                    {sheetCb.timezone && <p>{sheetCb.timezone}</p>}
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Request details */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      Request Details
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Intent</span>
                        <p className="font-medium capitalize">{sheetCb.intent}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type</span>
                        <p>{sheetCb.is_international ? "International" : "India"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Channel</span>
                        <p>{CHANNEL_LABELS[sheetCb.contact_channel] ?? sheetCb.contact_channel}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status</span>
                        <p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_STYLE[sheetCb.status]?.className ?? ""
                            }`}
                          >
                            {STATUS_STYLE[sheetCb.status]?.label ?? sheetCb.status}
                          </span>
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Callback time</span>
                        <p className="font-medium">{formatCallbackTime(sheetCb)}</p>
                      </div>
                      {sheetCb.called_at && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Called at</span>
                          <p>
                            {format(
                              toIST(new Date(sheetCb.called_at)),
                              "d MMM yyyy, h:mm a"
                            )}{" "}
                            IST
                          </p>
                        </div>
                      )}
                      {sheetCb.completed_at && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Completed at</span>
                          <p>
                            {format(
                              toIST(new Date(sheetCb.completed_at)),
                              "d MMM yyyy, h:mm a"
                            )}{" "}
                            IST
                          </p>
                        </div>
                      )}
                      {sheetCb.property && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Property</span>
                          <p>
                            {[
                              sheetCb.property.building_name,
                              sheetCb.property.locality,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Requested</span>
                        <p>
                          {format(
                            toIST(new Date(sheetCb.created_at)),
                            "d MMM yyyy, h:mm a"
                          )}{" "}
                          IST
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status actions */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      Actions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[44px]"
                        disabled={!canMarkCalled(sheetCb.status)}
                        onClick={() => handleMarkCalled(sheetCb.id)}
                      >
                        Mark Called
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[44px]"
                        disabled={!canMarkCompleted(sheetCb.status)}
                        onClick={() => handleMarkCompleted(sheetCb.id)}
                      >
                        Mark Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[44px]"
                        disabled={!canMarkMissed(sheetCb.status)}
                        onClick={() =>
                          setConfirmAction({ type: "missed", id: sheetCb.id })
                        }
                      >
                        Mark Missed
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="min-h-[44px]"
                        disabled={!canCancel(sheetCb.status)}
                        onClick={() =>
                          setConfirmAction({
                            type: "cancelled",
                            id: sheetCb.id,
                          })
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>

                  {/* Admin notes */}
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">
                      Admin notes
                    </label>
                    <Textarea
                      rows={4}
                      placeholder="Add internal notes about this callback..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onBlur={() => handleSaveNote(sheetCb.id, noteText)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.metaKey) {
                          handleSaveNote(sheetCb.id, noteText);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Saves on blur or ⌘Enter
                    </p>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Confirm dialog for destructive actions */}
        <AlertDialog
          open={!!confirmAction}
          onOpenChange={(o) => !o && setConfirmAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.type === "cancelled"
                  ? "Cancel this request?"
                  : "Mark as missed?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.type === "cancelled"
                  ? "The callback will be marked as cancelled. The user will need to submit a new request."
                  : "This will mark the callback as missed. You can update the status again if needed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">
                Go back
              </AlertDialogCancel>
              <AlertDialogAction
                className={`min-h-[44px] ${
                  confirmAction?.type === "cancelled"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }`}
                onClick={handleConfirmDestructive}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
