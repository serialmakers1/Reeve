import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, X, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const CONFIRMED_VIA_OPTIONS = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const OWNER_REJECTION_REASONS = [
  'Prefer a different occupant profile',
  'Prefer a family / couple / single occupant',
  "Income or CIBIL doesn't meet my requirements",
  'Preferred rent not agreed',
  'Already selected another applicant',
  'Other',
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", platform_review: "Under Review",
  sent_to_owner: "Sent to Owner", owner_accepted: "Owner Accepted",
  owner_rejected: "Owner Rejected", owner_countered: "Owner Countered",
  payment_pending: "Payment Pending", payment_received: "Payment Received",
  kyc_pending: "KYC Pending", kyc_passed: "KYC Passed", kyc_failed: "KYC Failed",
  agreement_pending: "Agreement Pending", lease_active: "Active Tenant",
  withdrawn: "Withdrawn", expired: "Expired",
};

const CIBIL_COLORS: Record<string, string> = {
  below_550: "bg-red-100 text-red-800",
  "550_to_649": "bg-orange-100 text-orange-800",
  "650_to_749": "bg-yellow-100 text-yellow-800",
  "750_to_900": "bg-green-100 text-green-800",
  no_credit_history: "bg-muted text-muted-foreground",
  not_sure: "bg-muted text-muted-foreground",
};

const STATUS_ACTIONS: Record<string, { label: string; newStatus: string; extra?: Record<string, unknown> }[]> = {
  submitted: [{ label: "Move to Platform Review", newStatus: "platform_review" }],
  platform_review: [
    { label: "Approve & Send to Owner", newStatus: "sent_to_owner", extra: { platform_approved: true } },
  ],
  owner_accepted: [{ label: "Mark Payment Pending", newStatus: "payment_pending" }],
  payment_received: [{ label: "Mark KYC Pending", newStatus: "kyc_pending" }],
  kyc_pending: [
    { label: "Mark KYC Passed", newStatus: "kyc_passed" },
    { label: "Mark KYC Failed", newStatus: "kyc_failed" },
  ],
  kyc_passed: [{ label: "Mark Agreement Pending", newStatus: "agreement_pending" }],
};

const TERMINAL_STATUSES = ['withdrawn', 'owner_rejected', 'platform_rejected', 'expired', 'on_hold'];

function getFriendlyStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    platform_review: 'Under Review',
    platform_rejected: 'Rejected by Platform',
    sent_to_owner: 'Sent to Owner',
    owner_accepted: 'Owner Accepted',
    owner_rejected: 'Owner Rejected',
    owner_countered: 'Owner Countered',
    tenant_countered: 'Tenant Countered',
    payment_pending: 'Payment Pending',
    payment_received: 'Payment Received',
    kyc_pending: 'KYC Pending',
    kyc_passed: 'KYC Passed',
    kyc_failed: 'KYC Failed',
    agreement_pending: 'Agreement Pending',
    lease_active: 'Lease Active',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
    on_hold: 'On Hold',
  };
  return map[status] ?? status;
}

const formatCurrency = (n: number | null) =>
  n != null ? `₹${n.toLocaleString("en-IN")}` : "—";

interface AppData {
  id: string;
  tenant_id: string;
  status: string;
  property_id: string;
  monthly_income: number | null;
  proposed_rent: number;
  cibil_range: string | null;
  employer_name: string | null;
  income_check_passed: boolean | null;
  platform_approved: boolean | null;
  platform_review_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  created_at: string;
  owner_action_by_admin: boolean | null;
  tenant: { full_name: string; email: string | null; phone: string | null } | null;
  property: {
    building_name: string; locality: string | null; listed_rent: number;
    bhk: string; flat_number: string | null; street_address: string;
  } | null;
  residents: { id: string; full_name: string; age: number; relationship: string }[];
  eligibility: {
    age: number; occupation: string; marital_status: string; diet: string | null;
    has_pets: boolean; pet_type: string | null; resident_count: number;
    expected_stay: string; is_foreign_citizen: boolean; gender: string;
  }[] | null;
}

