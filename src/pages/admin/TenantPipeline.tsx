import { useState, useEffect, useMemo, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Inbox, ChevronRight, AlertTriangle, Info, Pencil, X,
  ShieldOff, Loader2,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_TABS = [
  { label: "New", statuses: ["draft", "submitted"] },
  { label: "Platform Review", statuses: ["platform_review"] },
  { label: "Rejected by Platform", statuses: ["platform_rejected"] },
  { label: "Sent to Owner", statuses: ["sent_to_owner"] },
  { label: "Owner Actioned", statuses: ["owner_accepted", "owner_rejected", "owner_countered", "tenant_countered"] },
  { label: "Payment", statuses: ["payment_pending", "payment_received"] },
  { label: "KYC", statuses: ["kyc_pending", "kyc_passed", "kyc_failed"] },
  { label: "Agreement", statuses: ["agreement_pending"] },
  { label: "Active", statuses: ["lease_active"] },
  { label: "Closed", statuses: ["withdrawn", "expired", "on_hold"] },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  platform_review: "Under Review",
  sent_to_owner: "Sent to Owner",
  owner_accepted: "Owner Accepted",
  owner_rejected: "Owner Rejected",
  owner_countered: "Owner Countered",
  payment_pending: "Payment Pending",
  payment_received: "Payment Received",
  kyc_pending: "KYC Pending",
  kyc_passed: "KYC Passed",
  kyc_failed: "KYC Failed",
  agreement_pending: "Agreement Pending",
  lease_active: "Active Tenant",
  platform_rejected: "Rejected by Platform",
  tenant_countered: "Tenant Countered",
  on_hold: "On Hold",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  platform_review: "bg-amber-100 text-amber-800",
  sent_to_owner: "bg-indigo-100 text-indigo-800",
  owner_accepted: "bg-green-100 text-green-800",
  owner_rejected: "bg-red-100 text-red-800",
  owner_countered: "bg-orange-100 text-orange-800",
  payment_pending: "bg-amber-100 text-amber-800",
  payment_received: "bg-green-100 text-green-800",
  kyc_pending: "bg-amber-100 text-amber-800",
  kyc_passed: "bg-green-100 text-green-800",
  kyc_failed: "bg-red-100 text-red-800",
  agreement_pending: "bg-purple-100 text-purple-800",
  lease_active: "bg-green-100 text-green-800",
  platform_rejected: "bg-red-100 text-red-700",
  tenant_countered: "bg-orange-100 text-orange-800",
  on_hold: "bg-amber-100 text-amber-800",
  withdrawn: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantProfile {
  no_show_count: number;
  visit_priority_low: boolean | null;
  visit_scheduling_blocked: boolean;
  admin_notes: string | null;
}

interface AppRow {
  id: string;
  tenant_id: string;
  status: string;
  monthly_income: number | null;
  proposed_rent: number;
  income_check_passed: boolean | null;
  platform_approved: boolean | null;
  submitted_at: string | null;
  created_at: string;
  cibil_range: string | null;
  tenant: {
    full_name: string;
    email: string | null;
    phone: string | null;
    profile: TenantProfile | null;
  } | null;
  property: {
    building_name: string;
    locality: string | null;
    listed_rent: number;
    bhk: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isIncomeFlagged = (app: AppRow) =>
  app.monthly_income && app.property?.listed_rent
    ? app.monthly_income < app.property.listed_rent * 2.5
    : false;

const formatCurrency = (n: number | null) =>
  n != null ? `₹${n.toLocaleString("en-IN")}` : "—";

// ─── No-show badge component ──────────────────────────────────────────────────

function NoShowBadges({ profile }: { profile: TenantProfile | null | undefined }) {
  if (!profile) return null;
  const { no_show_count, visit_scheduling_blocked, visit_priority_low } = profile;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-0.5">
      {visit_scheduling_blocked ? (
        <Badge
          variant="outline"
          className="text-[10px] bg-red-100 text-red-800 border-red-200"
        >
          Blocked
        </Badge>
      ) : no_show_count >= 2 ? (
        <Badge
          variant="outline"
          className="text-[10px] bg-amber-100 text-amber-800 border-amber-200"
        >
          ⚠ {no_show_count} no-shows
        </Badge>
      ) : no_show_count === 1 ? (
        <Badge
          variant="outline"
          className="text-[10px] bg-muted text-muted-foreground"
        >
          1 no-show
        </Badge>
      ) : null}
      {!visit_scheduling_blocked && visit_priority_low && (
        <span className="text-[10px] text-amber-600 font-medium">
          · Low Priority
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TenantPipeline() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const { toast } = useToast();

  const [data, setData] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer state
  const [selectedRow, setSelectedRow] = useState<AppRow | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (): Promise<AppRow[]> => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("applications")
      .select(`
        id, tenant_id, status, monthly_income, proposed_rent,
        income_check_passed, platform_approved, cibil_range,
        submitted_at, created_at,
        tenant:users!applications_tenant_id_fkey(
          full_name, email, phone,
          profile:profiles!profiles_user_id_fkey(
            no_show_count, visit_priority_low,
            visit_scheduling_blocked, admin_notes
          )
        ),
        property:properties!applications_property_id_fkey(
          building_name, locality, listed_rent, bhk
        )
      `)
      .order("created_at", { ascending: false });

    if (err) {
      setError("Failed to load applications.");
      setLoading(false);
      return [];
    }
    const appRows = (rows as unknown as AppRow[]) ?? [];
    setData(appRows);
    setLoading(false);
    return appRows;
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const tabCounts = useMemo(() =>
    STAGE_TABS.map((tab) =>
      data.filter((r) => (tab.statuses as readonly string[]).includes(r.status)).length
    ), [data]);

  const filtered = useMemo(() => {
    const tab = STAGE_TABS[activeTab];
    let rows = data.filter((r) => (tab.statuses as readonly string[]).includes(r.status));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        (r.tenant?.full_name ?? "").toLowerCase().includes(q) ||
        (r.tenant?.email ?? "").toLowerCase().includes(q) ||
        (r.property?.building_name ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, activeTab, searchQuery]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleUnblock = async () => {
    if (!selectedRow) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ visit_scheduling_blocked: false, no_show_count: 0 })
        .eq("user_id", selectedRow.tenant_id);
      if (error) throw error;
      toast({ title: "Tenant unblocked. No-show count reset to 0." });
      const newRows = await fetchData();
      const refreshed = newRows.find((r) => r.id === selectedRow.id);
      if (refreshed) setSelectedRow(refreshed);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedRow) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ admin_notes: notesText })
        .eq("user_id", selectedRow.tenant_id);
      if (error) throw error;
      toast({ title: "Notes saved" });
      setEditingNotes(false);
      const newRows = await fetchData();
      const refreshed = newRows.find((r) => r.id === selectedRow.id);
      if (refreshed) setSelectedRow(refreshed);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const openDrawer = (row: AppRow) => {
    setSelectedRow(row);
    setEditingNotes(false);
    setNotesText("");
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Tenant Pipeline</h1>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenant, email, or building…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>

        {/* Stage tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STAGE_TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
              <Badge variant={activeTab === i ? "secondary" : "outline"} className="ml-1 text-xs">
                {tabCounts[i]}
              </Badge>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No applications in this stage yet.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="hidden md:table-cell">BHK · Rent</TableHead>
                  <TableHead className="hidden lg:table-cell">Income</TableHead>
                  <TableHead className="hidden lg:table-cell">CIBIL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/applications/${row.id}`)}
                  >
                    {/* Tenant — with no-show badges */}
                    <TableCell>
                      <div className="font-medium">{row.tenant?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.tenant?.phone || ""}</div>
                      <NoShowBadges profile={row.tenant?.profile} />
                    </TableCell>

                    <TableCell>
                      <span>{row.property?.building_name || "—"}</span>
                      {row.property?.locality && (
                        <span className="text-muted-foreground"> · {row.property.locality}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span>{row.property?.bhk || "—"}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span>{formatCurrency(row.proposed_rent)}</span>
                      <span className="text-muted-foreground"> vs {formatCurrency(row.property?.listed_rent ?? null)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        {formatCurrency(row.monthly_income)}
                        {isIncomeFlagged(row) && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" /> Low
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">{row.cibil_range?.replace(/_/g, " ") || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[row.status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {row.submitted_at
                        ? new Date(row.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                        : "—"}
                    </TableCell>

                    {/* Info button — opens tenant profile drawer */}
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(row);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="View tenant profile"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ─── Tenant profile drawer ─────────────────────────────────────────── */}
      <Sheet
        open={!!selectedRow}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedRow(null);
            setEditingNotes(false);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
          {selectedRow && (() => {
            const profile = selectedRow.tenant?.profile;
            const isBlocked = profile?.visit_scheduling_blocked === true;
            const noShowCount = profile?.no_show_count ?? 0;

            return (
              <>
                <SheetHeader className="mb-5">
                  <SheetTitle className="text-base">
                    {selectedRow.tenant?.full_name ?? "Tenant"}
                  </SheetTitle>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {selectedRow.tenant?.email && <p>{selectedRow.tenant.email}</p>}
                    {selectedRow.tenant?.phone && <p>{selectedRow.tenant.phone}</p>}
                  </div>
                </SheetHeader>

                {/* ── Visit Behaviour ───────────────────────────────────── */}
                <section className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Visit Behaviour
                  </p>
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">No-show count</span>
                      <span className="text-sm font-semibold text-foreground">
                        {noShowCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      {isBlocked ? (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                          Blocked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>

                    {isBlocked && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-1 gap-2"
                        onClick={handleUnblock}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldOff className="h-3.5 w-3.5" />
                        )}
                        Unblock Tenant
                      </Button>
                    )}
                  </div>
                </section>

                {/* ── Internal Notes ────────────────────────────────────── */}
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Internal Notes
                    </p>
                    {!editingNotes && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotesText(profile?.admin_notes ?? "");
                          setEditingNotes(true);
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    )}
                  </div>

                  {editingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Internal admin notes about this tenant…"
                        rows={4}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={actionLoading}
                          className="flex-1"
                        >
                          {actionLoading ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingNotes(false)}
                          disabled={actionLoading}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {profile?.admin_notes || (
                          <span className="text-muted-foreground italic">No notes yet</span>
                        )}
                      </p>
                    </div>
                  )}
                </section>

                {/* ── Visit history link ────────────────────────────────── */}
                <div className="border-t border-border pt-4">
                  <Link
                    to="/admin/visits"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View full visit history
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
