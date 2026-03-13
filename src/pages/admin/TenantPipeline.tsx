import { useState, useEffect, useMemo, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Search, Inbox, ChevronRight, AlertTriangle } from "lucide-react";

const STAGE_TABS = [
  { label: "New", statuses: ["draft", "submitted"] },
  { label: "Platform Review", statuses: ["platform_review"] },
  { label: "Sent to Owner", statuses: ["sent_to_owner"] },
  { label: "Owner Actioned", statuses: ["owner_accepted", "owner_rejected", "owner_countered"] },
  { label: "Payment", statuses: ["payment_pending", "payment_received"] },
  { label: "KYC", statuses: ["kyc_pending", "kyc_passed", "kyc_failed"] },
  { label: "Agreement", statuses: ["agreement_pending"] },
  { label: "Active", statuses: ["lease_active"] },
  { label: "Closed", statuses: ["withdrawn", "expired"] },
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
  withdrawn: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

interface AppRow {
  id: string;
  status: string;
  monthly_income: number | null;
  proposed_rent: number;
  income_check_passed: boolean | null;
  platform_approved: boolean | null;
  submitted_at: string | null;
  created_at: string;
  cibil_range: string | null;
  tenant: { full_name: string; email: string | null; phone: string | null } | null;
  property: { building_name: string; locality: string | null; listed_rent: number; bhk: string } | null;
}

const isIncomeFlagged = (app: AppRow) =>
  app.monthly_income && app.property?.listed_rent
    ? app.monthly_income < app.property.listed_rent * 2.5
    : false;

const formatCurrency = (n: number | null) =>
  n != null ? `₹${n.toLocaleString("en-IN")}` : "—";

export default function TenantPipeline() {
  const navigate = useNavigate();
  const [data, setData] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from("applications")
      .select(`
        id, status, monthly_income, proposed_rent,
        income_check_passed, platform_approved, cibil_range,
        submitted_at, created_at,
        tenant:users!applications_tenant_id_fkey(full_name, email, phone),
        property:properties!applications_property_id_fkey(building_name, locality, listed_rent, bhk)
      `)
      .order("created_at", { ascending: false });

    if (err) {
      setError("Failed to load applications.");
      setLoading(false);
      return;
    }
    setData((rows as unknown as AppRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        )}

        {loading && (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
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
                    <TableCell>
                      <div className="font-medium">{row.tenant?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.tenant?.phone || ""}</div>
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
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