export default function AdminApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });

  const [app, setApp] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenRef, setTokenRef] = useState("");
  const [tokenAmount, setTokenAmount] = useState("5000");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);
  const [docFiles, setDocFiles] = useState<{ name: string; path: string }[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const fetchApp = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        tenant:users!applications_tenant_id_fkey(full_name, email, phone),
        property:properties!applications_property_id_fkey(
          building_name, locality, listed_rent, bhk, flat_number, street_address
        ),
        residents:application_residents(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Failed to load application", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch eligibility separately via tenant_id
    let eligibility: AppData["eligibility"] = null;
    if (data.tenant_id) {
      const { data: eligRows } = await supabase
        .from("eligibility")
        .select("*")
        .eq("user_id", data.tenant_id)
        .order("created_at", { ascending: false })
        .limit(1);
      eligibility = eligRows as any;
    }

    setApp({ ...(data as unknown as AppData), eligibility });
    setNotes(data.platform_review_notes ?? "");
    setLoading(false);
  }, [id, toast]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  useEffect(() => {
    if (!app?.tenant_id || !id) return;
    const fetchDocs = async () => {
      setDocsLoading(true);
      const { data: files, error } = await supabase.storage
        .from('tenant-documents')
        .list(`${app.tenant_id}/${id}`, {
          limit: 20,
          sortBy: { column: 'created_at', order: 'asc' },
        });
      if (!error && files) {
        setDocFiles(
          files
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(f => ({
              name: f.name,
              path: `${app.tenant_id}/${id}/${f.name}`,
            }))
        );
      }
      setDocsLoading(false);
    };
    fetchDocs();
  }, [app?.tenant_id, id]);

  const handleStatusChange = async (newStatus: string, extra?: Record<string, unknown>) => {
    if (!id) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus as any, updated_at: new Date().toISOString(), ...extra })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      toast({ title: `Status updated to ${STATUS_LABELS[newStatus] ?? newStatus}` });
      await fetchApp();
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("applications")
      .update({
        status: "platform_rejected" as any,
        platform_rejection_reason: rejectReason.trim(),
        platform_rejected_at: new Date().toISOString(),
        platform_approved: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast({ title: "Rejection failed", variant: "destructive" });
    } else {
      toast({ title: "Application rejected" });
      setRejectMode(false);
      setRejectReason("");
      await fetchApp();
    }
    setActionLoading(false);
  };

  const handleMarkLeaseActive = async () => {
    if (!id || !app) return;
    setLeaseLoading(true);
    const { error: appErr } = await supabase
      .from("applications")
      .update({ status: "lease_active" as any, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (appErr) {
      toast({ title: "Failed to update application", description: appErr.message, variant: "destructive" });
      setLeaseLoading(false);
      return;
    }
    const { error: propErr } = await supabase
      .from("properties")
      .update({
        status: "occupied" as any,
        is_active: false,
        occupied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", app.property_id);
    if (propErr) {
      toast({ title: "Failed to update property", description: propErr.message, variant: "destructive" });
      setLeaseLoading(false);
      return;
    }
    toast({ title: "Lease marked active. Property is now occupied." });
    setShowLeaseModal(false);
    setLeaseLoading(false);
    await fetchApp();
  };

  const handleAgreementOnHold = async () => {
    if (!id) return;
    setHoldLoading(true);
    const { error } = await supabase
      .from("applications")
      .update({ status: "payment_received" as any, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update application", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application moved back to Payment Received." });
      await fetchApp();
    }
    setHoldLoading(false);
  };

  const handleViewDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('tenant-documents')
      .createSignedUrl(path, 120);
    if (error || !data?.signedUrl) {
      toast({ title: 'Could not open document. Please try again.', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setNotesSaving(true);
    const { error } = await supabase
      .from("applications")
      .update({ platform_review_notes: notes, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to save notes", variant: "destructive" });
    } else {
      toast({ title: "Notes saved" });
    }
    setNotesSaving(false);
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!app) {
    return (
      <AdminLayout>
        <div className="text-center py-16 text-muted-foreground">Application not found.</div>
      </AdminLayout>
    );
  }

  const elig = app.eligibility?.[0] ?? null;
  const incomeFlagged =
    app.monthly_income && app.property?.listed_rent
      ? app.monthly_income < app.property.listed_rent * 2.5
      : false;
  const isTerminal = TERMINAL_STATUSES.includes(app.status);
  const actions = isTerminal ? [] : (STATUS_ACTIONS[app.status] ?? []);
  const showRejectBtn = !isTerminal && app.status === "platform_review";

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/applications")} className="p-2 rounded-md hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{app.tenant?.full_name || "Unknown Tenant"}</h1>
            <p className="text-sm text-muted-foreground">Application {app.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <Badge className="text-sm">{STATUS_LABELS[app.status] ?? app.status}</Badge>
        </div>

        {/* Section 1 — Tenant Profile */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tenant Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={app.tenant?.full_name} />
            <Row label="Email" value={app.tenant?.email} />
            <Row label="Phone" value={app.tenant?.phone} />
            {elig && (
              <>
                <Row label="Age" value={String(elig.age)} />
                <Row label="Gender" value={elig.gender?.replace(/_/g, " ")} />
                <Row label="Occupation" value={elig.occupation?.replace(/_/g, " ")} />
                <Row label="Marital Status" value={elig.marital_status?.replace(/_/g, " ")} />
                <Row label="Diet" value={elig.diet?.replace(/_/g, " ")} />
                <Row label="Pets" value={
                  !elig.has_pets
                    ? 'No'
                    : elig.pet_type === 'other' && (elig as any).pet_description
                      ? `Other: ${(elig as any).pet_description}`
                      : elig.pet_type
                        ? elig.pet_type.charAt(0).toUpperCase() + elig.pet_type.slice(1)
                        : 'Yes'
                } />
                <Row label="Residents" value={String(elig.resident_count)} />
                <Row label="Expected Stay" value={elig.expected_stay?.replace(/_/g, " ")} />
                <Row label="Foreign Citizen" value={elig.is_foreign_citizen ? "Yes" : "No"} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 2 — Financial Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-36 shrink-0">Monthly Income</span>
              <span className="font-medium">{formatCurrency(app.monthly_income)}</span>
              {incomeFlagged && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Low Income
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-36 shrink-0">CIBIL Range</span>
              {app.cibil_range ? (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CIBIL_COLORS[app.cibil_range] ?? "bg-muted text-muted-foreground"}`}>
                  {app.cibil_range.replace(/_/g, " ")}
                </span>
              ) : <span>—</span>}
            </div>
            <Row label="Proposed Rent" value={formatCurrency(app.proposed_rent)} />
            <Row label="Listed Rent" value={formatCurrency(app.property?.listed_rent ?? null)} />
            <Row label="Employer" value={app.employer_name} />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-36 shrink-0">Income Check</span>
              {app.income_check_passed === true && <Check className="h-4 w-4 text-green-600" />}
              {app.income_check_passed === false && <X className="h-4 w-4 text-red-600" />}
              {app.income_check_passed == null && <span>—</span>}
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — Co-Residents */}
        <Card>
          <CardHeader><CardTitle className="text-base">Co-Residents</CardTitle></CardHeader>
          <CardContent>
            {app.residents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No co-residents listed.</p>
            ) : (
              <div className="space-y-2">
                {app.residents.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 text-sm">
                    <span className="font-medium">{r.full_name}</span>
                    <span className="text-muted-foreground">Age {r.age}</span>
                    <span className="text-muted-foreground">{r.relationship}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section — KYC Documents */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">KYC Documents</h2>
          {docsLoading ? (
            <p className="text-sm text-gray-500">Loading documents...</p>
          ) : docFiles.length === 0 ? (
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {docFiles.map(doc => {
                const label = doc.name
                  .replace(/_\d+\.pdf$/, '')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={doc.path} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className="text-xs text-gray-400">PDF</span>
                    </div>
                    <button
                      onClick={() => handleViewDoc(doc.path)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4 — Property */}
        <Card>
          <CardHeader><CardTitle className="text-base">Property</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Building" value={app.property?.building_name} />
            <Row label="Locality" value={app.property?.locality} />
            <Row label="BHK" value={app.property?.bhk} />
            <Row label="Listed Rent" value={formatCurrency(app.property?.listed_rent ?? null)} />
          </CardContent>
        </Card>

        {/* Section 5 — Admin Actions */}
        {(isTerminal || actions.length > 0 || showRejectBtn) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Admin Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isTerminal ? (
                <p className="text-sm text-muted-foreground">
                  This application is closed ({getFriendlyStatus(app.status)}) — no further actions available.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {actions.map((a) => (
                      <Button
                        key={a.newStatus}
                        className="min-h-[44px]"
                        disabled={actionLoading}
                        onClick={() => handleStatusChange(a.newStatus, a.extra)}
                      >
                        {a.label}
                      </Button>
                    ))}
                    {showRejectBtn && !rejectMode && (
                      <Button
                        variant="destructive"
                        className="min-h-[44px]"
                        disabled={actionLoading}
                        onClick={() => setRejectMode(true)}
                      >
                        Reject Application
                      </Button>
                    )}
                  </div>
                  {rejectMode && (
                    <div className="space-y-2 pt-2">
                      <Input
                        placeholder="Rejection reason…"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="min-h-[44px]"
                      />
                      <div className="flex gap-2">
                        <Button variant="destructive" className="min-h-[44px]" disabled={!rejectReason.trim() || actionLoading} onClick={handleReject}>
                          Confirm Rejection
                        </Button>
                        <Button variant="outline" className="min-h-[44px]" onClick={() => { setRejectMode(false); setRejectReason(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section — Mark Token Received */}
        {app.status === "payment_pending" && (
          <Card>
            <CardContent className="pt-6">
              <Button className="min-h-[44px] w-full" onClick={() => setShowTokenModal(true)}>
                Mark Token Received
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Section — Mark Payment Refunded */}
        {app.status === "payment_received" && (
          <Card>
            <CardContent className="pt-6">
              <Button variant="outline" className="min-h-[44px] w-full border-red-300 text-red-600 hover:bg-red-50" onClick={() => setShowRefundModal(true)}>
                Mark Payment Refunded
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Section — Agreement Pending Actions */}
        {app.status === "agreement_pending" && (
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-2">
              <Button className="min-h-[44px]" onClick={() => setShowLeaseModal(true)}>
                Mark Lease Active
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px]"
                disabled={holdLoading}
                onClick={handleAgreementOnHold}
              >
                {holdLoading ? "Updating…" : "Put Agreement on Hold"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Section 6 — Admin Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Admin Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Internal review notes…"
            />
            <Button variant="outline" className="min-h-[44px]" disabled={notesSaving} onClick={handleSaveNotes}>
              {notesSaving ? "Saving…" : "Save Notes"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Token Payment Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Mark Token Payment Received</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">UPI / Transaction Reference</label>
              <Input value={tokenRef} onChange={(e) => setTokenRef(e.target.value)} placeholder="e.g. UPI123456789" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Amount Received (₹)</label>
              <Input type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 min-h-[44px]"
                disabled={!tokenRef.trim() || !tokenAmount || tokenSaving}
                onClick={async () => {
                  setTokenSaving(true);
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session || !id) { setTokenSaving(false); return; }
                  const { error: payErr } = await supabase.from("payments").insert({
                    application_id: id,
                    payer_id: (app as any).tenant_id ?? session.user.id,
                    payment_type: "token_deposit" as any,
                    method: "upi" as any,
                    status: "success" as any,
                    amount: Number(tokenAmount),
                    gateway_reference: tokenRef.trim(),
                    paid_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                  if (payErr) {
                    toast({ title: "Failed to record payment", description: payErr.message, variant: "destructive" });
                    setTokenSaving(false);
                    return;
                  }
                  await supabase.from("applications").update({ status: "payment_received" as any, updated_at: new Date().toISOString() }).eq("id", id);
                  toast({ title: "Token payment recorded. Other applicants have been put on hold." });
                  setShowTokenModal(false);
                  setTokenRef("");
                  setTokenAmount("5000");
                  setTokenSaving(false);
                  await fetchApp();
                }}
              >
                {tokenSaving ? "Saving…" : "Confirm"}
              </Button>
              <Button variant="outline" className="min-h-[44px]" onClick={() => { setShowTokenModal(false); setTokenRef(""); setTokenAmount("5000"); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lease Active Confirmation Modal */}
      {showLeaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Confirm Lease Activation</h2>
            <p className="text-sm text-muted-foreground">
              Confirm that the agreement has been signed by all parties and the lease is now active.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 min-h-[44px]"
                disabled={leaseLoading}
                onClick={handleMarkLeaseActive}
              >
                {leaseLoading ? "Confirming…" : "Confirm"}
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px]"
                disabled={leaseLoading}
                onClick={() => setShowLeaseModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Refund Token Payment</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reason for refund</label>
              <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Owner backed out" />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 min-h-[44px]"
                disabled={!refundReason.trim() || refundSaving}
                onClick={async () => {
                  setRefundSaving(true);
                  const { data: payment } = await supabase
                    .from("payments")
                    .select("id")
                    .eq("application_id", id!)
                    .eq("payment_type", "token_deposit" as any)
                    .eq("status", "success" as any)
                    .maybeSingle();
                  if (payment) {
                    await supabase.from("payments").update({
                      status: "refunded" as any,
                      refunded_at: new Date().toISOString(),
                      refund_reason: refundReason.trim(),
                      updated_at: new Date().toISOString(),
                    }).eq("id", payment.id);
                  }
                  toast({ title: "Refund recorded. Held applicants have been restored." });
                  setShowRefundModal(false);
                  setRefundReason("");
                  setRefundSaving(false);
                  await fetchApp();
                }}
              >
                {refundSaving ? "Processing…" : "Confirm Refund"}
              </Button>
              <Button variant="outline" className="min-h-[44px]" onClick={() => { setShowRefundModal(false); setRefundReason(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
