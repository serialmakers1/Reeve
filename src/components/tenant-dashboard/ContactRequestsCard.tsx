import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Clock, Loader2, Mail, MessageSquare, RotateCw, XCircle } from "lucide-react";

// Phase 3 Prompt 5 — Tenant Contact Requests dashboard card.
// Symmetric to owner's RequestsTab but tenant-facing:
// - Withdraw on pending (client UPDATE, RLS covers)
// - Resend on approved (calls resend-reveal Edge Function)
// - Re-request on declined → navigates to /property/:id (delegates to
//   RequestContactPanel; never re-implements submit logic here).

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

function propertyTitle(p: PropertyBrief | null): string {
  if (!p) return "Property";
  const parts = [p.building_name?.trim(), p.locality?.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Property";
}

export default function ContactRequestsCard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CrRow[] | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [resending, setResending] = useState<Record<string, boolean>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const refetch = useCallback(async () => {
    if (!user?.id) return;
    const sb = supabase as unknown as { from: (t: string) => any };
    const { data, error } = await sb.from("contact_requests")
      .select("id,property_id,status,attempt_number,decline_reason,created_at,approved_at,declined_at,withdrawn_at,auto_cancelled_at,properties(id,building_name,locality,status)")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("TENANT_REQUESTS_FETCH_ERROR", error);
      setRows([]);
      return;
    }
    setRows((data ?? []) as CrRow[]);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refetch();
  }, [authLoading, isAuthenticated, refetch]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const channel = supabase
      .channel(`contact_requests:tenant:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests", filter: `tenant_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, user?.id, refetch]);

  // ── Cooldown tick (only when any declined row is still cooling down) ─────
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

  // ── Grouping ─────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const list = rows ?? [];
    const g = { pending: [] as CrRow[], approved: [] as CrRow[], declined: [] as CrRow[], withdrawn: [] as CrRow[], auto_cancelled: [] as CrRow[] };
    for (const r of list) g[r.status].push(r);
    return g;
  }, [rows]);

  const totalNonTerminal = grouped.pending.length + grouped.approved.length;

  // ── Actions ──────────────────────────────────────────────────────────────
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
      // Optimistic — realtime will reconcile.
      setRows((prev) => prev?.map((r) =>
        r.id === withdrawTarget ? { ...r, status: "withdrawn", withdrawn_at: new Date().toISOString() } : r,
      ) ?? prev);
      setWithdrawTarget(null);
    } catch {
      toast.error("Could not withdraw. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleResend = async (id: string) => {
    if (resending[id]) return;
    setResending((s) => ({ ...s, [id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("resend-reveal", {
        body: { contact_request_id: id },
      });
      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      const body = (data ?? (error as { context?: unknown } | null)?.context) as
        | { sent?: boolean; error?: string; retry_after_seconds?: number }
        | null;
      if (!error && body?.sent) {
        toast.success("Sent — check your inbox.");
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
      setResending((s) => ({ ...s, [id]: false }));
    }
  };

  // ── Card shell ───────────────────────────────────────────────────────────
  const shell = (children: React.ReactNode, badge?: number) => (
    <section className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Contact Requests</h2>
        </div>
        {badge !== undefined && badge > 0 && (
          <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">{badge}</Badge>
        )}
      </div>
      {children}
    </section>
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (authLoading || rows === null) {
    return shell(<Skeleton className="h-24 w-full" />);
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return shell(
      <>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You haven't sent any contact requests yet. Browse properties and request owner contact when you find a match.
        </p>
        <Button variant="outline" onClick={() => navigate("/search")}>Browse properties →</Button>
      </>,
    );
  }

  return shell(
    <div className="space-y-4">
      {/* Pending */}
      {grouped.pending.length > 0 && (
        <Section title="Pending" icon={<Clock className="h-3.5 w-3.5" />}>
          {grouped.pending.map((r) => (
            <RowCard key={r.id} r={r}>
              <p className="text-xs text-muted-foreground">
                Pending · Owner notified daily at 9 AM
              </p>
              <p className="text-xs text-muted-foreground">
                Sent {fmtRelative(r.created_at)}
              </p>
              <div className="pt-1">
                <Button variant="outline" size="sm" onClick={() => setWithdrawTarget(r.id)}>
                  Withdraw
                </Button>
              </div>
            </RowCard>
          ))}
        </Section>
      )}

      {/* Approved */}
      {grouped.approved.length > 0 && (
        <Section title="Approved" icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}>
          {grouped.approved.map((r) => (
            <RowCard key={r.id} r={r} badgeText="Approved" badgeTone="emerald">
              <p className="text-xs text-muted-foreground">Contact details sent to your email.</p>
              <p className="text-xs text-muted-foreground">Approved {fmtDate(r.approved_at)}</p>
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResend(r.id)}
                  disabled={resending[r.id]}
                >
                  {resending[r.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Mail className="h-3.5 w-3.5 mr-1.5" />}
                  Resend to my email
                </Button>
              </div>
            </RowCard>
          ))}
        </Section>
      )}

      {/* Declined */}
      {grouped.declined.length > 0 && (
        <Section title="Declined" icon={<XCircle className="h-3.5 w-3.5" />}>
          {grouped.declined.map((r) => {
            const cooldownUntilMs = r.declined_at ? new Date(r.declined_at).getTime() + 24 * 60 * 60 * 1000 : 0;
            const inCooldown = cooldownUntilMs > nowMs;
            const maxed = r.attempt_number >= 3;
            return (
              <RowCard key={r.id} r={r} badgeText="Declined" badgeTone="muted">
                <p className="text-xs text-muted-foreground">
                  {DECLINE_LABELS[r.decline_reason ?? ""] ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Attempt {r.attempt_number} of 3 used · {fmtDate(r.declined_at)}
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
              </RowCard>
            );
          })}
        </Section>
      )}

      {/* Withdrawn */}
      {grouped.withdrawn.length > 0 && (
        <Section title="Withdrawn">
          {grouped.withdrawn.map((r) => (
            <RowCard key={r.id} r={r}>
              <p className="text-xs text-muted-foreground">You withdrew this request.</p>
              <p className="text-xs text-muted-foreground">{fmtDate(r.withdrawn_at)}</p>
            </RowCard>
          ))}
        </Section>
      )}

      {/* Auto-cancelled */}
      {grouped.auto_cancelled.length > 0 && (
        <Section title="Auto-cancelled">
          {grouped.auto_cancelled.map((r) => (
            <RowCard key={r.id} r={r}>
              <p className="text-xs text-muted-foreground">
                This request was cancelled — the property is no longer active.
              </p>
              <p className="text-xs text-muted-foreground">{fmtDate(r.auto_cancelled_at)}</p>
            </RowCard>
          ))}
        </Section>
      )}

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
    </div>,
    totalNonTerminal,
  );
}

// ── Small sub-components ────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
        {icon}{title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RowCard({
  r, badgeText, badgeTone, children,
}: {
  r: CrRow;
  badgeText?: string;
  badgeTone?: "emerald" | "muted";
  children: React.ReactNode;
}) {
  const propId = r.properties?.id ?? r.property_id;
  const toneClass =
    badgeTone === "emerald"
      ? "bg-emerald-100 text-emerald-800 border-transparent"
      : "bg-muted text-muted-foreground border-transparent";
  return (
    <div className="rounded-lg border p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/property/${propId}`} className="text-sm font-medium text-foreground hover:underline">
          {propertyTitle(r.properties)}
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          {r.attempt_number > 1 && (
            <Badge variant="secondary" className="text-[10px]">Attempt {r.attempt_number} of 3</Badge>
          )}
          {badgeText && <Badge className={`text-[10px] ${toneClass}`}>{badgeText}</Badge>}
        </div>
      </div>
      {children}
    </div>
  );
}
