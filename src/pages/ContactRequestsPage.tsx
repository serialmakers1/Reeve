import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { CheckCircle2, Clock, Loader2, Mail, MessageSquare, RotateCw, XCircle } from "lucide-react";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isResendExpiredAt } from "@/lib/resendExpiry";

const DECLINE_LABELS: Record<string, string> = {
  preferences_dont_fit: "Preferences don't fit",
  property_currently_unavailable: "Property currently unavailable",
  prefer_to_wait: "Prefer to wait for now",
  not_the_right_fit: "Not the right fit right now",
  property_no_longer_available: "Property no longer available",
};

type CrStatus = "pending" | "approved" | "declined" | "withdrawn" | "auto_cancelled";

interface PropertyBrief {
  id: string;
  building_name: string | null;
  locality: string | null;
  status: string | null;
  is_active: boolean | null;
}

interface CrRow {
  id: string;
  property_id: string;
  status: CrStatus;
  attempt_number: number;
  decline_reason: string | null;
  created_at: string;
  approved_at: string | null;
  declined_at: string | null;
  withdrawn_at: string | null;
  auto_cancelled_at: string | null;
  tenant_profile_snapshot: { preference_type?: string } | null;
  properties: PropertyBrief | null;
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return format(new Date(v), "d MMM yyyy"); } catch { return v; }
}

