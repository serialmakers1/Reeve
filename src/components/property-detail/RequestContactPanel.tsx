import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, Loader2, Mail, ShieldCheck, XCircle } from "lucide-react";

// Phase 3 Prompt 3 — Request Contact panel.
// Owns all 7 button-state logic (D-P3-006), consent capture (D-P3-010),
// realtime updates on the tenant's own contact_request row, and the compact
// owner response-rate block (D-P3-009).

export interface RequestContactPanelProps {
  propertyId: string;
  ownerId: string;
  ownerDisplayName?: string | null;
  buildingName: string;
  propertyStatus: string;
}

const REQUIRED_PREF_KEYS = [
  "age",
  "gender",
  "number_of_occupants",
  "occupation",
  "expected_stay_duration",
] as const;

const ELIGIBLE_STATUSES = new Set(["listed", "edit_pending_review"]);

type CrStatus = "pending" | "approved" | "declined" | "withdrawn" | "auto_cancelled";
interface CrRow {
  id: string;
  status: CrStatus;
  attempt_number: number;
  decline_reason: string | null;
  declined_at: string | null;
  approved_at: string | null;
}

interface ResponseRate {
  all_time_handled: number;
  all_time_responded: number;
  last_7d_handled: number;
  last_7d_responded: number;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function RequestContactPanel(props: RequestContactPanelProps) {
  const { propertyId, ownerId, ownerDisplayName, buildingName, propertyStatus } = props;
  const { user, isAuthenticated, isLoading: authLoading, isFullyVerified } = useAuth();
  const navigate = useNavigate();

  const isOwner = !!(user?.id && ownerId === user.id);
  const statusEligible = ELIGIBLE_STATUSES.has(propertyStatus);

  const [dataLoading, setDataLoading] = useState(true);
  const [cr, setCr] = useState<CrRow | null>(null);
  const [prefsIncomplete, setPrefsIncomplete] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [rate, setRate] = useState<ResponseRate | null>(null);

  // Panel form state
  const [message, setMessage] = useState("");
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentShare, setConsentShare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [resending, setResending] = useState(false);

  // Live cooldown tick
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch owner response rate (public — always) ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as unknown as { rpc: (n: string, args?: unknown) => any })
        .rpc("get_owner_response_rate", { p_owner_id: ownerId });
      if (cancelled) return;
      if (error) {
        console.warn("get_owner_response_rate failed", error);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setRate(row as ResponseRate);
    })();
    return () => { cancelled = true; };
  }, [ownerId]);

  // ── Fetch tenant-scoped data (cr row + prefs + remaining) ──────────────────
  const refetchTenantData = useCallback(async () => {
    if (!user?.id) return;
    setDataLoading(true);
    try {
      // Supabase types.ts generic-inference noise (CLAUDE.md baseline) — use `any` cast.
      const sb = supabase as unknown as { from: (t: string) => any; rpc: (n: string, args?: unknown) => any };
      const [crRes, prefRes, remRes] = await Promise.all([
        sb.from("contact_requests")
          .select("id,status,attempt_number,decline_reason,declined_at,approved_at")
          .eq("tenant_id", user.id)
          .eq("property_id", propertyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb.from("rental_preferences")
          .select("age,gender,number_of_occupants,occupation,expected_stay_duration")
          .eq("user_id", user.id)
          .maybeSingle(),
        sb.rpc("get_my_daily_request_remaining"),
      ]);

      setCr((crRes.data as CrRow | null) ?? null);

      const pr = prefRes.data as Record<string, unknown> | null;
      const incomplete = !pr || REQUIRED_PREF_KEYS.some((k) => pr[k] === null || pr[k] === undefined);
      setPrefsIncomplete(incomplete);

      const rem = typeof remRes.data === "number" ? remRes.data : null;
      setRemaining(rem);
    } finally {
      setDataLoading(false);
    }
  }, [propertyId, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.id || isOwner || !statusEligible) {
      setDataLoading(false);
      return;
    }
    refetchTenantData();
  }, [authLoading, isAuthenticated, user?.id, isOwner, statusEligible, refetchTenantData]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id || isOwner) return;
    const channel = supabase
      .channel(`contact_requests:${user.id}:${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_requests",
          filter: `tenant_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { property_id?: string } | undefined;
          if (row?.property_id === propertyId) {
            refetchTenantData();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, user?.id, isOwner, propertyId, refetchTenantData]);

  // ── Cooldown tick (per-minute) ─────────────────────────────────────────────
  const cooldownUntilMs = useMemo(() => {
    if (!cr || cr.status !== "declined" || !cr.declined_at) return null;
    return new Date(cr.declined_at).getTime() + 24 * 60 * 60 * 1000;
  }, [cr]);

  useEffect(() => {
    if (!cooldownUntilMs) return;
    if (Date.now() >= cooldownUntilMs) return;
    tickRef.current = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [cooldownUntilMs]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const declinedCount = 0; // handled server-side; UI derives 3/3 via attempt_number of latest declined row
  const isMaxedOut =
    cr?.status === "declined" && cr.attempt_number >= 3;

  const inCooldown = !!(cooldownUntilMs && nowMs < cooldownUntilMs);
  const cooldownLabel = inCooldown ? formatCountdown(cooldownUntilMs! - nowMs) : "";

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleUnauthClick = () => {
    // Reuse VerificationGate redirect shape used elsewhere in the app.
    navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  };

  const handleSubmit = async () => {
    if (!consentTerms || !consentShare || submitting) return;
    setSubmitting(true);
    try {
      const consent_checked_at = new Date().toISOString();
      const { data, error } = await supabase.functions.invoke("submit-contact-request", {
        body: {
          property_id: propertyId,
          tenant_message: message.trim() || null,
          consent_checked_at,
        },
      });

      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      const errBody = (data ?? (error as { context?: { error?: string } } | null)?.context) as
        | { error?: string; message?: string; redirect?: string; id?: string; attempt_number?: number }
        | null;

      if (!error && errBody?.id) {
        toast.success("Request sent — the owner will be notified.");
        await refetchTenantData();
        setMessage("");
        setConsentTerms(false);
        setConsentShare(false);
        return;
      }

      // Error path
      const code = errBody?.error;
      if (status === 409 || code === "request_already_active") {
        toast.error("You already have an active request for this property.");
        await refetchTenantData();
      } else if (status === 429 || code === "daily_limit_reached") {
        toast.error("You've reached today's limit.");
        await refetchTenantData();
      } else if (code === "preferences_incomplete") {
        toast.error("Please complete your rental preferences first.");
        navigate(errBody?.redirect ?? "/tenant-dashboard/preferences");
      } else if (code === "trigger_violation") {
        toast.error(errBody?.message ?? "Unable to send request right now.");
        await refetchTenantData();
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!cr?.id || withdrawing) return;
    setWithdrawing(true);
    try {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { error } = await sb.from("contact_requests")
        .update({ status: "withdrawn" })
        .eq("id", cr.id)
        .eq("status", "pending");
      if (error) throw error;
      toast.success("Request withdrawn.");
      setWithdrawOpen(false);
      await refetchTenantData();
    } catch {
      toast.error("Could not withdraw the request. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleResend = async () => {
    if (!cr?.id || resending) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-reveal", {
        body: { contact_request_id: cr.id },
      });
      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      const errBody = (data ?? (error as { context?: { error?: string } } | null)?.context) as
        | { error?: string; sent?: boolean }
        | null;
      if (!error && errBody?.sent) {
        toast.success("Sent — check your inbox.");
      } else if (status === 429 || errBody?.error === "cooldown_active" || errBody?.error === "daily_resend_limit") {
        toast.error("Please wait before resending.");
      } else {
        toast.error("Could not resend right now. Please try again.");
      }
    } catch {
      toast.error("Could not resend right now. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!statusEligible) return null;
  if (isOwner) return null;
  if (authLoading) {
    return (
      <Card className="my-6">
        <CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  // ── State 1 — not authenticated ────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <Card className="my-6 border-primary/20">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <OwnerRateBlock rate={rate} />
          <div>
            <h3 className="text-base font-semibold">Request owner's contact</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to send a contact request. If the owner approves, you'll receive their phone number over email.
            </p>
          </div>
          <Button className="w-full sm:w-auto min-h-[44px]" onClick={handleUnauthClick}>
            Request owner's contact
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Data still loading (post-auth)
  if (dataLoading) {
    return (
      <Card className="my-6"><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
    );
  }

  const displayOwner = ownerDisplayName?.trim() || "the owner";

  // ── State 6 — pending ──────────────────────────────────────────────────────
  if (cr?.status === "pending") {
    return (
      <>
        <Card className="my-6 border-amber-300/60 bg-amber-50/40">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <OwnerRateBlock rate={rate} />
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Your request is pending</p>
                <p className="text-sm text-muted-foreground">Owner is notified daily at 9 AM.</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
              Withdraw request
            </Button>
          </CardContent>
        </Card>
        <AlertDialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
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
      </>
    );
  }

  // ── State 7 — approved ─────────────────────────────────────────────────────
  if (cr?.status === "approved") {
    return (
      <Card className="my-6 border-emerald-300/60 bg-emerald-50/40">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <OwnerRateBlock rate={rate} />
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Request approved</p>
              <p className="text-sm text-muted-foreground">Contact details sent to your email.</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleResend} disabled={resending}>
            {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Resend to my email
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── State 5 — 3/3 declined, hidden ─────────────────────────────────────────
  if (isMaxedOut) {
    return (
      <Card className="my-6">
        <CardContent className="p-4 sm:p-5 space-y-2">
          <OwnerRateBlock rate={rate} />
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              You've reached the maximum number of contact requests for this property.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Normal panel with per-state Submit gating ──────────────────────────────
  const showQuota = remaining !== null && remaining < 10;
  const dailyCapHit = remaining === 0;
  const submitDisabled =
    submitting ||
    prefsIncomplete ||
    dailyCapHit ||
    inCooldown ||
    !consentTerms ||
    !consentShare ||
    !isFullyVerified;

  let submitLabel = "Send request";
  let submitSublabel: string | null = null;
  if (dailyCapHit) {
    submitLabel = "Daily limit reached — try again tomorrow";
    submitSublabel = "To prevent spam, contact requests are limited to 10 per day.";
  } else if (inCooldown) {
    submitLabel = `Request again in ${cooldownLabel}`;
    submitSublabel = "The owner declined your request — 24h cooldown applies.";
  }

  return (
    <TooltipProvider>
      <Card className="my-6">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <OwnerRateBlock rate={rate} />

          <div>
            <h3 className="text-base font-semibold">Request owner's contact</h3>
            {showQuota && (
              <p className="text-xs text-muted-foreground mt-1">
                {remaining} of 10 requests remaining today
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            If approved, both you and the owner will receive each other's contact details via email — so you can connect directly. Reeve stays out of your conversation.
          </p>

          {!isFullyVerified && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Verify your phone and email to send a request.{" "}
                <Link to={`/profile?returnTo=${encodeURIComponent(window.location.pathname)}`} className="underline font-medium">Verify now</Link>
              </span>
            </div>
          )}

          {prefsIncomplete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-md border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                  Complete your rental preferences to send a request →{" "}
                  <Link to="/tenant-dashboard/preferences" className="underline font-medium text-foreground">Set preferences</Link>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Age, gender, occupants, occupation and stay duration are required.
              </TooltipContent>
            </Tooltip>
          )}

          <div className="space-y-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="Introduce yourself (optional) — e.g. your move-in date, why you like this place"
              maxLength={200}
              rows={3}
              disabled={prefsIncomplete}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/200</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={consentTerms}
                onCheckedChange={(v) => setConsentTerms(v === true)}
                disabled={prefsIncomplete}
              />
              <span>
                I agree to Reeve's{" "}
                <Link to="/terms" className="underline">Terms of Service</Link> and{" "}
                <Link to="/privacy" className="underline">Privacy Policy</Link>.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={consentShare}
                onCheckedChange={(v) => setConsentShare(v === true)}
                disabled={prefsIncomplete}
              />
              <span>
                I consent to sharing my rental preferences with{" "}
                <strong>{displayOwner}</strong>, owner of <strong>{buildingName}</strong>. If approved, my contact details will be shared with them via email.
              </span>
            </label>
          </div>

          <div>
            <Button
              className="w-full sm:w-auto min-h-[44px]"
              onClick={handleSubmit}
              disabled={submitDisabled}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {submitLabel}
            </Button>
            {submitSublabel && (
              <p className="text-xs text-muted-foreground mt-2">{submitSublabel}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ── Compact owner response-rate strip (D-P3-009) ─────────────────────────────
function OwnerRateBlock({ rate }: { rate: ResponseRate | null }) {
  if (!rate) return null;
  const handled = rate.all_time_handled ?? 0;
  const responded = rate.all_time_responded ?? 0;
  const weekHandled = rate.last_7d_handled ?? 0;
  const weekResponded = rate.last_7d_responded ?? 0;
  if (handled < 5) {
    return (
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" /> New owner · verified
      </p>
    );
  }
  const allTimePct = Math.round((responded / handled) * 100);
  const weekly = weekHandled > 0
    ? ` · ${Math.round((weekResponded / weekHandled) * 100)}% this week`
    : "";
  return (
    <p className="text-xs text-muted-foreground">
      Responds to {allTimePct}% of requests · {handled} handled{weekly}
    </p>
  );
}
