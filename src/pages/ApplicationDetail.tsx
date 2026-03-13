import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800" },
  platform_review: { label: "Under Review", color: "bg-amber-100 text-amber-800" },
  sent_to_owner: { label: "Sent to Owner", color: "bg-amber-100 text-amber-800" },
  owner_accepted: { label: "Accepted", color: "bg-green-100 text-green-800" },
  owner_rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  owner_countered: { label: "Counter Offer", color: "bg-purple-100 text-purple-800" },
  tenant_countered: { label: "Counter Sent", color: "bg-purple-100 text-purple-800" },
  payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-800" },
  payment_received: { label: "Payment Received", color: "bg-green-100 text-green-800" },
  kyc_pending: { label: "KYC Pending", color: "bg-amber-100 text-amber-800" },
  kyc_passed: { label: "KYC Passed", color: "bg-green-100 text-green-800" },
  kyc_failed: { label: "KYC Failed", color: "bg-red-100 text-red-800" },
  agreement_pending: { label: "Agreement Pending", color: "bg-amber-100 text-amber-800" },
  lease_active: { label: "Lease Active", color: "bg-green-100 text-green-800" },
  withdrawn: { label: "Withdrawn", color: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

const STEP_ORDER = [
  "submitted",
  "platform_review",
  "sent_to_owner",
  "owner_accepted",
  "owner_rejected",
  "owner_countered",
  "tenant_countered",
  "payment_pending",
  "payment_received",
  "kyc_pending",
  "kyc_passed",
  "kyc_failed",
  "agreement_pending",
  "lease_active",
  "withdrawn",
  "expired",
];

function statusIndex(status: string) {
  const i = STEP_ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}

const TIMELINE_STEPS = [
  { label: "Submitted", minIndex: 0 },
  { label: "Under Review", minIndex: 1 },
  { label: "Sent to Owner", minIndex: 2 },
  { label: "Owner Decision", minIndex: 3 },
  { label: "Next Steps", minIndex: 7 },
];

function formatRent(val: number) {
  return "₹" + val.toLocaleString("en-IN");
}

interface AppDetail {
  id: string;
  status: string;
  attempt_number: number | null;
  proposed_rent: number;
  owner_counter_rent: number | null;
  submitted_at: string | null;
  updated_at: string;
  properties: {
    building_name: string;
    locality: string | null;
    city: string;
    bhk: string;
    listed_rent: number;
  } | null;
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const WITHDRAWABLE_STATUSES = [
    "submitted", "platform_review", "sent_to_owner",
    "owner_countered", "tenant_countered",
  ];

  useEffect(() => {
    if (!user || !id) return;

    const load = async () => {
      const { data } = await supabase
        .from("applications")
        .select(
          `id, status, attempt_number, proposed_rent, owner_counter_rent, submitted_at, updated_at,
           properties(building_name, locality, city, bhk, listed_rent)`
        )
        .eq("id", id)
        .eq("tenant_id", user.id)
        .maybeSingle();

      setApp(data as unknown as AppDetail | null);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`app-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setApp((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, id]);

  const handleAccept = async () => {
    if (!app) return;
    setSaving("accept");
    const { error } = await supabase
      .from("applications")
      .update({
        status: "payment_pending" as any,
        proposed_rent: app.owner_counter_rent!,
      })
      .eq("id", app.id);
    setSaving(null);
    if (error) {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const handleDecline = async () => {
    if (!app) return;
    setSaving("decline");
    const { error } = await supabase
      .from("applications")
      .update({ status: "withdrawn" as any })
      .eq("id", app.id);
    setSaving(null);
    if (error) {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const handleWithdraw = async () => {
    if (!app || !selectedReason) return;
    setWithdrawing(true);
    const reason =
      selectedReason === "Other" && otherText
        ? `Other: ${otherText}`
        : selectedReason;
    const { error } = await supabase
      .from("applications")
      .update({
        status: "withdrawn" as any,
        withdrawal_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", app.id);
    setWithdrawing(false);
    if (error) {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Application withdrawn." });
    navigate("/dashboard/applications");
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!app) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-muted-foreground">Application not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </div>
      </Layout>
    );
  }

  const p = app.properties;
  const badge = STATUS_MAP[app.status] || {
    label: app.status,
    color: "bg-muted text-muted-foreground",
  };
  const si = statusIndex(app.status);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {p ? `${p.bhk} in ${p.building_name}, ${p.locality || p.city}` : "Application"}
            </h1>
            <Badge className={`shrink-0 ${badge.color} border-0`}>{badge.label}</Badge>
          </div>
          {app.submitted_at && (
            <p className="text-sm text-muted-foreground">
              Submitted: {format(new Date(app.submitted_at), "dd MMM yyyy, h:mm a")}
            </p>
          )}
          {app.attempt_number != null && app.attempt_number > 1 && (
            <span className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              Attempt {app.attempt_number} of 3
            </span>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {TIMELINE_STEPS.map((step, idx) => {
            const done = si >= step.minIndex;
            const isCurrent = idx < TIMELINE_STEPS.length - 1
              ? si >= step.minIndex && si < TIMELINE_STEPS[idx + 1].minIndex
              : si >= step.minIndex;
            return (
              <div key={step.label} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background"
                    }`}
                  >
                    {done && <Check className="h-3.5 w-3.5" />}
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-8 ${
                        done ? "bg-primary" : "bg-muted-foreground/20"
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`pt-0.5 text-sm font-medium ${
                    isCurrent
                      ? "text-primary"
                      : done
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Counter offer section */}
        {app.status === "owner_countered" && app.owner_counter_rent && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
            <p className="text-sm font-medium text-amber-800">
              The owner has made a counter offer
            </p>
            <div className="space-y-1 text-sm">
              <p className="text-foreground">
                Owner's counter:{" "}
                <span className="font-semibold">
                  {formatRent(app.owner_counter_rent)}/month
                </span>
              </p>
              <p className="text-muted-foreground">
                Your original offer: {formatRent(app.proposed_rent)}/month
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleAccept}
                disabled={!!saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving === "accept" && <Loader2 className="h-4 w-4 animate-spin" />}
                Accept Counter Offer
              </Button>
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={!!saving}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {saving === "decline" && <Loader2 className="h-4 w-4 animate-spin" />}
                Decline
              </Button>
            </div>
          </div>
        )}
        {/* Withdraw button */}
        {WITHDRAWABLE_STATUSES.includes(app.status) && (
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="text-sm text-red-500 underline mt-6"
          >
            Withdraw this application
          </button>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Withdraw Application?</h2>
              <button onClick={() => setShowWithdrawModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reason for withdrawing</label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I found another property">I found another property</SelectItem>
                  <SelectItem value="Change of plans">Change of plans</SelectItem>
                  <SelectItem value="I want to update my application details">I want to update my application details</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedReason === "Other" && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Please specify (optional)</label>
                <Input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Tell us more..."
                />
              </div>
            )}
            <Button
              className="w-full min-h-[44px] bg-red-600 hover:bg-red-700 text-white"
              disabled={!selectedReason || withdrawing}
              onClick={handleWithdraw}
            >
              {withdrawing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Withdrawing...</> : "Confirm Withdrawal"}
            </Button>
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
