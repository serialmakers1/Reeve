import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertTriangle,
  MapPin,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday,
  isSameDay,
} from "date-fns";
import VisitSchedulerModal from "@/components/VisitSchedulerModal";

// UTC+5:30 offset in ms
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toIST(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + IST_OFFSET_MS);
}

function parseTimeToHours(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h + (m || 0) / 60;
}

function getEventLocality(ev: CalendarEvent): string {
  if (ev.type === "inspection") return ev.subtitle || "";
  return ev.subtitle2 || "";
}

interface CalendarEvent {
  id: string;
  type: "inspection" | "visit";
  title: string;
  subtitle: string;
  subtitle2?: string;
  date: Date; // IST date
  startHour: number; // decimal hours in IST
  endHour: number;
  status: string;
  color: string;
  borderColor: string;
  badgeLabel: string;
  badgeVariant: string;
  detail: Record<string, string | null>;
  tenantId?: string;
  propertyId?: string;
}

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 60; // px per hour

export default function FieldCalendar() {
  const { loading: authLoading, user } = useRequireAuth({ requireAdmin: true });
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [view, setView] = useState<"week" | "day">(isMobile ? "day" : "week");
  const [currentDate, setCurrentDate] = useState(toIST(new Date()));
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeLocality, setActiveLocality] = useState<string | null>(null);

  // Reschedule state
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [reschedulingEvent, setReschedulingEvent] = useState<CalendarEvent | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Notes modal state (after Mark Complete)
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [completingEvent, setCompletingEvent] = useState<CalendarEvent | null>(null);
  const [propertyFeedback, setPropertyFeedback] = useState("");
  const [adminNoteText, setAdminNoteText] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);

  // Sync mobile default
  useEffect(() => {
    if (isMobile) setView("day");
  }, [isMobile]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user]);

  const fetchData = async () => {
    setLoading(true);

    const [inspRes, visitRes] = await Promise.all([
      supabase
        .from("properties")
        .select(
          "id, building_name, locality, city, inspection_date, inspection_start_time, inspection_end_time, status, inspection_notes"
        )
        .not("inspection_date", "is", null)
        .in("status", ["inspection_proposed", "inspection_scheduled"]),
      supabase
        .from("visits")
        .select(
          "id, property_id, scheduled_at, status, tenant_id, property:properties!inner(building_name, locality, city), tenant:users!visits_tenant_id_fkey(full_name)"
        )
        .in("status", ["scheduled", "confirmed", "rescheduled"]),
    ]);

    const mapped: CalendarEvent[] = [];

    if (inspRes.data) {
      for (const p of inspRes.data) {
        if (!p.inspection_date) continue;
        const dateObj = new Date(p.inspection_date + "T00:00:00Z");
        const istDate = toIST(dateObj);
        const startH = p.inspection_start_time
          ? parseTimeToHours(p.inspection_start_time)
          : 10;
        const endH = p.inspection_end_time
          ? parseTimeToHours(p.inspection_end_time)
          : startH + 1;
        const isScheduled = p.status === "inspection_scheduled";

        mapped.push({
          id: p.id,
          type: "inspection",
          title: p.building_name || "Property",
          subtitle: p.locality || p.city || "",
          date: istDate,
          startHour: startH,
          endHour: endH,
          status: p.status,
          color: isScheduled
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-amber-100 dark:bg-amber-900/30",
          borderColor: isScheduled ? "border-green-500" : "border-amber-500",
          badgeLabel: isScheduled ? "Confirmed" : "Proposed",
          badgeVariant: isScheduled ? "default" : "secondary",
          detail: {
            Type: "Owner Inspection",
            Building: p.building_name,
            Locality: p.locality,
            City: p.city,
            Date: format(istDate, "dd MMM yyyy"),
            Time: `${p.inspection_start_time?.slice(0, 5) || "—"} – ${p.inspection_end_time?.slice(0, 5) || "—"}`,
            Status: isScheduled ? "Scheduled" : "Proposed",
            Notes: p.inspection_notes || null,
          },
        });
      }
    }

    if (visitRes.data) {
      for (const v of visitRes.data as any[]) {
        if (!v.scheduled_at) continue;
        const istDate = toIST(new Date(v.scheduled_at));
        const startH = istDate.getHours() + istDate.getMinutes() / 60;

        mapped.push({
          id: v.id,
          type: "visit",
          title: v.tenant?.full_name || "Tenant",
          subtitle: (v.property as any)?.building_name || "",
          subtitle2: (v.property as any)?.locality || "",
          date: istDate,
          startHour: startH,
          endHour: startH + 0.5,
          status: v.status,
          color: "bg-blue-100 dark:bg-blue-900/30",
          borderColor: "border-blue-500",
          badgeLabel:
            v.status === "confirmed"
              ? "Confirmed"
              : v.status === "rescheduled"
              ? "Rescheduled"
              : "Scheduled",
          badgeVariant: "secondary",
          tenantId: v.tenant_id,
          propertyId: v.property_id,
          detail: {
            Type: "Tenant Visit",
            Tenant: v.tenant?.full_name || "—",
            Building: (v.property as any)?.building_name || "—",
            Locality: (v.property as any)?.locality || "—",
            Date: format(istDate, "dd MMM yyyy"),
            Time: format(istDate, "hh:mm a"),
            Status: v.status,
          },
        });
      }
    }

    setEvents(mapped);
    setLoading(false);
  };

  // ─── Action: Reschedule ───────────────────────────────────────────────────

  const handleRescheduleConfirm = async (scheduledAt: Date) => {
    if (!reschedulingEvent) return;
    setRescheduleLoading(true);
    try {
      // a) Cancel old visit
      const { error: cancelErr } = await supabase
        .from("visits")
        .update({
          status: "cancelled" as any,
          cancelled_at: new Date().toISOString(),
          cancelled_by: "admin",
        })
        .eq("id", reschedulingEvent.id);
      if (cancelErr) throw cancelErr;

      // b) Insert new rescheduled visit
      const { data: newVisit, error: insertErr } = await supabase
        .from("visits")
        .insert({
          property_id: reschedulingEvent.propertyId,
          tenant_id: reschedulingEvent.tenantId,
          scheduled_at: scheduledAt.toISOString(),
          status: "rescheduled" as any,
          rescheduled_by: "admin",
        })
        .select("id")
        .maybeSingle();
      if (insertErr) throw insertErr;
      if (!newVisit) throw new Error("Visit insert returned no data");

      // c) Log event
      await supabase.from("visit_events").insert({
        visit_id: newVisit.id,
        tenant_id: reschedulingEvent.tenantId,
        property_id: reschedulingEvent.propertyId,
        event_type: "rescheduled",
        initiated_by: "admin",
        scheduled_at: scheduledAt.toISOString(),
      });

      setSchedulerOpen(false);
      setReschedulingEvent(null);
      toast({ title: "Visit rescheduled" });
      fetchData();
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  // ─── Action: Cancel ───────────────────────────────────────────────────────

  const handleCancel = async (ev: CalendarEvent) => {
    const ok = window.confirm("Cancel this visit on behalf of the tenant?");
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("visits")
        .update({
          status: "cancelled" as any,
          cancelled_at: new Date().toISOString(),
          cancelled_by: "admin",
        })
        .eq("id", ev.id);
      if (error) throw error;

      await supabase.from("visit_events").insert({
        visit_id: ev.id,
        tenant_id: ev.tenantId,
        property_id: ev.propertyId,
        event_type: "cancelled",
        initiated_by: "admin",
      });

      toast({ title: "Visit cancelled" });
      fetchData();
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ─── Action: Mark Complete (step 1 — update visit, open notes modal) ──────

  const handleMarkComplete = async (ev: CalendarEvent) => {
    const { error } = await supabase
      .from("visits")
      .update({
        status: "completed" as any,
        completed_at: new Date().toISOString(),
      })
      .eq("id", ev.id);

    if (error) {
      toast({ title: "Failed to update visit", variant: "destructive" });
      return;
    }

    // Open notes modal
    setCompletingEvent(ev);
    setPropertyFeedback("");
    setAdminNoteText("");
    setNotesModalOpen(true);
  };

  // ─── Action: Mark Complete (step 2 — save notes) ─────────────────────────

  const handleSaveNotes = async () => {
    if (!completingEvent) return;
    setNotesLoading(true);
    try {
      if (propertyFeedback.trim()) {
        await supabase.from("visit_events").insert({
          visit_id: completingEvent.id,
          tenant_id: completingEvent.tenantId,
          property_id: completingEvent.propertyId,
          event_type: "completed",
          initiated_by: "admin",
          notes: propertyFeedback.trim(),
          note_type: "property_feedback",
        });
      }

      if (adminNoteText.trim()) {
        await supabase.from("visit_events").insert({
          visit_id: completingEvent.id,
          tenant_id: completingEvent.tenantId,
          property_id: completingEvent.propertyId,
          event_type: "completed",
          initiated_by: "admin",
          notes: adminNoteText.trim(),
          note_type: "admin_user_note",
        });

        await supabase
          .from("profiles")
          .update({ admin_notes: adminNoteText.trim() })
          .eq("user_id", completingEvent.tenantId);
      }

      setNotesModalOpen(false);
      setCompletingEvent(null);
      toast({ title: "Visit marked complete" });
      fetchData();
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setNotesLoading(false);
    }
  };

  const handleSkipNotes = () => {
    setNotesModalOpen(false);
    setCompletingEvent(null);
    toast({ title: "Visit marked complete" });
    fetchData();
  };

  // ─── Action: No-Show ─────────────────────────────────────────────────────

  const handleMarkNoShow = async (ev: CalendarEvent) => {
    const ok = window.confirm(
      "Mark this tenant as no-show? This will increment their no-show count and may block future scheduling."
    );
    if (!ok) return;

    // a) Update visit
    const { error: visitError } = await supabase
      .from("visits")
      .update({
        status: "no_show" as any,
        no_show_at: new Date().toISOString(),
      })
      .eq("id", ev.id);

    if (visitError) {
      toast({ title: "Failed to update visit", variant: "destructive" });
      return;
    }

    // b) Log event
    await supabase.from("visit_events").insert({
      visit_id: ev.id,
      tenant_id: ev.tenantId,
      property_id: ev.propertyId,
      event_type: "no_show",
      initiated_by: "admin",
    });

    // c) Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, no_show_count")
      .eq("user_id", ev.tenantId!)
      .maybeSingle();

    // d) Increment no_show_count (trigger auto-sets visit_scheduling_blocked at 3)
    if (profile) {
      const newCount = (profile.no_show_count ?? 0) + 1;
      await supabase
        .from("profiles")
        .update({ no_show_count: newCount })
        .eq("id", profile.id);

      // f) Extra toast if now blocked
      if (newCount >= 3) {
        toast({
          title: "This tenant has been blocked from scheduling further visits.",
        });
      }
    }

    toast({ title: "Marked as no-show" });
    fetchData();
  };

  // ─── Calendar layout helpers ──────────────────────────────────────────────

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      : [currentDate];

  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => HOUR_START + i
  );

  // Visible events for current period
  const visibleEvents = useMemo(
    () => events.filter((e) => days.some((d) => isSameDay(e.date, d))),
    [events, days]
  );

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const d of days) {
      const key = format(d, "yyyy-MM-dd");
      const dayEvts = events.filter((e) => isSameDay(e.date, d));
      // In day view, sort by locality then start time
      if (view === "day") {
        dayEvts.sort((a, b) => {
          const locA = getEventLocality(a).toLowerCase();
          const locB = getEventLocality(b).toLowerCase();
          if (locA !== locB) return locA.localeCompare(locB);
          return a.startHour - b.startHour;
        });
      }
      map.set(key, dayEvts);
    }
    return map;
  }, [events, days, view]);

  // Locality chips data
  const localityChips = useMemo(() => {
    const locMap = new Map<
      string,
      { count: number; types: Set<"inspection" | "visit"> }
    >();
    for (const ev of visibleEvents) {
      const loc = getEventLocality(ev);
      if (!loc) continue;
      const entry = locMap.get(loc) || { count: 0, types: new Set() };
      entry.count++;
      entry.types.add(ev.type);
      locMap.set(loc, entry);
    }
    return locMap;
  }, [visibleEvents]);

  // Same-day same-locality flag: set of event IDs that share locality+day with another event
  const sameDayLocalityIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [, dayEvents] of eventsByDay) {
      const locGroups = new Map<string, string[]>();
      for (const ev of dayEvents) {
        const loc = getEventLocality(ev);
        if (!loc) continue;
        const arr = locGroups.get(loc) || [];
        arr.push(ev.id);
        locGroups.set(loc, arr);
      }
      for (const [, group] of locGroups) {
        if (group.length >= 2) group.forEach((id) => ids.add(id));
      }
    }
    return ids;
  }, [eventsByDay]);

  // Day view: locality labels for background section dividers
  const dayViewLocalityLabels = useMemo(() => {
    if (view !== "day") return [];
    const key = format(days[0], "yyyy-MM-dd");
    const dayEvents = eventsByDay.get(key) || [];
    const locGroups = new Map<string, CalendarEvent[]>();
    for (const ev of dayEvents) {
      const loc = getEventLocality(ev);
      if (!loc) continue;
      const arr = locGroups.get(loc) || [];
      arr.push(ev);
      locGroups.set(loc, arr);
    }
    const labels: {
      locality: string;
      topHour: number;
      bottomHour: number;
    }[] = [];
    for (const [loc, evts] of locGroups) {
      if (evts.length < 2) continue;
      const minH = Math.min(...evts.map((e) => e.startHour));
      const maxH = Math.max(...evts.map((e) => e.endHour));
      labels.push({ locality: loc, topHour: minH, bottomHour: maxH });
    }
    return labels;
  }, [view, days, eventsByDay]);

  // Detect overlaps
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [, dayEvents] of eventsByDay) {
      for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
          const a = dayEvents[i];
          const b = dayEvents[j];
          if (a.startHour < b.endHour && b.startHour < a.endHour) {
            ids.add(a.id);
            ids.add(b.id);
          }
        }
      }
    }
    return ids;
  }, [eventsByDay]);

  const navigate = (dir: number) => {
    if (view === "week") {
      setCurrentDate((d) => (dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
    } else {
      setCurrentDate((d) => addDays(d, dir));
    }
  };

  const goToday = () => setCurrentDate(toIST(new Date()));

  // Reset active locality when period changes
  useEffect(() => {
    setActiveLocality(null);
  }, [currentDate, view]);

  function getChipDotColor(types: Set<"inspection" | "visit">) {
    const hasInsp = types.has("inspection");
    const hasVisit = types.has("visit");
    if (hasInsp && hasVisit) return "bg-purple-500";
    if (hasVisit) return "bg-blue-500";
    return "bg-green-500";
  }

  if (authLoading) return null;

  const showLocalityBar = !loading && localityChips.size > 1;

  return (
    <AdminLayout>
      <div
        className="space-y-4"
        onClick={(e) => {
          // Deselect locality when clicking on grid background
          if (
            (e.target as HTMLElement).closest("[data-locality-chip]") ||
            (e.target as HTMLElement).closest("[data-event-block]")
          )
            return;
          setActiveLocality(null);
        }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Field Calendar
            </h1>
            <p className="text-sm text-muted-foreground">
              {view === "week"
                ? `${format(days[0], "dd MMM")} – ${format(days[days.length - 1], "dd MMM yyyy")}`
                : format(currentDate, "EEEE, dd MMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isMobile && (
              <div className="flex border rounded-md overflow-hidden ml-2">
                <button
                  className={`px-3 py-1.5 text-xs font-medium ${view === "day" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setView("day")}
                >
                  Day
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-medium ${view === "week" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setView("week")}
                >
                  Week
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Locality Summary Bar */}
        {showLocalityBar && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-2">
            {Array.from(localityChips.entries()).map(
              ([loc, { count, types }]) => (
                <button
                  key={loc}
                  data-locality-chip
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLocality((prev) => (prev === loc ? null : loc));
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    activeLocality === loc
                      ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/30"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${getChipDotColor(types)}`}
                  />
                  {loc}
                  <span className="text-muted-foreground">({count})</span>
                </button>
              )
            )}
          </div>
        )}

        {/* Calendar Grid */}
        {loading ? (
          <div className="border rounded-lg overflow-hidden">
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: `60px repeat(${days.length}, 1fr)`,
              }}
            >
              <div className="h-10 border-b bg-muted" />
              {days.map((_, i) => (
                <Skeleton key={i} className="h-10 border-b border-l" />
              ))}
              {hours.map((_, hi) => (
                <>
                  <Skeleton key={`t-${hi}`} className="h-[60px] border-b" />
                  {days.map((_, di) => (
                    <Skeleton
                      key={`c-${hi}-${di}`}
                      className="h-[60px] border-b border-l"
                    />
                  ))}
                </>
              ))}
            </div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto bg-card">
            {/* Day headers */}
            <div
              className="grid sticky top-0 z-10 bg-card border-b"
              style={{
                gridTemplateColumns: `60px repeat(${days.length}, 1fr)`,
              }}
            >
              <div className="h-12 border-r" />
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className={`h-12 flex flex-col items-center justify-center border-r text-sm ${
                    isToday(d)
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="text-xs uppercase">{format(d, "EEE")}</span>
                  <span className="text-sm">{format(d, "d")}</span>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              {/* Day view locality background labels */}
              {view === "day" &&
                dayViewLocalityLabels.map((label) => {
                  const top = (label.topHour - HOUR_START) * HOUR_HEIGHT;
                  const height =
                    (label.bottomHour - label.topHour) * HOUR_HEIGHT;
                  return (
                    <div
                      key={label.locality}
                      className="absolute right-2 pointer-events-none flex items-start justify-end z-[1]"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <span className="text-[11px] font-medium text-muted-foreground/30 uppercase tracking-wider mt-1">
                        {label.locality}
                      </span>
                    </div>
                  );
                })}

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `60px repeat(${days.length}, 1fr)`,
                }}
              >
                {hours.map((h) => (
                  <>
                    <div
                      key={`label-${h}`}
                      className="h-[60px] border-r border-b flex items-start justify-end pr-2 pt-0.5"
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {h > 12
                          ? `${h - 12} PM`
                          : h === 12
                          ? "12 PM"
                          : `${h} AM`}
                      </span>
                    </div>
                    {days.map((d) => {
                      const key = format(d, "yyyy-MM-dd");
                      const dayEvents = eventsByDay.get(key) || [];
                      const slotEvents = dayEvents.filter(
                        (e) => e.startHour >= h && e.startHour < h + 1
                      );

                      return (
                        <div
                          key={`${key}-${h}`}
                          className="h-[60px] border-r border-b relative"
                        >
                          {slotEvents.map((ev) => {
                            const topOffset = (ev.startHour - h) * HOUR_HEIGHT;
                            const height = Math.max(
                              (ev.endHour - ev.startHour) * HOUR_HEIGHT,
                              20
                            );
                            const hasConflict = conflictIds.has(ev.id);
                            const hasSameDayLoc = sameDayLocalityIds.has(
                              ev.id
                            );
                            const evLocality = getEventLocality(ev);
                            const isDimmed =
                              activeLocality && evLocality !== activeLocality;
                            const isHighlighted =
                              activeLocality && evLocality === activeLocality;

                            return (
                              <Popover key={ev.id}>
                                <PopoverTrigger asChild>
                                  <button
                                    data-event-block
                                    className={`absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1.5 py-0.5 overflow-hidden text-left cursor-pointer hover:opacity-90 transition-all ${ev.color} ${ev.borderColor} ${
                                      hasConflict
                                        ? "!border-l-red-500 ring-1 ring-red-300"
                                        : ""
                                    } ${isHighlighted ? "ring-2 ring-primary/50 shadow-md" : ""} ${isDimmed ? "opacity-30" : ""}`}
                                    style={{
                                      top: `${topOffset}px`,
                                      height: `${height}px`,
                                      zIndex: 5,
                                    }}
                                  >
                                    {hasConflict && (
                                      <AlertTriangle className="absolute top-0.5 right-0.5 h-3 w-3 text-red-500" />
                                    )}
                                    {hasSameDayLoc && !hasConflict && (
                                      <MapPin className="absolute top-0.5 right-0.5 h-3 w-3 text-muted-foreground" />
                                    )}
                                    {hasSameDayLoc && hasConflict && (
                                      <MapPin className="absolute top-0.5 right-3.5 h-3 w-3 text-muted-foreground" />
                                    )}
                                    <p className="text-[10px] font-semibold text-foreground truncate leading-tight">
                                      {ev.title}
                                    </p>
                                    {height >= 30 && (
                                      <p className="text-[9px] text-muted-foreground truncate leading-tight">
                                        {ev.subtitle}
                                      </p>
                                    )}
                                    {height >= 42 && ev.subtitle2 && (
                                      <p className="text-[9px] text-muted-foreground truncate leading-tight">
                                        {ev.subtitle2}
                                      </p>
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-72 text-sm space-y-2"
                                  side="right"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground">
                                      {ev.detail.Type}
                                    </span>
                                    <Badge
                                      variant={ev.badgeVariant as any}
                                      className={
                                        ev.type === "inspection" &&
                                        ev.status === "inspection_scheduled"
                                          ? "bg-green-100 text-green-800"
                                          : ev.type === "inspection"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-blue-100 text-blue-800"
                                      }
                                    >
                                      {ev.badgeLabel}
                                    </Badge>
                                  </div>
                                  {Object.entries(ev.detail)
                                    .filter(([k, v]) => k !== "Type" && v)
                                    .map(([k, v]) => (
                                      <div
                                        key={k}
                                        className="flex justify-between gap-2"
                                      >
                                        <span className="text-muted-foreground">
                                          {k}
                                        </span>
                                        <span className="text-foreground text-right">
                                          {v}
                                        </span>
                                      </div>
                                    ))}

                                  {/* Action buttons — visits only, not in terminal state */}
                                  {ev.type === "visit" &&
                                    !["completed", "no_show", "cancelled"].includes(
                                      ev.status
                                    ) && (
                                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setReschedulingEvent(ev);
                                            setSchedulerOpen(true);
                                          }}
                                        >
                                          Reschedule
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleCancel(ev)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                                          onClick={() =>
                                            handleMarkComplete(ev)
                                          }
                                        >
                                          Mark Complete
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleMarkNoShow(ev)}
                                        >
                                          No-Show
                                        </Button>
                                      </div>
                                    )}
                                </PopoverContent>
                              </Popover>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && visibleEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">
              No field activity this {view === "week" ? "week" : "day"}
            </p>
          </div>
        )}
      </div>

      {/* Reschedule modal */}
      <VisitSchedulerModal
        open={schedulerOpen}
        onClose={() => {
          setSchedulerOpen(false);
          setReschedulingEvent(null);
        }}
        onConfirm={handleRescheduleConfirm}
        title="Reschedule Visit"
        confirmLabel="Confirm Reschedule"
        loading={rescheduleLoading}
      />

      {/* Post-complete notes modal */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Visit Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Property feedback from tenant
              </label>
              <Textarea
                placeholder="What did the tenant say about the property?"
                value={propertyFeedback}
                onChange={(e) => setPropertyFeedback(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Internal notes about this tenant
              </label>
              <Textarea
                placeholder="For internal use only. Visible when tenant applies."
                value={adminNoteText}
                onChange={(e) => setAdminNoteText(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={handleSkipNotes}
              disabled={notesLoading}
            >
              Skip
            </Button>
            <Button onClick={handleSaveNotes} disabled={notesLoading}>
              {notesLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
