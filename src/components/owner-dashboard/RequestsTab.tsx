import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock, ExternalLink, Loader2, XCircle } from "lucide-react";
import DeclineReasonModal, { DECLINE_REASONS } from "./DeclineReasonModal";
import {
  BUYING_PURPOSE_LABELS,
  PURCHASE_TIMELINE_LABELS,
  FUNDING_STAGE_LABELS,
} from "@/lib/preferenceHelpers";

// Phase 3 Prompt 4 — owner-side Requests tab.
// Renders a live, grouped log of every contact_request against this property.
// Snapshot visibility rule (D-P3-005): only pending + approved surface the full
// snapshot; declined / withdrawn / auto_cancelled show name + metadata only.

interface RequestsTabProps {
  propertyId: string;
  propertyStatus: string;
  listingType?: string | null;
}

interface RentalPrefsSnapshot {
  age?: number | null;
  gender?: string | null;
  number_of_occupants?: number | null;
  occupation?: string | null;
  occupation_other?: string | null;
  expected_stay_duration?: string | null;
  move_in_by?: string | null;
  marital_status?: string | null;
  diet_preference?: string | null;
  has_pets?: boolean | null;
  pet_types?: string[] | null;
  is_foreign_citizen?: boolean | null;
}

interface BuyingPrefsSnapshot {
  age?: number | null;
  occupation?: string | null;
  occupation_other?: string | null;
  is_foreign_citizen?: boolean | null;
  buying_purpose?: string | null;
  purchase_timeline?: string | null;
  funding_stage?: string | null;
}

interface TenantSnapshot {
  display_name?: string | null;
  full_name?: string | null;
  profile_photo_url?: string | null;
  bio?: string | null;
  member_since?: string | null;
  preference_type?: "rent" | "buy" | null;
  rental_preferences?: RentalPrefsSnapshot | null;
  buying_preferences?: BuyingPrefsSnapshot | null;
}

type CrStatus = "pending" | "approved" | "declined" | "withdrawn" | "auto_cancelled";

interface CrRow {
  id: string;
  tenant_id: string;
  property_id: string;
  owner_id: string;
  status: CrStatus;
  attempt_number: number;
  decline_reason: string | null;
  tenant_message: string | null;
  tenant_profile_snapshot: TenantSnapshot | null;
  created_at: string;
  approved_at: string | null;
  declined_at: string | null;
  withdrawn_at: string | null;
  auto_cancelled_at: string | null;
}

const HIDDEN_SNAPSHOT_STATUSES = new Set<CrStatus>(["declined", "withdrawn", "auto_cancelled"]);

function reasonLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return DECLINE_REASONS.find((r) => r.value === v)?.label ?? v;
}

function displayName(s: TenantSnapshot | null | undefined): string {
  // D-P4-002: full_name (Google) is primary; display_name kept as legacy fallback for historical snapshots.
  return s?.full_name?.trim() || s?.display_name?.trim() || "Tenant";
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "T").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

function fmt(dt: string | null | undefined): string {
  if (!dt) return "—";
  try { return format(new Date(dt), "d MMM yyyy, h:mm a"); } catch { return dt; }
}

function daysAgo(dt: string | null | undefined): string {
  if (!dt) return "";
  try { return formatDistanceToNowStrict(new Date(dt), { addSuffix: false }); } catch { return ""; }
}

function PrefRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between border-b border-border/40 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-medium text-right">{value}</dd>
    </div>
  );
}

function RentPrefTable({ prefs }: { prefs: RentalPrefsSnapshot | null | undefined }) {
  if (!prefs) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 text-sm">
      <PrefRow label="Age" value={prefs.age != null ? String(prefs.age) : null} />
      <PrefRow label="Occupation" value={prefs.occupation} />
      {prefs.occupation_other && <PrefRow label="Occupation details" value={prefs.occupation_other} />}
      <PrefRow label="Foreign national" value={prefs.is_foreign_citizen !== null && prefs.is_foreign_citizen !== undefined ? (prefs.is_foreign_citizen ? "Yes" : "No") : null} />
      <PrefRow label="Gender" value={prefs.gender} />
      <PrefRow label="Residents" value={prefs.number_of_occupants != null ? String(prefs.number_of_occupants) : null} />
      <PrefRow label="Expected stay" value={prefs.expected_stay_duration} />
      <PrefRow label="Move-in by" value={prefs.move_in_by} />
      <PrefRow label="Marital status" value={prefs.marital_status} />
      <PrefRow label="Diet" value={prefs.diet_preference} />
      <PrefRow label="Pets" value={prefs.has_pets !== null && prefs.has_pets !== undefined ? (prefs.has_pets ? (prefs.pet_types?.join(", ") ?? "Yes") : "No") : null} />
    </dl>
  );
}

