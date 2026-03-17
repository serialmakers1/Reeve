import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─── */
interface ApplicationData {
  id: string;
  status: string;
  proposed_rent: number;
  owner_counter_rent: number | null;
  final_agreed_rent: number | null;
  monthly_income: number | null;
  cibil_range: string | null;
  employer_name: string | null;
  crime_record_self_attest: boolean;
  income_check_passed: boolean | null;
  platform_approved: boolean | null;
  submitted_at: string | null;
  rejection_reason: string | null;
  owner_actioned_at: string | null;
  attempt_number: number | null;
  previous_application_id: string | null;
  tenant_id: string;
  tenant: { full_name: string } | null;
  property: {
    building_name: string;
    locality: string | null;
    bhk: string;
    listed_rent: number;
  } | null;
  residents: { full_name: string; age: number; relationship: string }[];
  eligibility: {
    age: number;
    gender: string;
    occupation: string;
    marital_status: string;
    diet: string | null;
    has_pets: boolean;
    pet_type: string | null;
    pet_description: string | null;
    resident_count: number;
    expected_stay: string;
  }[] | null;
}

interface HistoryRow {
  id: string;
  status: string;
  attempt_number: number | null;
  proposed_rent: number;
  submitted_at: string | null;
  rejection_reason: string | null;
  platform_rejection_reason: string | null;
  withdrawn_at: string | null;
  withdrawal_reason: string | null;
}

/* ─── Helpers ─── */
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

const capitalize = (s: string | null | undefined) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const formatStay = (s: string) => {
  const map: Record<string, string> = {
    "less_than_6_months": "Less than 6 months",
    "6_to_12_months": "6–12 months",
    "1_to_2_years": "1–2 years",
    "2_to_3_years": "2–3 years",
    "3_plus_years": "3+ years",
  };
  return map[s] ?? capitalize(s);
};

const cibilColor = (range: string | null) => {
  const map: Record<string, string> = {
    below_550: "bg-red-100 text-red-700",
    "550_to_649": "bg-orange-100 text-orange-700",
    "650_to_749": "bg-yellow-100 text-yellow-700",
    "750_to_900": "bg-green-100 text-green-700",
    no_credit_history: "bg-gray-100 text-gray-600",
    not_sure: "bg-gray-100 text-gray-600",
  };
  return map[range ?? ""] ?? "bg-gray-100 text-gray-600";
};

const statusBadge = (s: string) => {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    platform_review: "Under Review",
    sent_to_owner: "Awaiting Your Review",
    owner_accepted: "Accepted",
    owner_rejected: "Declined",
    owner_countered: "Counter Sent",
    tenant_countered: "Counter Received",
    payment_pending: "Payment Pending",
    payment_received: "Payment Received",
    kyc_pending: "KYC Pending",
    kyc_passed: "KYC Passed",
    kyc_failed: "KYC Failed",
    agreement_pending: "Agreement Pending",
    lease_active: "Active Tenant",
    withdrawn: "Withdrawn",
    expired: "Expired",
    platform_rejected: "Not Approved",
  };
  const colors: Record<string, string> = {
    sent_to_owner: "bg-blue-100 text-blue-700",
    owner_accepted: "bg-green-100 text-green-700",
    owner_rejected: "bg-red-100 text-red-700",
    owner_countered: "bg-yellow-100 text-yellow-700",
    lease_active: "bg-green-100 text-green-700",
    withdrawn: "bg-gray-100 text-gray-500",
    expired: "bg-gray-100 text-gray-500",
    platform_rejected: "bg-red-100 text-red-700",
  };
  return {
    label: labels[s] ?? s,
    className: colors[s] ?? "bg-gray-100 text-gray-700",
  };
};

const formatDate = (ts: string) =>
  new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/* ─── Page ─── */
