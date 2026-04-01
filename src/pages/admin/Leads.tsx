import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const STATUSES = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Interested", value: "interested" },
  { label: "Inspection Scheduled", value: "inspection_scheduled" },
  { label: "Converted", value: "converted" },
  { label: "Dropped", value: "dropped" },
] as const;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", className: "bg-blue-100 text-blue-800" },
  interested: { label: "Interested", className: "bg-amber-100 text-amber-800" },
  inspection_scheduled: { label: "Inspection Scheduled", className: "bg-purple-100 text-purple-800" },
  converted: { label: "Converted", className: "bg-green-100 text-green-800" },
  dropped: { label: "Dropped", className: "bg-red-100 text-red-800" },
};

interface LeadRow {
  id: string;
  owner_name: string;
  owner_phone: string | null;
  owner_email: string | null;
  building_name: string | null;
  locality: string | null;
  city: string | null;
  flat_number: string | null;
  bhk: string | null;
  expected_rent: number | null;
  status: string;
  notes: string | null;
  source: string | null;
  contact_attempts: number;
  last_contacted_at: string | null;
  follow_up_date: string | null;
  tenant_notified_on_listing: boolean;
  converted_property_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  referred_by_tenant: { full_name: string | null; phone: string | null } | null;
}

export default function Leads() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [drawerLead, setDrawerLead] = useState<LeadRow | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select(`
        id,
        owner_name,
        owner_phone,
        owner_email,
        building_name,
        locality,
        city,
        flat_number,
        bhk,
        expected_rent,
        status,
        notes,
        source,
        contact_attempts,
        last_contacted_at,
        follow_up_date,
        tenant_notified_on_listing,
        converted_property_id,
        assigned_to,
        created_at,
        updated_at,
        referred_by_tenant:users!leads_referred_by_tenant_id_fkey (
          full_name,
          phone
        )
      `)
      .order("created_at", { ascending: false });

    setLeads((data as any as LeadRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [fetchData, authLoading, user]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    STATUSES.forEach((s) => { if (s.value !== "all") counts[s.value] = 0; });
    leads.forEach((l) => { if (counts[l.status] !== undefined) counts[l.status]++; });
    return counts;
  }, [leads]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return leads;
    return leads.filter((l) => l.status === activeTab);
  }, [leads, activeTab]);

  const daysSince = (dateStr: string) => {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    return `${d} day${d !== 1 ? "s" : ""}`;
  };

  const formatRent = (n: number) =>
    "₹" + n.toLocaleString("en-IN");

  const showSaved = () => {
    setSaveState("saved");
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setSaveState("idle"), 2000);
  };

  const updateLead = async (id: string, patch: Record<string, any>) => {
    setSaveState("saving");
    await supabase
      .from("leads")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    showSaved();
    await fetchData();
    // Update drawer lead if open
    setDrawerLead((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const handleLogContact = async () => {
    if (!drawerLead) return;
    await updateLead(drawerLead.id, {
      contact_attempts: (drawerLead.contact_attempts ?? 0) + 1,
      last_contacted_at: new Date().toISOString(),
    });
    setDrawerLead((prev) =>
      prev
        ? {
            ...prev,
            contact_attempts: (prev.contact_attempts ?? 0) + 1,
            last_contacted_at: new Date().toISOString(),
          }
        : prev
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Owner Leads</h1>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setActiveTab(s.value)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.label}
              <Badge
                variant={activeTab === s.value ? "secondary" : "outline"}
                className="ml-1 text-xs"
              >
                {statusCounts[s.value] ?? 0}
              </Badge>
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {!loading && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No leads yet.</p>
          </div>
        )}

        {!loading && leads.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No leads with this status.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead ID</TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="hidden md:table-cell">BHK + Rent</TableHead>
                  <TableHead className="hidden lg:table-cell">Referred By</TableHead>
                  <TableHead className="hidden md:table-cell">Attempts</TableHead>
                  <TableHead className="hidden lg:table-cell">Follow-up</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const property = [lead.building_name, lead.locality]
                    .filter(Boolean)
                    .join(" · ");
                  const bhkRent = [
                    lead.bhk ? `${lead.bhk}` : null,
                    lead.expected_rent ? formatRent(lead.expected_rent) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const style = STATUS_STYLE[lead.status] ?? STATUS_STYLE.new;

                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => setDrawerLead(lead)}
                    >
                      <TableCell className="font-mono text-xs">
                        {lead.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.owner_name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {lead.owner_phone || "—"}
                      </TableCell>
                      <TableCell>{property || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {bhkRent || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.referred_by_tenant?.full_name || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.contact_attempts}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.follow_up_date
                          ? format(new Date(lead.follow_up_date + "T00:00:00"), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
                        >
                          {style.label}
                        </span>
                      </TableCell>
                      <TableCell>{daysSince(lead.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail drawer */}
        <Sheet
          open={!!drawerLead}
          onOpenChange={(o) => !o && setDrawerLead(null)}
        >
          <SheetContent side="right" className="w-96 overflow-y-auto">
            {drawerLead && (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-lg">
                      {drawerLead.owner_name}
                    </SheetTitle>
                    {saveState !== "idle" && (
                      <span className="text-xs text-muted-foreground">
                        {saveState === "saving" ? "Saving..." : "Saved ✓"}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {drawerLead.owner_phone && <p>{drawerLead.owner_phone}</p>}
                    {drawerLead.owner_email && <p>{drawerLead.owner_email}</p>}
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Property Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      Property Details
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Building</span>
                        <p>{drawerLead.building_name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Locality</span>
                        <p>{drawerLead.locality || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">City</span>
                        <p>{drawerLead.city || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Flat No.</span>
                        <p>{drawerLead.flat_number || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BHK</span>
                        <p>{drawerLead.bhk || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Expected Rent
                        </span>
                        <p>
                          {drawerLead.expected_rent
                            ? formatRent(drawerLead.expected_rent)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Referral Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      Referral Info
                    </h3>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">
                          Referred by:{" "}
                        </span>
                        {drawerLead.referred_by_tenant?.full_name
                          ? `${drawerLead.referred_by_tenant.full_name}${drawerLead.referred_by_tenant.phone ? ` · ${drawerLead.referred_by_tenant.phone}` : ""}`
                          : "Direct / Unknown"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Source: </span>
                        {drawerLead.source || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Pipeline Actions */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Pipeline Actions
                    </h3>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-sm text-muted-foreground">
                        Status
                      </label>
                      <Select
                        value={drawerLead.status}
                        onValueChange={(v) => {
                          setDrawerLead((prev) =>
                            prev ? { ...prev, status: v } : prev
                          );
                          updateLead(drawerLead.id, { status: v });
                        }}
                      >
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter((s) => s.value !== "all").map(
                            (s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Follow-up Date */}
                    <div className="space-y-1.5">
                      <label className="text-sm text-muted-foreground">
                        Follow-up Date
                      </label>
                      <Input
                        type="date"
                        className="min-h-[44px]"
                        value={drawerLead.follow_up_date ?? ""}
                        onChange={(e) =>
                          setDrawerLead((prev) =>
                            prev
                              ? { ...prev, follow_up_date: e.target.value }
                              : prev
                          )
                        }
                        onBlur={(e) =>
                          updateLead(drawerLead.id, {
                            follow_up_date: e.target.value || null,
                          })
                        }
                      />
                    </div>

                    {/* Log Contact Attempt */}
                    <div className="space-y-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[44px]"
                        onClick={handleLogContact}
                      >
                        Log Contact Attempt
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {drawerLead.last_contacted_at
                          ? `Last contacted: ${format(new Date(drawerLead.last_contacted_at), "dd MMM yyyy HH:mm")}`
                          : "Not yet contacted"}
                      </p>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-sm text-muted-foreground">
                        Notes
                      </label>
                      <Textarea
                        rows={4}
                        value={drawerLead.notes ?? ""}
                        onChange={(e) =>
                          setDrawerLead((prev) =>
                            prev ? { ...prev, notes: e.target.value } : prev
                          )
                        }
                        onBlur={(e) =>
                          updateLead(drawerLead.id, {
                            notes: e.target.value || null,
                          })
                        }
                      />
                    </div>

                    {/* Tenant Notified */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={drawerLead.tenant_notified_on_listing}
                        onCheckedChange={(checked) => {
                          const val = !!checked;
                          setDrawerLead((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  tenant_notified_on_listing: val,
                                }
                              : prev
                          );
                          updateLead(drawerLead.id, {
                            tenant_notified_on_listing: val,
                          });
                        }}
                      />
                      <label className="text-sm">
                        Tenant notified when property listed
                      </label>
                    </div>
                  </div>

                  {/* Converted Property */}
                  {drawerLead.converted_property_id && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        Converted Property
                      </h3>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() =>
                          navigate(
                            `/admin/properties/${drawerLead.converted_property_id}`
                          )
                        }
                      >
                        View Property →
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