function BuyPrefTable({ prefs }: { prefs: BuyingPrefsSnapshot | null | undefined }) {
  if (!prefs) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 text-sm">
      <PrefRow label="Age" value={prefs.age != null ? String(prefs.age) : null} />
      <PrefRow label="Occupation" value={prefs.occupation} />
      {prefs.occupation_other && <PrefRow label="Occupation details" value={prefs.occupation_other} />}
      <PrefRow label="Foreign national" value={prefs.is_foreign_citizen !== null && prefs.is_foreign_citizen !== undefined ? (prefs.is_foreign_citizen ? "Yes" : "No") : null} />
      <PrefRow label="Buying purpose" value={prefs.buying_purpose ? (BUYING_PURPOSE_LABELS[prefs.buying_purpose] ?? prefs.buying_purpose) : null} />
      <PrefRow label="Purchase timeline" value={prefs.purchase_timeline ? (PURCHASE_TIMELINE_LABELS[prefs.purchase_timeline] ?? prefs.purchase_timeline) : null} />
      <PrefRow label="Funding stage" value={prefs.funding_stage ? (FUNDING_STAGE_LABELS[prefs.funding_stage] ?? prefs.funding_stage) : null} />
    </dl>
  );
}

function SnapshotPrefBlock({ snap, listingType }: { snap: TenantSnapshot | null | undefined; listingType?: string | null }) {
  if (!snap) return null;
  if (listingType === "sale") return <BuyPrefTable prefs={snap.buying_preferences} />;
  return <RentPrefTable prefs={snap.rental_preferences} />;
}

