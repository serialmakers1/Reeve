import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "border-muted-foreground text-muted-foreground" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800" },
  platform_review: { label: "Under Review", color: "bg-amber-100 text-amber-800" },
  sent_to_owner: { label: "Sent to Owner", color: "bg-amber-100 text-amber-800" },
  owner_accepted: { label: "Accepted", color: "bg-green-100 text-green-800" },
  owner_rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  platform_rejected: { label: "Not Approved", color: "bg-red-100 text-red-800" },
  owner_countered: { label: "Counter Offer", color: "bg-purple-100 text-purple-800" },
  tenant_countered: { label: "Counter Sent", color: "bg-purple-100 text-purple-800" },
  payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-800" },
  payment_received: { label: "Payment Received", color: "bg-green-100 text-green-800" },
  kyc_pending: { label: "KYC Pending", color: "bg-amber-100 text-amber-800" },
  kyc_passed: { label: "KYC Passed", color: "bg-green-100 text-green-800" },
  kyc_failed: { label: "KYC Failed", color: "bg-red-100 text-red-800" },
  agreement_pending: { label: "Agreement Pending", color: "bg-amber-100 text-amber-800" },
  lease_active: { label: "Lease Active", color: "bg-green-100 text-green-800" },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-800" },
  withdrawn: { label: "Withdrawn", color: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

function formatRent(val: number) {
  return "₹" + val.toLocaleString("en-IN");
}

interface ApplicationRow {
  id: string;
  status: string;
  attempt_number: number | null;
  proposed_rent: number;
  submitted_at: string | null;
  created_at: string;
  withdrawn_at: string | null;
  reapplication_eligible_from: string | null;
  withdrawal_reason: string | null;
  property_id: string;
  properties: {
    building_name: string;
    locality: string | null;
    bhk: string;
  } | null;
}

export default function ApplicationsList() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data } = await supabase
        .from("applications")
        .select(
          `id, status, attempt_number, proposed_rent, submitted_at, created_at,
           withdrawn_at, reapplication_eligible_from, withdrawal_reason, property_id,
           properties(building_name, locality, bhk)`
        )
        .eq("tenant_id", session.user.id)
        .order("created_at", { ascending: false });

      setApps((data as unknown as ApplicationRow[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("my-applications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `tenant_id=eq.${user.id}`,
        },
        () => { load(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDeleteDraft = async (appId: string) => {
    setDeletingId(appId);
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", appId)
      .eq("status", "draft" as any);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (error) {
      toast({ title: "Could not delete draft. Please try again.", variant: "destructive" });
    } else {
      setApps((prev) => prev.filter((a) => a.id !== appId));
      toast({ title: "Draft deleted." });
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>

        {apps.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No applications yet</p>
            <Button onClick={() => navigate("/search")}>Browse Properties</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                navigate={navigate}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                deletingId={deletingId}
                onDeleteDraft={handleDeleteDraft}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Delete Draft?</h2>
            <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
            <div className="flex gap-3">
              <Button
                className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 text-white"
                disabled={!!deletingId}
                onClick={() => handleDeleteDraft(confirmDeleteId)}
              >
                {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function AppCard({
  app,
  navigate,
  confirmDeleteId,
  setConfirmDeleteId,
  deletingId,
  onDeleteDraft,
}: {
  app: ApplicationRow;
  navigate: ReturnType<typeof useNavigate>;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  deletingId: string | null;
  onDeleteDraft: (id: string) => void;
}) {
  const p = app.properties;
  const propertyLabel = p ? `${p.bhk} in ${p.building_name}` : "Property";
  const localityLabel = p?.locality || "";
  const isDraft = app.status === "draft";
  const isWithdrawn = app.status === "withdrawn";
  const isExpired = app.status === "expired";
  const isRejected = app.status === "owner_rejected" || app.status === "platform_rejected";
  const isOnHold = app.status === "on_hold";
  const isClosed = isWithdrawn || isExpired || isRejected;

  const badge = STATUS_MAP[app.status] || { label: app.status, color: "bg-muted text-muted-foreground" };

  let cardClass = "border-border bg-card";
  if (isDraft) cardClass = "border-dashed border-muted-foreground/40 bg-card";
  else if (isOnHold) cardClass = "border-amber-200 bg-amber-50";
  else if (isRejected) cardClass = "border-red-200 bg-red-50";
  else if (isClosed) cardClass = "border-border bg-muted/30";

  const displayDate = app.submitted_at || app.created_at;

  // Status subtitle
  let subtitle: string | null = null;
  if (isDraft) subtitle = "Draft — not submitted";
  else if (isOnHold) subtitle = "On Hold — another applicant has paid the token.";
  else if (isWithdrawn) subtitle = `Withdrawn${app.withdrawn_at ? " · " + format(new Date(app.withdrawn_at), "d MMM yyyy") : ""}`;
  else if (isExpired) subtitle = `Expired${displayDate ? " · " + format(new Date(displayDate), "d MMM yyyy") : ""}`;
  else if (app.status === "owner_rejected") subtitle = "Rejected by Owner";
  else if (app.status === "platform_rejected") subtitle = "Not Approved by Reeve";

  const handleClick = () => {
    if (!isDraft) {
      navigate(`/dashboard/applications/${app.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`w-full rounded-xl border p-4 text-left shadow-sm transition-shadow ${cardClass} ${
        !isDraft ? "cursor-pointer hover:shadow-md hover:shadow-primary/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`font-semibold truncate ${isClosed ? "text-muted-foreground" : "text-foreground"}`}>
            {propertyLabel}
          </p>
          {localityLabel && (
            <p className="mt-0.5 text-sm text-muted-foreground truncate">{localityLabel}</p>
          )}
          {subtitle && (
            <p className={`mt-0.5 text-sm ${isRejected ? "text-red-600" : isOnHold ? "text-amber-700" : isDraft ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
              {subtitle}
            </p>
          )}
          {app.attempt_number != null && app.attempt_number > 1 && (
            <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Attempt {app.attempt_number} of 3
            </span>
          )}
          {!isDraft && displayDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              {app.submitted_at ? "Applied" : "Started"}: {format(new Date(displayDate), "dd MMM yyyy")}
            </p>
          )}
          {isDraft && (
            <p className="mt-1 text-xs text-muted-foreground">
              Started: {format(new Date(app.created_at), "dd MMM yyyy")}
            </p>
          )}
        </div>
        <Badge
          variant={isDraft ? "outline" : "default"}
          className={`shrink-0 ${badge.color} ${isDraft ? "" : "border-0"}`}
        >
          {badge.label}
        </Badge>
      </div>

      {/* Draft actions */}
      {isDraft && (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="min-h-[44px]"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/dashboard/applications/new?resume=${app.id}`);
            }}
          >
            Continue Draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] border-red-300 text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteId(app.id);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Draft
          </Button>
        </div>
      )}
    </div>
  );
}
