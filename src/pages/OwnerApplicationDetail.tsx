import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-gray-400 text-gray-500 bg-gray-50" },
  submitted: { label: "Submitted", className: "border-blue-500 text-blue-600 bg-blue-50" },
  under_review: { label: "Under Review", className: "border-amber-500 text-amber-600 bg-amber-50" },
  sent_to_owner: { label: "Awaiting Your Decision", className: "border-purple-500 text-purple-600 bg-purple-50" },
  owner_accepted: { label: "Accepted", className: "border-green-500 text-green-600 bg-green-50" },
  owner_rejected: { label: "Rejected", className: "border-red-500 text-red-600 bg-red-50" },
  owner_countered: { label: "Counter Offer Sent", className: "border-amber-500 text-amber-600 bg-amber-50" },
  tenant_countered: { label: "Tenant Countered", className: "border-purple-500 text-purple-600 bg-purple-50" },
  payment_pending: { label: "Payment Pending", className: "border-amber-500 text-amber-600 bg-amber-50" },
  payment_received: { label: "Payment Received", className: "border-green-500 text-green-600 bg-green-50" },
  active: { label: "Active", className: "border-green-500 text-green-600 bg-green-50" },
  withdrawn: { label: "Withdrawn", className: "border-gray-400 text-gray-500 bg-gray-50" },
};

const STAY_LABELS: Record<string, string> = {
  less_than_6: "Less than 6 months",
  "6_to_11": "6–11 months",
  "11_to_24": "11–24 months",
  "24_plus": "24+ months",
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  request_add: "Request Add",
  request_remove: "Request Remove",
  report_issue: "Report Issue",
};

function formatINR(amount: number | null) {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function OwnerApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  const userId = session?.user?.id || "";

  const fetchApplication = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id, status, proposed_rent, owner_counter_rent, monthly_income,
        employer_name, cibil_range, submitted_at, property_id,
        properties(building_name, locality, bhk, listed_rent),
        tenant:users!tenant_id(
          full_name
        ),
        application_residents(full_name, age, gender, occupation, relationship),
        application_notes(note_type, description, photo_url)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
    } else {
      setApplication(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (!authLoading && userId && id) {
      fetchApplication();
    }
  }, [authLoading, isAuthenticated, userId, id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`owner-app-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "applications", filter: `id=eq.${id}` },
        () => fetchApplication()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleAction = async (newStatus: string, updates: Record<string, any> = {}) => {
    setActionLoading(newStatus);
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus as any, owner_actioned_at: new Date().toISOString(), ...updates })
      .eq("id", id!);

    setActionLoading(null);
    if (error) {
      toast({ title: "Something went wrong.", variant: "destructive" });
      return;
    }
    setShowCounterInput(false);
    setCounterAmount("");
    await fetchApplication();
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !application) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <p className="text-muted-foreground">Application not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>← Go back</Button>
        </div>
      </Layout>
    );
  }

  const app = application;
  const property = app.properties;
  const tenant = app.tenant;
  const residents: any[] = app.application_residents || [];
  const notes: any[] = app.application_notes || [];
  const statusInfo = STATUS_MAP[app.status] || { label: app.status, className: "" };

  // Group notes by type
  const notesByType: Record<string, any[]> = {};
  for (const note of notes) {
    if (!notesByType[note.note_type]) notesByType[note.note_type] = [];
    notesByType[note.note_type].push(note);
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-4 min-h-[44px]" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {property?.bhk} in {property?.building_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {property?.locality || ""}
              </p>
            </div>
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Status banners */}
          {app.status === "owner_countered" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Counter offer sent ({formatINR(app.owner_counter_rent)}/mo). Waiting for tenant response.
            </div>
          )}
          {app.status === "tenant_countered" && (
            <div className="rounded-md border border-purple-300 bg-purple-50 p-3 text-sm text-purple-800">
              Tenant has sent a counter offer: {formatINR(app.proposed_rent)}/month
            </div>
          )}

          {/* Tenant profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="font-medium text-foreground">{tenant?.full_name || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {app.employer_name && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Employer</Label>
                    <p className="font-medium text-foreground">{app.employer_name}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Monthly Income</Label>
                  <p className="font-medium text-foreground">{formatINR(app.monthly_income)}</p>
                </div>
                {app.cibil_range && (
                  <div>
                    <Label className="text-muted-foreground text-xs">CIBIL Range</Label>
                    <Badge variant="secondary" className="text-xs">{app.cibil_range}</Badge>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Proposed Rent</Label>
                  <p className="font-medium text-foreground">{formatINR(app.proposed_rent)}/month</p>
                </div>
                {app.owner_counter_rent != null && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Your Counter Offer</Label>
                    <p className="font-medium text-foreground">{formatINR(app.owner_counter_rent)}/month</p>
                  </div>
                )}
                {property?.listed_rent != null && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Listed Rent</Label>
                    <p className="font-medium text-foreground">{formatINR(property.listed_rent)}/month</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Residents */}
          {residents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Co-Residents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {residents.map((r: any, i: number) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-foreground">{r.full_name}</span>
                    <span className="text-muted-foreground">Age {r.age}</span>
                    {r.gender && <Badge variant="secondary" className="text-xs">{r.gender}</Badge>}
                    {r.occupation && <span className="text-muted-foreground">{r.occupation}</span>}
                    {r.relationship && <span className="text-muted-foreground">({r.relationship})</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Property notes */}
          {notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notesByType).map(([type, items]) => (
                  <div key={type} className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {NOTE_TYPE_LABELS[type] || type}
                    </h4>
                    {items.map((note: any, i: number) => (
                      <div key={i} className="text-sm text-muted-foreground border-l-2 border-border pl-3">
                        <p>{note.description}</p>
                        {note.photo_url && (
                          <img
                            src={note.photo_url}
                            alt="Note attachment"
                            className="mt-1 max-w-[200px] rounded-md"
                            loading="lazy"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          {app.status === "sent_to_owner" && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
                  disabled={actionLoading !== null}
                  onClick={() => handleAction("owner_accepted")}
                >
                  {actionLoading === "owner_accepted" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accept Application
                </Button>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] border-destructive text-destructive hover:bg-destructive/10"
                  disabled={actionLoading !== null}
                  onClick={() => handleAction("owner_rejected")}
                >
                  {actionLoading === "owner_rejected" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reject
                </Button>

                {!showCounterInput ? (
                  <Button
                    variant="outline"
                    className="w-full min-h-[44px] border-amber-500 text-amber-600 hover:bg-amber-50"
                    onClick={() => setShowCounterInput(true)}
                    disabled={actionLoading !== null}
                  >
                    Counter Offer
                  </Button>
                ) : (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <Label className="text-sm">Enter counter rent amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Enter counter rent amount"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      className="min-h-[44px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 min-h-[44px]"
                        disabled={!counterAmount || Number(counterAmount) <= 0 || actionLoading !== null}
                        onClick={() =>
                          handleAction("owner_countered", {
                            owner_counter_rent: Number(counterAmount),
                          })
                        }
                      >
                        {actionLoading === "owner_countered" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Counter Offer
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-[44px]"
                        onClick={() => { setShowCounterInput(false); setCounterAmount(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {app.status === "tenant_countered" && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
                  disabled={actionLoading !== null}
                  onClick={() => handleAction("payment_pending")}
                >
                  {actionLoading === "payment_pending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] border-destructive text-destructive hover:bg-destructive/10"
                  disabled={actionLoading !== null}
                  onClick={() => handleAction("owner_rejected")}
                >
                  {actionLoading === "owner_rejected" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Decline
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