// ── Snapshot-hidden compact card (used for declined / withdrawn / auto_cancelled) ─
function CompactCard(props: {
  cr: CrRow;
  title: string;
  detail: string;
  hasSubsequentAttempt?: boolean;
}) {
  const name = displayName(props.cr.tenant_profile_snapshot);
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{name}</p>
            <Badge variant="secondary" className="text-[10px]">Attempt {props.cr.attempt_number}/3</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{props.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{props.detail}</p>
          {props.hasSubsequentAttempt && (
            <p className="text-xs text-amber-700 mt-1">Tenant has re-requested.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Expandable pending card ────────────────────────────────────────────────
function PendingCard(props: {
  cr: CrRow;
  expanded: boolean;
  onToggle: () => void;
  onApprove: (id: string) => Promise<void>;
  onDeclineClick: (id: string) => void;
  approving: boolean;
  approveWarning: boolean;
  priorDeclinedAt: string | null;
  listingType?: string | null;
}) {
  const { cr, expanded } = props;
  const snap = cr.tenant_profile_snapshot;
  const name = displayName(snap);

  return (
    <Card className="border-amber-300/60">
      <CardContent className="p-4 space-y-3">
        <button
          type="button"
          className="w-full text-left flex items-start gap-3"
          onClick={props.onToggle}
        >
          <Avatar className="h-10 w-10">
            {snap?.profile_photo_url ? <AvatarImage src={snap.profile_photo_url} alt={name} /> : null}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{name}</p>
              {cr.attempt_number > 1 && (
                <Badge className="text-[10px]">
                  Attempt {cr.attempt_number} of 3
                  {props.priorDeclinedAt && ` — previously declined ${daysAgo(props.priorDeclinedAt)} ago`}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Requested {fmt(cr.created_at)}</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <Link to={`/u/${cr.tenant_id}`} className="inline-flex items-center gap-1 underline">
                View public profile <ExternalLink className="h-3 w-3" />
              </Link>
              {snap?.member_since && <span>Member since {fmt(snap.member_since)}</span>}
            </div>

            {snap?.bio && (
              <p className="text-sm text-muted-foreground italic">{snap.bio}</p>
            )}

            {cr.tenant_message && (
              <blockquote className="border-l-2 border-primary/40 pl-3 text-sm text-foreground italic">
                "{cr.tenant_message}"
              </blockquote>
            )}

            <SnapshotPrefBlock snap={snap} listingType={props.listingType} />

            {props.approveWarning && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Contact details may not have been sent. If needed, ask the tenant to use the Resend option, or contact <a href="mailto:support@reeve.in" className="underline">support@reeve.in</a>.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                className="min-h-[44px] sm:flex-1"
                onClick={() => props.onApprove(cr.id)}
                disabled={props.approving}
              >
                {props.approving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Approve — share contact details
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px] sm:flex-1"
                onClick={() => props.onDeclineClick(cr.id)}
                disabled={props.approving}
              >
                Decline
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Approved read-only card ────────────────────────────────────────────────
function ApprovedCard({ cr, listingType }: { cr: CrRow; listingType?: string | null }) {
  const snap = cr.tenant_profile_snapshot;
  const name = displayName(snap);
  return (
    <Card className="border-emerald-300/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            {snap?.profile_photo_url ? <AvatarImage src={snap.profile_photo_url} alt={name} /> : null}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Contact details sent by email to both parties.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Approved {fmt(cr.approved_at)}</p>
            <Link to={`/u/${cr.tenant_id}`} className="text-xs underline">View public profile</Link>
          </div>
        </div>
        <SnapshotPrefBlock snap={snap} listingType={listingType} />
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function RequestsTab({ propertyId, listingType }: RequestsTabProps) {
  const [rows, setRows] = useState<CrRow[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [approveWarnings, setApproveWarnings] = useState<Record<string, boolean>>({});
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);

  const refetch = useCallback(async () => {
    const sb = supabase as unknown as { from: (t: string) => any };
    const { data, error } = await sb.from("contact_requests")
      .select("id,tenant_id,property_id,owner_id,status,attempt_number,decline_reason,tenant_message,tenant_profile_snapshot,created_at,approved_at,declined_at,withdrawn_at,auto_cancelled_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("REQUESTS_FETCH_ERROR", error);
      setRows([]);
      return;
    }
    setRows((data ?? []) as CrRow[]);
  }, [propertyId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`contact_requests:owner:${propertyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests", filter: `property_id=eq.${propertyId}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [propertyId, refetch]);

  const grouped = useMemo(() => {
    const list = rows ?? [];
    const g = { pending: [] as CrRow[], approved: [] as CrRow[], declined: [] as CrRow[], withdrawn: [] as CrRow[], auto_cancelled: [] as CrRow[] };
    for (const r of list) g[r.status].push(r);
    return g;
  }, [rows]);

  // Newest attempt-number per tenant — used to flag "tenant has re-requested"
  // against older declined rows.
  const maxAttemptPerTenant = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      m.set(r.tenant_id, Math.max(m.get(r.tenant_id) ?? 0, r.attempt_number));
    }
    return m;
  }, [rows]);

  // Prior decline (most recent) per tenant — used for pending-card attempt sublabel.
  const priorDeclinedByTenant = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows ?? []) {
      if (r.status !== "declined" || !r.declined_at) continue;
      const cur = m.get(r.tenant_id);
      if (!cur || new Date(r.declined_at) > new Date(cur)) m.set(r.tenant_id, r.declined_at);
    }
    return m;
  }, [rows]);

  const handleApprove = async (id: string) => {
    setApproving((s) => ({ ...s, [id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("reveal-contact", {
        body: { contact_request_id: id },
      });
      const body = data as { approved?: boolean; notification_dispatched?: boolean; n8n_error?: boolean } | null;
      if (error || !body?.approved) {
        toast.error("Something went wrong. Please try again.");
        return;
      }
      if (body.n8n_error || body.notification_dispatched === false) {
        setApproveWarnings((s) => ({ ...s, [id]: true }));
        toast.warning("Approved — but the notification may not have been sent.");
      } else {
        toast.success("Approved — contact details sent to both parties by email.");
      }
      // Optimistic + realtime will reconcile.
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, status: "approved", approved_at: new Date().toISOString() } : r)) ?? prev);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setApproving((s) => ({ ...s, [id]: false }));
    }
  };

  const handleDeclineConfirm = async (reason: string) => {
    if (!declineTarget) return;
    setDeclining(true);
    try {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { error } = await sb.from("contact_requests")
        .update({ status: "declined", decline_reason: reason })
        .eq("id", declineTarget)
        .eq("status", "pending");
      if (error) {
        toast.error("Could not decline. Please try again.");
        return;
      }
      toast.success("Request declined.");
      setRows((prev) => prev?.map((r) => (r.id === declineTarget ? { ...r, status: "declined", decline_reason: reason, declined_at: new Date().toISOString() } : r)) ?? prev);
      setDeclineTarget(null);
    } catch {
      toast.error("Could not decline. Please try again.");
    } finally {
      setDeclining(false);
    }
  };

  if (rows === null) {
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  const total = rows.length;
  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No requests yet — once your property is live, tenants can request your contact.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      {grouped.pending.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2 inline-flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pending ({grouped.pending.length})
          </h3>
          <div className="space-y-3">
            {grouped.pending.map((cr) => (
              <PendingCard
                key={cr.id}
                cr={cr}
                expanded={expanded[cr.id] ?? true}
                onToggle={() => setExpanded((s) => ({ ...s, [cr.id]: !(s[cr.id] ?? true) }))}
                onApprove={handleApprove}
                onDeclineClick={(id) => setDeclineTarget(id)}
                approving={approving[cr.id] ?? false}
                approveWarning={approveWarnings[cr.id] ?? false}
                priorDeclinedAt={priorDeclinedByTenant.get(cr.tenant_id) ?? null}
                listingType={listingType}
              />
            ))}
          </div>
        </section>
      )}

      {/* Approved */}
      {grouped.approved.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2 inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Approved ({grouped.approved.length})
          </h3>
          <div className="space-y-3">
            {grouped.approved.map((cr) => <ApprovedCard key={cr.id} cr={cr} listingType={listingType} />)}
          </div>
        </section>
      )}

      {/* Declined */}
      {grouped.declined.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2 inline-flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" /> Declined ({grouped.declined.length})
          </h3>
          <div className="space-y-3">
            {grouped.declined.map((cr) => (
              <CompactCard
                key={cr.id}
                cr={cr}
                title={`Declined — ${reasonLabel(cr.decline_reason)}`}
                detail={fmt(cr.declined_at)}
                hasSubsequentAttempt={(maxAttemptPerTenant.get(cr.tenant_id) ?? 0) > cr.attempt_number}
              />
            ))}
          </div>
        </section>
      )}

      {/* Withdrawn */}
      {grouped.withdrawn.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Withdrawn ({grouped.withdrawn.length})</h3>
          <div className="space-y-3">
            {grouped.withdrawn.map((cr) => (
              <CompactCard key={cr.id} cr={cr} title="Tenant withdrew this request." detail={fmt(cr.withdrawn_at)} />
            ))}
          </div>
        </section>
      )}

      {/* Auto-cancelled */}
      {grouped.auto_cancelled.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Auto-cancelled ({grouped.auto_cancelled.length})</h3>
          <div className="space-y-3">
            {grouped.auto_cancelled.map((cr) => (
              <CompactCard key={cr.id} cr={cr} title="Request cancelled — property was archived." detail={fmt(cr.auto_cancelled_at)} />
            ))}
          </div>
        </section>
      )}

      <DeclineReasonModal
        open={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        onConfirm={handleDeclineConfirm}
        submitting={declining}
      />
    </div>
  );
}

// External helper for the tab badge in OwnerPropertyManagement — pending count
// per property. Uses the same query pattern as refetch().
export async function fetchPendingCount(propertyId: string): Promise<number> {
  const sb = supabase as unknown as { from: (t: string) => any };
  const { count } = await sb.from("contact_requests")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("status", "pending");
  return typeof count === "number" ? count : 0;
}

// Ensure HIDDEN_SNAPSHOT_STATUSES survives future refactors — referenced by grep
export { HIDDEN_SNAPSHOT_STATUSES };
