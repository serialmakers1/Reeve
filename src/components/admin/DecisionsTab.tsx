/**
 * DecisionsTab — G3 audit surface (D-165, final Phase 1.5 deliverable).
 *
 * Read-only. Aggregates listing decisions from `property_activity_log`
 * (`action IN ('listing_approved', 'listing_rejected')`) with edit decisions
 * from `property_edit_requests` (`status IN ('approved','rejected','withdrawn','superseded')`).
 * Two separate queries merged client-side and sorted by effective timestamp DESC —
 * NEVER UNION: the same event would surface twice if edit decisions were pulled
 * from both tables.
 *
 * Filters (all combinable, persisted in URL):
 *   ?decisionTypes=  comma-separated whitelist of the 6 decision kinds
 *   ?from=YYYY-MM-DD ?to=YYYY-MM-DD  effective-timestamp range
 *   ?actor=<user_id>  single admin
 *   ?city=<slug>      single city
 *
 * Row click → /owner-dashboard/property/:id (owner property management page,
 * richer timeline). No separate admin decision-detail page.
 *
 * Legacy-data resilience: rows with missing payload.reason (pre-Prompt 11
 * listing_rejected entries) show "—"; withdrawn/superseded rows show "—" for
 * actor; rows where the properties join returned null (property hard-deleted
 * via Prompt 12) are filtered out silently.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getStatusDisplay } from "@/lib/propertyStatus";

// ── Types ────────────────────────────────────────────────────────────────

export type DecisionKind =
  | "listing_approved"
  | "listing_rejected"
  | "edit_approved"
  | "edit_rejected"
  | "edit_withdrawn"
  | "edit_superseded";

interface PropertyLite {
  id: string;
  building_name: string | null;
  city: string | null;
  listing_type: string | null;
  status: string;
}

interface ActivityLogRow {
  id: string;
  action: string;
  actor_id: string | null;
  created_at: string;
  payload: { reason?: string | null; reason_text?: string | null } | null;
  properties: PropertyLite | null;
  users: { full_name: string | null } | null;
}

interface EditRequestRow {
  id: string;
  property_id: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  rejection_reason_text: string | null;
  properties: PropertyLite | null;
  users: { full_name: string | null } | null;
}

interface DecisionRow {
  key: string;
  kind: DecisionKind;
  effectiveAt: string;
  property: PropertyLite;
  actorName: string | null;
  reason: string | null;
  primaryPhoto: string | null;
}

// ── Kind metadata ────────────────────────────────────────────────────────

const DECISION_META: Record<DecisionKind, { label: string; badgeClass: string }> = {
  listing_approved: { label: "Approved",          badgeClass: "bg-green-100 text-green-700 border-green-200" },
  listing_rejected: { label: "Changes requested", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  edit_approved:    { label: "Edit approved",     badgeClass: "bg-green-100 text-green-700 border-green-200" },
  edit_rejected:    { label: "Edit rejected",     badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  edit_withdrawn:   { label: "Owner cancelled",   badgeClass: "bg-muted text-muted-foreground border-border" },
  edit_superseded:  { label: "Superseded",        badgeClass: "bg-muted text-muted-foreground border-border" },
};

const ALL_KINDS: DecisionKind[] = [
  "listing_approved",
  "listing_rejected",
  "edit_approved",
  "edit_rejected",
  "edit_withdrawn",
  "edit_superseded",
];

// Client-side truncator for the reason cell.
const truncate = (s: string, n = 60) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

export default function DecisionsTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state — URL-first, defaults second.
  const [selectedKinds, setSelectedKinds] = useState<Set<DecisionKind>>(() => {
    const csv = searchParams.get("decisionTypes");
    if (!csv) return new Set(ALL_KINDS);
    const parsed = csv.split(",").filter((k): k is DecisionKind => ALL_KINDS.includes(k as DecisionKind));
    return new Set(parsed.length ? parsed : ALL_KINDS);
  });
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState<string>(searchParams.get("to") ?? "");
  const [actorFilter, setActorFilter] = useState<string>(searchParams.get("actor") ?? "all");
  const [cityFilter, setCityFilter] = useState<string>(searchParams.get("city") ?? "all");

  // Persist filter state to URL (declarative — no side effects other than URL).
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (selectedKinds.size === ALL_KINDS.length) params.delete("decisionTypes");
    else params.set("decisionTypes", [...selectedKinds].join(","));
    if (dateFrom) params.set("from", dateFrom); else params.delete("from");
    if (dateTo) params.set("to", dateTo); else params.delete("to");
    if (actorFilter === "all") params.delete("actor"); else params.set("actor", actorFilter);
    if (cityFilter === "all") params.delete("city"); else params.set("city", cityFilter);
    // Preserve any pre-existing params outside this tab (e.g., ?tab=decisions).
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKinds, dateFrom, dateTo, actorFilter, cityFilter]);

  const load = useCallback(async () => {
    setLoading(true);

    // Query 1: listing decisions from property_activity_log.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logs } = await (supabase as any)
      .from("property_activity_log")
      .select(`
        id, action, actor_id, created_at, payload,
        properties(id, building_name, city, listing_type, status),
        users:actor_id(full_name)
      `)
      .in("action", ["listing_approved", "listing_rejected"])
      .order("created_at", { ascending: false });

    // Query 2: edit decisions from property_edit_requests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: edits } = await (supabase as any)
      .from("property_edit_requests")
      .select(`
        id, property_id, status, reviewed_by, reviewed_at, created_at,
        rejection_reason, rejection_reason_text,
        properties(id, building_name, city, listing_type, status),
        users:reviewed_by(full_name)
      `)
      .in("status", ["approved", "rejected", "withdrawn", "superseded"]);

    const propertyIds = new Set<string>();
    for (const r of (logs ?? []) as ActivityLogRow[]) if (r.properties) propertyIds.add(r.properties.id);
    for (const r of (edits ?? []) as EditRequestRow[]) if (r.properties) propertyIds.add(r.properties.id);

    // Bulk photo fetch — one query keyed by property_id.
    const photoMap = new Map<string, string>();
    if (propertyIds.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: imgs } = await (supabase as any)
        .from("property_images")
        .select("property_id, url, is_primary")
        .in("property_id", [...propertyIds])
        .eq("is_primary", true);
      for (const i of (imgs ?? []) as Array<{ property_id: string; url: string }>) {
        if (!photoMap.has(i.property_id)) photoMap.set(i.property_id, i.url);
      }
    }

    const merged: DecisionRow[] = [];

    for (const r of (logs ?? []) as ActivityLogRow[]) {
      // Legacy resilience: hard-deleted property → skip silently.
      if (!r.properties) continue;
      const kind: DecisionKind = r.action === "listing_approved" ? "listing_approved" : "listing_rejected";
      const reason = kind === "listing_rejected"
        ? (r.payload?.reason ?? null)
        : null;
      merged.push({
        key: `log:${r.id}`,
        kind,
        effectiveAt: r.created_at,
        property: r.properties,
        actorName: r.users?.full_name ?? null,
        reason,
        primaryPhoto: photoMap.get(r.properties.id) ?? null,
      });
    }

    for (const r of (edits ?? []) as EditRequestRow[]) {
      if (!r.properties) continue;
      const kind: DecisionKind | null =
        r.status === "approved"   ? "edit_approved"   :
        r.status === "rejected"   ? "edit_rejected"   :
        r.status === "withdrawn"  ? "edit_withdrawn"  :
        r.status === "superseded" ? "edit_superseded" : null;
      if (!kind) continue;
      // Effective ts: reviewed_at when present, else created_at (withdrawn/superseded).
      const effectiveAt = r.reviewed_at ?? r.created_at;
      const actorName =
        kind === "edit_withdrawn"  ? "Owner" :
        kind === "edit_superseded" ? null :
        r.users?.full_name ?? null;
      const reason = kind === "edit_rejected" ? (r.rejection_reason ?? null) : null;
      merged.push({
        key: `edit:${r.id}`,
        kind,
        effectiveAt,
        property: r.properties,
        actorName,
        reason,
        primaryPhoto: photoMap.get(r.properties.id) ?? null,
      });
    }

    merged.sort((a, b) => (a.effectiveAt < b.effectiveAt ? 1 : -1));
    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Distinct actors + cities for the two Select filters.
  const distinctActors = useMemo(() => {
    const s = new Map<string, string>(); // key: name (used as filter id), value: label
    for (const r of rows) if (r.actorName) s.set(r.actorName, r.actorName);
    return [...s.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const distinctCities = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.property.city) s.add(r.property.city);
    return [...s].sort();
  }, [rows]);

  const visibleRows = useMemo(() => {
    const fromMs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toMs   = dateTo   ? new Date(dateTo   + "T23:59:59").getTime() : null;
    return rows.filter((r) => {
      if (!selectedKinds.has(r.kind)) return false;
      if (fromMs != null || toMs != null) {
        const ts = new Date(r.effectiveAt).getTime();
        if (fromMs != null && ts < fromMs) return false;
        if (toMs != null && ts > toMs) return false;
      }
      if (actorFilter !== "all" && r.actorName !== actorFilter) return false;
      if (cityFilter !== "all" && r.property.city !== cityFilter) return false;
      return true;
    });
  }, [rows, selectedKinds, dateFrom, dateTo, actorFilter, cityFilter]);

  const toggleKind = (kind: DecisionKind) => {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      // Never allow empty — falls back to All. Otherwise the empty state
      // reads as "no filter applied" but visually shows zero rows.
      if (next.size === 0) return new Set(ALL_KINDS);
      return next;
    });
  };

  if (loading) return <DecisionsSkeleton />;

  return (
    <div className="space-y-4">
      {/* Filters. Decision-type checkboxes + date range + actor + city. */}
      <div className="rounded-lg border bg-card p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ALL_KINDS.map((kind) => (
            <label key={kind} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox
                checked={selectedKinds.has(kind)}
                onCheckedChange={() => toggleKind(kind)}
              />
              <span className={`inline-flex items-center rounded border px-2 py-0.5 ${DECISION_META[kind].badgeClass}`}>
                {DECISION_META[kind].label}
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="decisions-from" className="text-xs">From</Label>
            <Input id="decisions-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-9" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="decisions-to" className="text-xs">To</Label>
            <Input id="decisions-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Admin</Label>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All admins</SelectItem>
                {distinctActors.map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {distinctCities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Rows */}
      {visibleRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No decisions match the current filters.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleRows.map((r) => {
            const meta = DECISION_META[r.kind];
            const currentStatus = getStatusDisplay(r.property.status);
            return (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => navigate(`/owner-dashboard/property/${r.property.id}`)}
                  className="w-full text-left flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-16 h-12 sm:w-20 sm:h-14 shrink-0 bg-muted rounded overflow-hidden">
                    {r.primaryPhoto ? (
                      <img src={r.primaryPhoto} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {r.property.building_name ?? "—"}
                        {r.property.city && <span className="text-muted-foreground font-normal">, {r.property.city}</span>}
                      </p>
                      <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {r.property.listing_type === "sale" ? "For Sale" : "For Rent"}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${meta.badgeClass}`}>
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{r.actorName ?? "—"}</span>
                      <span title={format(new Date(r.effectiveAt), "PPpp")}>
                        · {formatDistanceToNow(new Date(r.effectiveAt), { addSuffix: true })}
                      </span>
                      {r.reason && (
                        <span title={r.reason}>· {truncate(r.reason)}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Currently: {currentStatus.label}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Test-facing utility ──────────────────────────────────────────────────

/**
 * Exported so tests can exercise the merge/sort logic without pulling in the
 * full React tree. Deliberately pure — no supabase calls.
 */
export function mergeDecisionRows(
  logs: ActivityLogRow[],
  edits: EditRequestRow[],
  photoMap: Map<string, string> = new Map(),
): DecisionRow[] {
  const merged: DecisionRow[] = [];
  for (const r of logs) {
    if (!r.properties) continue;
    const kind: DecisionKind = r.action === "listing_approved" ? "listing_approved" : "listing_rejected";
    merged.push({
      key: `log:${r.id}`,
      kind,
      effectiveAt: r.created_at,
      property: r.properties,
      actorName: r.users?.full_name ?? null,
      reason: kind === "listing_rejected" ? (r.payload?.reason ?? null) : null,
      primaryPhoto: photoMap.get(r.properties.id) ?? null,
    });
  }
  for (const r of edits) {
    if (!r.properties) continue;
    const kind: DecisionKind | null =
      r.status === "approved"   ? "edit_approved"   :
      r.status === "rejected"   ? "edit_rejected"   :
      r.status === "withdrawn"  ? "edit_withdrawn"  :
      r.status === "superseded" ? "edit_superseded" : null;
    if (!kind) continue;
    const effectiveAt = r.reviewed_at ?? r.created_at;
    const actorName =
      kind === "edit_withdrawn"  ? "Owner" :
      kind === "edit_superseded" ? null :
      r.users?.full_name ?? null;
    merged.push({
      key: `edit:${r.id}`,
      kind,
      effectiveAt,
      property: r.properties,
      actorName,
      reason: kind === "edit_rejected" ? (r.rejection_reason ?? null) : null,
      primaryPhoto: photoMap.get(r.properties.id) ?? null,
    });
  }
  merged.sort((a, b) => (a.effectiveAt < b.effectiveAt ? 1 : -1));
  return merged;
}

function DecisionsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-3 flex items-center gap-3">
          <Skeleton className="w-20 h-14 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
