import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, Search, AlertTriangle, Clock, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
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
import VisitSchedulerModal from "@/components/VisitSchedulerModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitProperty {
  building_name: string;
  locality: string | null;
  city: string;
  listed_rent: number;
  bhk: string;
}

interface VisitRow {
  id: string;
  property_id: string;
  scheduled_at: string;
  previous_scheduled_at: string | null;
  status: string;
  cancelled_at: string | null;
  no_show_at: string | null;
  completed_at: string | null;
  created_at: string;
  rescheduled_by: string | null;
  cancelled_by: string | null;
  property: VisitProperty | null;
}

interface VisitEventRow {
  id: string;
  visit_id: string;
  event_type: string;
  initiated_by: string;
  scheduled_at: string | null;
  notes: string | null;
  note_type: string | null;
  created_at: string;
}

interface Profile {
  visit_scheduling_blocked: boolean;
  no_show_count: number;
}

interface PropertyGroup {
  propertyId: string;
  property: VisitProperty;
  propVisits: VisitRow[];
  events: VisitEventRow[];
  activeVisit: VisitRow | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["scheduled", "confirmed", "rescheduled"];

function isUpcomingVisit(visit: VisitRow): boolean {
  return (
    ACTIVE_STATUSES.includes(visit.status) &&
    new Date(visit.scheduled_at) > new Date()
  );
}

function getEventLabel(eventType: string, initiatedBy: string): string {
  if (eventType === "cancelled" && initiatedBy === "tenant")
    return "Cancelled by you";
  if (eventType === "cancelled") return "Cancelled";
  const map: Record<string, string> = {
    scheduled: "Scheduled",
    confirmed: "Confirmed",
    rescheduled: "Rescheduled",
    completed: "Visit Done",
    no_show: "Missed",
  };
  return map[eventType] ?? eventType;
}

function getVisitLabel(visit: VisitRow): string {
  if (visit.status === "cancelled") {
    return visit.cancelled_by === "tenant" ? "Cancelled by you" : "Cancelled";
  }
  return getEventLabel(visit.status, "tenant");
}

function getBadgeClass(type: string): string {
  switch (type) {
    case "scheduled":
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "rescheduled":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "cancelled":
    case "no_show":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VisitsList() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();

  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [visitEvents, setVisitEvents] = useState<VisitEventRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Reschedule state
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [reschedulingVisit, setReschedulingVisit] = useState<VisitRow | null>(null);

  // Cancel state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingVisit, setCancellingVisit] = useState<VisitRow | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [visitsResult, eventsResult, profileResult] = await Promise.all([
      supabase
        .from("visits")
        .select(
          `id, property_id, scheduled_at, previous_scheduled_at, status,
           cancelled_at, no_show_at, completed_at, created_at,
           rescheduled_by, cancelled_by,
           property:properties!visits_property_id_fkey(
             building_name, locality, city, listed_rent, bhk
           )`
        )
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("visit_events")
        .select(
          `id, visit_id, event_type, initiated_by, scheduled_at,
           notes, note_type, created_at`
        )
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("profiles")
        .select("visit_scheduling_blocked, no_show_count")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    setVisits((visitsResult.data as unknown as VisitRow[]) ?? []);
    setVisitEvents((eventsResult.data as VisitEventRow[]) ?? []);
    setProfile(profileResult.data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Derived: property groups with timelines ───────────────────────────────

  const propertyGroups = useMemo<PropertyGroup[]>(() => {
    // Build visitId → visit map for event grouping
    const visitMap = new Map<string, VisitRow>();
    for (const v of visits) visitMap.set(v.id, v);

    // Group events by property_id (resolved via visitMap)
    const eventsByProp = new Map<string, VisitEventRow[]>();
    for (const evt of visitEvents) {
      const visit = visitMap.get(evt.visit_id);
      if (!visit) continue;
      const arr = eventsByProp.get(visit.property_id) ?? [];
      arr.push(evt);
      eventsByProp.set(visit.property_id, arr);
    }

    // Build groups — one per unique property, ordered by most recent visit first
    const seen = new Set<string>();
    const groups: PropertyGroup[] = [];

    for (const v of visits) {
      if (seen.has(v.property_id) || !v.property) continue;
      seen.add(v.property_id);

      const propVisits = visits
        .filter((pv) => pv.property_id === v.property_id)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      const events = eventsByProp.get(v.property_id) ?? [];
      const activeVisit = propVisits.find(isUpcomingVisit) ?? null;

      groups.push({
        propertyId: v.property_id,
        property: v.property,
        propVisits,
        events,
        activeVisit,
      });
    }

    return groups;
  }, [visits, visitEvents]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleRescheduleConfirm = useCallback(
    async (scheduledAt: Date) => {
      if (!reschedulingVisit || !user) return;
      setActionLoading(true);
      try {
        // a) Cancel old visit
        const { error: cancelErr } = await supabase
          .from("visits")
          .update({
            status: "cancelled" as any,
            cancelled_at: new Date().toISOString(),
            cancelled_by: "tenant",
          })
          .eq("id", reschedulingVisit.id);
        if (cancelErr) throw cancelErr;

        // b) Insert new rescheduled visit
        const { data: newVisit, error: insertErr } = await supabase
          .from("visits")
          .insert({
            property_id: reschedulingVisit.property_id,
            tenant_id: user.id,
            scheduled_at: scheduledAt.toISOString(),
            status: "rescheduled" as any,
            rescheduled_by: "tenant",
          })
          .select("id")
          .maybeSingle();
        if (insertErr) throw insertErr;
        if (!newVisit) throw new Error("Visit insert returned no data");

        // c) Log event
        await supabase.from("visit_events").insert({
          visit_id: newVisit.id,
          tenant_id: user.id,
          property_id: reschedulingVisit.property_id,
          event_type: "rescheduled",
          initiated_by: "tenant",
          scheduled_at: scheduledAt.toISOString(),
        });

        setSchedulerOpen(false);
        setReschedulingVisit(null);
        toast({ title: "Visit rescheduled" });
        await fetchData();
      } catch {
        toast({
          title: "Something went wrong",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setActionLoading(false);
      }
    },
    [reschedulingVisit, user, fetchData]
  );

  const handleCancelConfirm = useCallback(async () => {
    if (!cancellingVisit || !user) return;
    setActionLoading(true);
    try {
      // a) Update visit
      const { error } = await supabase
        .from("visits")
        .update({
          status: "cancelled" as any,
          cancelled_at: new Date().toISOString(),
          cancelled_by: "tenant",
        })
        .eq("id", cancellingVisit.id);
      if (error) throw error;

      // b) Log event
      await supabase.from("visit_events").insert({
        visit_id: cancellingVisit.id,
        tenant_id: user.id,
        property_id: cancellingVisit.property_id,
        event_type: "cancelled",
        initiated_by: "tenant",
      });

      setCancelDialogOpen(false);
      setCancellingVisit(null);
      toast({ title: "Visit cancelled" });
      await fetchData();
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }, [cancellingVisit, user, fetchData]);

  // ─── Render: loading ───────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  // ─── Render: empty ─────────────────────────────────────────────────────────

  if (visits.length === 0) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">No visits yet</h1>
          <Button onClick={() => navigate("/search")}>
            <Search className="mr-2 h-4 w-4" /> Browse Properties
          </Button>
        </div>
      </Layout>
    );
  }

  const isBlocked = profile?.visit_scheduling_blocked === true;

  // ─── Render: main ──────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Visits</h1>

        {/* Scheduling block banner */}
        {isBlocked && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              Your account has been flagged after 3 missed visits. Contact us
              at{" "}
              <a
                href="mailto:support@reeve.in"
                className="font-medium underline"
              >
                support@reeve.in
              </a>{" "}
              to restore access.
            </p>
          </div>
        )}

        {/* Property groups */}
        {propertyGroups.map((group) => {
          const { propertyId, property, propVisits, events, activeVisit } =
            group;
          const hasEvents = events.length > 0;

          return (
            <div
              key={propertyId}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Property header */}
              <div
                className="cursor-pointer p-4 hover:bg-accent/30 transition-colors"
                onClick={() => navigate(`/property/${propertyId}`)}
              >
                <p className="font-semibold text-foreground">
                  {property.bhk} in {property.building_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {property.locality && `${property.locality}, `}
                  {property.city}
                </p>
                {property.listed_rent > 0 && (
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    ₹{property.listed_rent.toLocaleString("en-IN")}/month
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div className="border-t border-border px-4 py-2">
                {hasEvents
                  ? events.map((evt, idx) => {
                      const isLast = idx === events.length - 1;
                      const label = getEventLabel(
                        evt.event_type,
                        evt.initiated_by
                      );
                      const dateStr = evt.scheduled_at
                        ? format(
                            new Date(evt.scheduled_at),
                            "dd MMM yyyy, h:mm a"
                          )
                        : format(new Date(evt.created_at), "dd MMM yyyy");

                      return (
                        <div key={evt.id} className="flex gap-3 py-2.5">
                          {/* Vertical connector */}
                          <div className="flex flex-col items-center pt-1">
                            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                            {!isLast && (
                              <div className="mt-1 w-0.5 flex-1 bg-border" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[11px] ${getBadgeClass(evt.event_type)}`}
                              >
                                {label}
                              </Badge>
                              {evt.initiated_by === "admin" && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  By admin
                                </span>
                              )}
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              {dateStr}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  : // Fallback: no visit_events yet — render visits directly
                    propVisits.map((v, idx) => {
                      const isLast = idx === propVisits.length - 1;
                      const label = getVisitLabel(v);

                      return (
                        <div key={v.id} className="flex gap-3 py-2.5">
                          <div className="flex flex-col items-center pt-1">
                            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                            {!isLast && (
                              <div className="mt-1 w-0.5 flex-1 bg-border" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[11px] ${getBadgeClass(v.status)}`}
                              >
                                {label}
                              </Badge>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              {format(
                                new Date(v.scheduled_at),
                                "dd MMM yyyy, h:mm a"
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {/* Active visit: ID reminder + action buttons */}
              {activeVisit && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <span className="mt-0.5 text-base text-blue-500">📋</span>
                    <p className="text-sm text-blue-700">
                      Please carry a valid government-issued photo ID for your
                      visit — Aadhaar Card, Driving Licence, or Voter ID.
                    </p>
                  </div>
                  {!isBlocked && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReschedulingVisit(activeVisit);
                          setSchedulerOpen(true);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setCancellingVisit(activeVisit);
                          setCancelDialogOpen(true);
                        }}
                      >
                        Cancel Visit
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reschedule modal */}
      <VisitSchedulerModal
        open={schedulerOpen}
        onClose={() => {
          setSchedulerOpen(false);
          setReschedulingVisit(null);
        }}
        onConfirm={handleRescheduleConfirm}
        title="Reschedule Visit"
        confirmLabel="Confirm Reschedule"
        loading={actionLoading}
      />

      {/* Cancel confirm dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your visit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this visit? You can always
              schedule a new one later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]" disabled={actionLoading}>
              Keep Visit
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