export default function OwnerApplicationDetail() {
  const { propertyId, applicationId } = useParams<{
    propertyId: string;
    applicationId: string;
  }>();
  const navigate = useNavigate();
  const { loading: authLoading } = useRequireAuth();
  const { toast } = useToast();

  const [app, setApp] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Action state
  const [showReject, setShowReject] = useState(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>('');
  const [otherRejectionText, setOtherRejectionText] = useState<string>('');
  const [showCounter, setShowCounter] = useState(false);
  const [counterRent, setCounterRent] = useState("");

  const fetchApp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !applicationId) return;

    const { data } = await supabase
      .from("applications")
      .select(`
        id, status, proposed_rent, owner_counter_rent, final_agreed_rent,
        monthly_income, cibil_range, employer_name, crime_record_self_attest,
        income_check_passed, platform_approved, submitted_at,
        rejection_reason, owner_actioned_at, attempt_number, previous_application_id, tenant_id,
        tenant:users!applications_tenant_id_fkey(full_name),
        property:properties!applications_property_id_fkey(
          building_name, locality, bhk, listed_rent
        ),
        residents:application_residents(full_name, age, relationship)
      `)
      .eq("id", applicationId)
      .maybeSingle();

    if (!data) {
      setLoading(false);
      return;
    }

    const tenantId = (data as any).tenant_id;

    // Fetch eligibility separately via tenant_id
    let eligibility: ApplicationData["eligibility"] = null;
    if (tenantId) {
      const { data: eligData } = await supabase
        .from("eligibility")
        .select("age, gender, occupation, marital_status, diet, has_pets, pet_type, resident_count, expected_stay")
        .eq("user_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1);

      eligibility = (eligData as ApplicationData["eligibility"]) ?? null;
    }

    const appData = {
      ...(data as unknown as Omit<ApplicationData, "eligibility">),
      eligibility,
    };
    setApp(appData);

    // Fetch history if reapplication
    if (appData.attempt_number != null && appData.attempt_number > 1 && tenantId && propertyId) {
      const { data: historyData } = await supabase
        .from("applications")
        .select("id, status, attempt_number, proposed_rent, submitted_at, rejection_reason, platform_rejection_reason, withdrawn_at, withdrawal_reason")
        .eq("property_id", propertyId)
        .eq("tenant_id", tenantId)
        .neq("id", applicationId)
        .order("attempt_number", { ascending: true });

      setHistory((historyData as unknown as HistoryRow[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchApp();
  }, [authLoading, applicationId]);

  const handleAction = async (
    updates: Record<string, unknown>
  ) => {
    if (!applicationId) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("applications")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Application updated." });
      setShowReject(false);
      setShowCounter(false);
      await fetchApp();
    }
    setActionLoading(false);
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded-xl" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!app) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <p className="text-muted-foreground mb-4">Application not found.</p>
          <button
            onClick={() => navigate(`/my-properties/${propertyId}`)}
            className="text-primary underline text-sm"
          >
            ← Back
          </button>
        </div>
      </Layout>
    );
  }

  const elig = app.eligibility?.[0] ?? null;
  const badge = statusBadge(app.status);
  const buildingName = app.property?.building_name ?? "Property";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <button
          onClick={() => navigate(`/my-properties/${propertyId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 min-h-[44px]"
        >
          ← Back to {buildingName}
        </button>

        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight">
              Application from {app.tenant?.full_name ?? "Applicant"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {buildingName} · {app.property?.bhk} ·{" "}
              {app.property?.locality ?? ""}
            </p>
          </div>
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Attempt badge */}
        {app.attempt_number != null && app.attempt_number > 1 && (
          <span className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium mb-4">
            Reapplication — Attempt {app.attempt_number} of 3
          </span>
        )}

        <div className="mb-6" />

        {/* Platform review notice */}
        {app.platform_approved === false && app.status !== "owner_rejected" && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 mb-6">
            <p className="text-sm text-yellow-800">
              This application is under review by Reeve. You'll be notified once
              it's ready for your review.
            </p>
          </div>
        )}

        {/* SECTION 1 — Applicant Profile */}
        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Applicant Profile
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { label: "Full Name", value: app.tenant?.full_name ?? "—" },
              { label: "Age", value: elig?.age ?? "—" },
              { label: "Gender", value: capitalize(elig?.gender) },
              { label: "Occupation", value: capitalize(elig?.occupation) },
              { label: "Marital Status", value: capitalize(elig?.marital_status) },
              { label: "Diet", value: capitalize(elig?.diet) },
              {
                label: "Pets",
                value: elig?.has_pets
                  ? `Yes — ${capitalize(elig.pet_type)}`
                  : "No",
              },
              {
                label: "Expected Stay",
                value: elig ? formatStay(elig.expected_stay) : "—",
              },
              {
                label: "Total Residents",
                value: elig?.resident_count ?? "—",
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2 — Financial Details */}
        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Financial Details
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Income</p>
              <p className="text-sm font-medium text-foreground">
                {app.monthly_income ? fmt(app.monthly_income) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employer</p>
              <p className="text-sm font-medium text-foreground">
                {app.employer_name ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CIBIL Range</p>
              {app.cibil_range ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${cibilColor(app.cibil_range)}`}
                >
                  {capitalize(app.cibil_range)}
                </span>
              ) : (
                <p className="text-sm font-medium text-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Income Check</p>
              {app.income_check_passed === true ? (
                <p className="text-sm font-medium text-green-600">✓ Income verified</p>
              ) : app.income_check_passed === false ? (
                <p className="text-sm font-medium text-red-600">✗ Income below threshold</p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proposed Rent</p>
              <p className="text-sm font-medium text-foreground">
                {fmt(app.proposed_rent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Listed Rent</p>
              <p className="text-sm font-medium text-foreground">
                {app.property ? fmt(app.property.listed_rent) : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3 — Co-Residents */}
        <section className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Co-Residents
          </h2>
          {app.residents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No co-residents listed.
            </p>
          ) : (
            <div className="space-y-2">
              {app.residents.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-foreground">
                    {r.full_name}
                  </span>
                  <span className="text-muted-foreground">
                    {r.age} yrs · {capitalize(r.relationship)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION — Application History (reapplications) */}
        {history.length > 0 && (
          <section className="rounded-xl border border-border bg-card mb-4">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between p-5 text-sm font-semibold text-foreground"
            >
              Application History ({history.length} previous {history.length === 1 ? "attempt" : "attempts"})
              {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {historyOpen && (
              <div className="px-5 pb-5 space-y-3 border-t pt-3">
                {history.map((h) => {
                  const hBadge = statusBadge(h.status);
                  const reason = h.rejection_reason || h.platform_rejection_reason || h.withdrawal_reason;
                  return (
                    <div key={h.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium">
                          Attempt {h.attempt_number ?? "—"} · {fmt(h.proposed_rent)}
                        </p>
                        {h.submitted_at && (
                          <p className="text-xs text-muted-foreground">{formatDate(h.submitted_at)}</p>
                        )}
                        {reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">Reason: {reason}</p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${hBadge.className}`}>
                        {hBadge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION 4 — Owner Actions */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Your Decision
          </h2>

          {app.platform_approved === false &&
          app.status !== "owner_rejected" ? null : app.status ===
            "sent_to_owner" ? (
            <div className="space-y-4">
              {/* Accept */}
              <button
                disabled={actionLoading}
                onClick={() => {
                  if (
                    window.confirm(
                      `Accept this application at the proposed rent of ${fmt(app.proposed_rent)}?`
                    )
                  ) {
                    handleAction({
                      status: "owner_accepted",
                      final_agreed_rent: app.proposed_rent,
                      owner_actioned_at: new Date().toISOString(),
                    });
                  }
                }}
                className="w-full min-h-[44px] rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Accept Application
              </button>

              {/* Reject */}
              {!showReject ? (
                <button
                  disabled={actionLoading}
                  onClick={() => setShowReject(true)}
                  className="w-full min-h-[44px] rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Reject Application
                </button>
              ) : (
              <div className="border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Reason for rejection *</p>
                    {[
                      'Prefer a different occupant profile',
                      'Prefer a family / couple / single occupant',
                      "Income or CIBIL doesn't meet my requirements",
                      'Preferred rent not agreed',
                      'Already selected another applicant',
                      'Other'
                    ].map(reason => (
                      <button
                        key={reason}
                        onClick={() => {
                          setSelectedRejectionReason(reason);
                          if (reason !== 'Other') setOtherRejectionText('');
                        }}
                        className={`w-full text-left px-3 py-2 rounded border text-sm ${
                          selectedRejectionReason === reason
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}

                    {selectedRejectionReason === 'Other' && (
                      <textarea
                        placeholder="Please specify your reason..."
                        value={otherRejectionText}
                        onChange={e => setOtherRejectionText(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
                        rows={3}
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading || !(selectedRejectionReason !== '' && (selectedRejectionReason !== 'Other' || otherRejectionText.trim() !== ''))}
                      onClick={() => {
                        const finalRejectionReason = selectedRejectionReason === 'Other'
                          ? `Other: ${otherRejectionText.trim()}`
                          : selectedRejectionReason;
                        handleAction({
                          status: "owner_rejected",
                          rejection_reason: finalRejectionReason,
                          owner_actioned_at: new Date().toISOString(),
                        });
                      }}
                      className="flex-1 min-h-[44px] rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => {
                        setShowReject(false);
                        setSelectedRejectionReason('');
                        setOtherRejectionText('');
                      }}
                      className="min-h-[44px] px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Counter */}
              {!showCounter ? (
                <button
                  disabled={actionLoading}
                  onClick={() => setShowCounter(true)}
                  className="w-full min-h-[44px] rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Make Counter Offer
                </button>
              ) : (
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <input
                      type="number"
                      placeholder="Your counter rent"
                      value={counterRent}
                      onChange={(e) => setCounterRent(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading || !counterRent}
                      onClick={() =>
                        handleAction({
                          status: "owner_countered",
                          owner_counter_rent: Number(counterRent),
                          owner_actioned_at: new Date().toISOString(),
                        })
                      }
                      className="flex-1 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      Send Counter Offer
                    </button>
                    <button
                      onClick={() => {
                        setShowCounter(false);
                        setCounterRent("");
                      }}
                      className="min-h-[44px] px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {app.status === "owner_accepted" && (
                <p>
                  You accepted this application
                  {app.owner_actioned_at
                    ? ` on ${formatDate(app.owner_actioned_at)}`
                    : ""}
                  .
                </p>
              )}
              {app.status === "owner_rejected" && (
                <p>
                  You declined this application
                  {app.owner_actioned_at
                    ? ` on ${formatDate(app.owner_actioned_at)}`
                    : ""}
                  .
                  {app.rejection_reason && (
                    <span className="block mt-1 text-xs">
                      Reason: {app.rejection_reason}
                    </span>
                  )}
                </p>
              )}
              {app.status === "owner_countered" && (
                <p>
                  You sent a counter offer of{" "}
                  {app.owner_counter_rent ? fmt(app.owner_counter_rent) : "—"}
                  {app.owner_actioned_at
                    ? ` on ${formatDate(app.owner_actioned_at)}`
                    : ""}
                  . Waiting for the tenant to respond.
                </p>
              )}
              {![
                "sent_to_owner",
                "owner_accepted",
                "owner_rejected",
                "owner_countered",
              ].includes(app.status) && (
                <p>
                  Status: {badge.label}. No action required from you at this
                  stage.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