function fmtRelative(v: string | null | undefined) {
  if (!v) return "";
  try {
    const d = new Date(v);
    const now = Date.now();
    const diffMin = Math.floor((now - d.getTime()) / 60_000);
    if (diffMin < 60) return "just now";
    if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h ago`;
    if (diffMin < 60 * 24 * 2) return "yesterday";
    return `${Math.floor(diffMin / (60 * 24))} days ago`;
  } catch { return ""; }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ContactRequestsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CrRow[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [resending, setResending] = useState<Record<string, boolean>>({});
  const [serverExpiredIds, setServerExpiredIds] = useState<Set<string>>(new Set());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    const sb = supabase as unknown as { from: (t: string) => any };
    const { data, error } = await sb
      .from("contact_requests")
      .select("id, property_id, status, attempt_number, decline_reason, created_at, approved_at, declined_at, withdrawn_at, auto_cancelled_at, tenant_profile_snapshot, properties!inner(id, building_name, locality, status, is_active)")
      .eq("tenant_id", user.id)
      .in("properties.status", ["listed", "edit_pending_review"])
      .eq("properties.is_active", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("CR_PAGE_FETCH_ERROR", error);
      setFetchError(true);
      setRows([]);
      return;
    }
    setFetchError(false);
    setRows((data ?? []) as CrRow[]);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    refetch();
  }, [authLoading, user?.id, refetch]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`cr_page:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests", filter: `tenant_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refetch]);

  // Visibility / focus refresh
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    const onFocus = () => refetch();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetch]);

  // Cooldown tick (only when any declined row is still cooling down)
  const hasActiveCooldown = useMemo(() => {
    if (!rows) return false;
    return rows.some(
      (r) =>
        r.status === "declined" &&
        r.declined_at &&
        r.attempt_number < 3 &&
        new Date(r.declined_at).getTime() + 24 * 60 * 60 * 1000 > Date.now(),
    );
  }, [rows]);

  useEffect(() => {
    if (!hasActiveCooldown) return;
    tickRef.current = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [hasActiveCooldown]);

  // Actions
  const handleWithdraw = async () => {
    if (!withdrawTarget || !user?.id || withdrawing) return;
    setWithdrawing(true);
    try {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { error } = await sb.from("contact_requests")
        .update({ status: "withdrawn" })
        .eq("id", withdrawTarget)
        .eq("tenant_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
      toast.success("Request withdrawn.");
      setRows((prev) => prev?.map((r) =>
        r.id === withdrawTarget ? { ...r, status: "withdrawn" as CrStatus, withdrawn_at: new Date().toISOString() } : r,
      ) ?? prev);
      setWithdrawTarget(null);
    } catch {
      toast.error("Could not withdraw. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleResend = async (r: CrRow) => {
    if (resending[r.id]) return;
    setResending((s) => ({ ...s, [r.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("resend-reveal", {
        body: { contact_request_id: r.id },
      });
      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      const body = (data ?? (error as { context?: unknown } | null)?.context) as
        | { sent?: boolean; error?: string; retry_after_seconds?: number }
        | null;
      if (!error && body?.sent) {
        toast.success("Sent — check your inbox.");
      } else if (body?.error === "resend_expired") {
        setServerExpiredIds((current) => {
          const next = new Set(current);
          next.add(r.id);
          return next;
        });
      } else if (status === 429 && body?.error === "daily_resend_limit") {
        toast.error("Daily resend limit reached.");
      } else if (status === 429 || body?.error === "cooldown_active") {
        toast.error("Please wait before resending.");
      } else {
        toast.error("Could not resend right now. Please try again.");
      }
    } catch {
      toast.error("Could not resend right now. Please try again.");
    } finally {
      setResending((s) => ({ ...s, [r.id]: false }));
    }
  };

  // Tab data
  const allRows = rows ?? [];
  const tabData = {
    all: allRows,
    pending: allRows.filter((r) => r.status === "pending"),
    approved: allRows.filter((r) => r.status === "approved"),
    declined: allRows.filter((r) => r.status === "declined"),
    closed: allRows.filter((r) => r.status === "withdrawn" || r.status === "auto_cancelled"),
  };

  if (authLoading || rows === null) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-56" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Contact Requests</h1>
        </div>

        {fetchError ? (
          <div className="rounded-lg border bg-card p-5 space-y-2">
            <p className="text-sm text-muted-foreground">Could not load contact requests.</p>
            <Button variant="outline" size="sm" onClick={() => { setFetchError(false); setRows(null); refetch(); }}>
              Retry
            </Button>
          </div>
        ) : allRows.length === 0 ? (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <p className="text-sm text-muted-foreground">No contact requests for currently available properties.</p>
            <Button variant="outline" onClick={() => navigate("/search")}>Browse properties →</Button>
            <p className="text-xs text-muted-foreground">Requests for properties that are no longer listed are not shown here.</p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="all">
              <div className="overflow-x-auto">
                <TabsList className="w-max">
                  <TabsTrigger value="all">
                    All
                    {tabData.all.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{tabData.all.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending
                    {tabData.pending.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{tabData.pending.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    Approved
                    {tabData.approved.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] bg-emerald-100 text-emerald-800">{tabData.approved.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="declined">
                    Declined
                    {tabData.declined.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{tabData.declined.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="closed">
                    Closed
                    {tabData.closed.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{tabData.closed.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="space-y-3 mt-4">
                {tabData.all.length === 0
                  ? <EmptyTab message="No requests to show." />
                  : tabData.all.map((r) => <RequestCard key={r.id} r={r} nowMs={nowMs} resending={resending} serverExpiredIds={serverExpiredIds} onWithdraw={setWithdrawTarget} onResend={handleResend} navigate={navigate} />)}
              </TabsContent>

              <TabsContent value="pending" className="space-y-3 mt-4">
                {tabData.pending.length === 0
                  ? <EmptyTab message="No pending requests." />
                  : tabData.pending.map((r) => <RequestCard key={r.id} r={r} nowMs={nowMs} resending={resending} serverExpiredIds={serverExpiredIds} onWithdraw={setWithdrawTarget} onResend={handleResend} navigate={navigate} />)}
              </TabsContent>

              <TabsContent value="approved" className="space-y-3 mt-4">
                {tabData.approved.length === 0
                  ? <EmptyTab message="No approved requests." />
                  : tabData.approved.map((r) => <RequestCard key={r.id} r={r} nowMs={nowMs} resending={resending} serverExpiredIds={serverExpiredIds} onWithdraw={setWithdrawTarget} onResend={handleResend} navigate={navigate} />)}
              </TabsContent>

              <TabsContent value="declined" className="space-y-3 mt-4">
                {tabData.declined.length === 0
                  ? <EmptyTab message="No declined requests." />
                  : tabData.declined.map((r) => <RequestCard key={r.id} r={r} nowMs={nowMs} resending={resending} serverExpiredIds={serverExpiredIds} onWithdraw={setWithdrawTarget} onResend={handleResend} navigate={navigate} />)}
              </TabsContent>

              <TabsContent value="closed" className="space-y-3 mt-4">
                {tabData.closed.length === 0
                  ? <EmptyTab message="No closed requests." />
                  : tabData.closed.map((r) => <RequestCard key={r.id} r={r} nowMs={nowMs} resending={resending} serverExpiredIds={serverExpiredIds} onWithdraw={setWithdrawTarget} onResend={handleResend} navigate={navigate} />)}
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground border-t pt-4">
              Only requests for currently listed properties are shown. If a property is unlisted or removed, its requests will no longer appear here.
            </p>
          </>
        )}
      </div>

      <AlertDialog open={!!withdrawTarget} onOpenChange={(o) => { if (!o) setWithdrawTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw your request?</AlertDialogTitle>
            <AlertDialogDescription>The owner will no longer see it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function EmptyTab({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground py-2">{message}</p>;
}

function RequestCard({
  r, nowMs, resending, serverExpiredIds, onWithdraw, onResend, navigate,
}: {
  r: CrRow;
  nowMs: number;
  resending: Record<string, boolean>;
  serverExpiredIds: Set<string>;
  onWithdraw: (id: string) => void;
  onResend: (r: CrRow) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const propertyLabel =
    r.properties?.building_name?.trim() ||
    (r.properties?.locality ? `Property in ${r.properties.locality}` : "Property");

  const preferenceType = r.tenant_profile_snapshot?.preference_type;
  const prefLabel = preferenceType === "buy" ? "Buy" : preferenceType === "rent" ? "Rent" : null;

  const propertyId = r.properties?.id ?? r.property_id;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/property/${propertyId}`} className="text-sm font-medium text-foreground hover:underline">
            {propertyLabel}
          </Link>
          {r.properties?.locality && r.properties.building_name && (
            <p className="text-xs text-muted-foreground">{r.properties.locality}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {prefLabel && (
            <Badge variant="secondary" className="text-[10px]">{prefLabel}</Badge>
          )}
        </div>
      </div>

      {/* Status-specific content */}
      {r.status === "pending" && <PendingContent r={r} onWithdraw={onWithdraw} />}
      {r.status === "approved" && (
        <ApprovedContent
          r={r}
          resending={resending}
          serverExpiredIds={serverExpiredIds}
          onResend={onResend}
        />
      )}
      {r.status === "declined" && <DeclinedContent r={r} nowMs={nowMs} navigate={navigate} />}
      {r.status === "withdrawn" && <WithdrawnContent r={r} />}
      {r.status === "auto_cancelled" && <AutoCancelledContent r={r} />}
    </div>
  );
}

function PendingContent({ r, onWithdraw }: { r: CrRow; onWithdraw: (id: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Awaiting owner response · The owner has been notified.</p>
      </div>
      <p className="text-xs text-muted-foreground">Sent {fmtRelative(r.created_at)}</p>
      <div className="pt-1">
        <Button variant="outline" size="sm" onClick={() => onWithdraw(r.id)}>
          Withdraw
        </Button>
      </div>
    </>
  );
}

function ApprovedContent({
  r, resending, serverExpiredIds, onResend,
}: {
  r: CrRow;
  resending: Record<string, boolean>;
  serverExpiredIds: Set<string>;
  onResend: (r: CrRow) => void;
}) {
  const expired = isResendExpiredAt(r.approved_at, Date.now()) || serverExpiredIds.has(r.id);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-xs text-muted-foreground">Contact details were sent to your email</p>
      </div>
      <p className="text-xs text-muted-foreground">Approved {fmtDate(r.approved_at)}</p>
      {expired ? (
        <p className="text-sm text-muted-foreground">
          Contact details were emailed on {fmtDate(r.approved_at)}. Resending was available for 15 days and has now expired.
        </p>
      ) : (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResend(r)}
            disabled={resending[r.id]}
          >
            {resending[r.id]
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <Mail className="h-3.5 w-3.5 mr-1.5" />}
            Resend to my email
          </Button>
        </div>
      )}
      {/* REVIEW_SLOT: future <PendingRatingsSection onlyForContactRequestId={r.id} /> */}
    </>
  );
}

function DeclinedContent({
  r, nowMs, navigate,
}: {
  r: CrRow;
  nowMs: number;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const cooldownUntilMs = r.declined_at ? new Date(r.declined_at).getTime() + 24 * 60 * 60 * 1000 : 0;
  const inCooldown = cooldownUntilMs > nowMs;
  const maxed = r.attempt_number >= 3;
  const remaining = 3 - r.attempt_number;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
        <Badge variant="secondary" className="text-[10px]">Declined</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{DECLINE_LABELS[r.decline_reason ?? ""] ?? "—"}</p>
      <p className="text-xs text-muted-foreground">
        Attempt {r.attempt_number} of 3 · {fmtDate(r.declined_at)}
      </p>
      <p className="text-xs text-muted-foreground">
        {maxed ? "No more attempts" : `${remaining} attempt${remaining !== 1 ? "s" : ""} remaining`}
      </p>
      {maxed ? (
        <p className="text-xs text-muted-foreground">Maximum requests reached for this property.</p>
      ) : inCooldown ? (
        <div className="pt-1">
          <Button variant="outline" size="sm" disabled>
            Available in {formatCountdown(cooldownUntilMs - nowMs)}
          </Button>
        </div>
      ) : (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => r.properties?.id && navigate(`/property/${r.properties.id}`)}
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Request again
          </Button>
        </div>
      )}
    </>
  );
}

function WithdrawnContent({ r }: { r: CrRow }) {
  return (
    <>
      <p className="text-xs text-muted-foreground">You withdrew this request</p>
      <p className="text-xs text-muted-foreground">{fmtDate(r.withdrawn_at)}</p>
    </>
  );
}

function AutoCancelledContent({ r }: { r: CrRow }) {
  return (
    <>
      <p className="text-xs text-muted-foreground">Your request was cancelled because this property became unavailable</p>
      <p className="text-xs text-muted-foreground">{fmtDate(r.auto_cancelled_at)}</p>
    </>
  );
}
