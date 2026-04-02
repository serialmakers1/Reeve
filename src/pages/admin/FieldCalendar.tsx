import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, isSameDay } from "date-fns";

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
}

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 60; // px per hour

export default function FieldCalendar() {
  const { loading: authLoading, user } = useRequireAuth({ requireAdmin: true });
  const isMobile = useIsMobile();
  const [view, setView] = useState<"week" | "day">(isMobile ? "day" : "week");
  const [currentDate, setCurrentDate] = useState(toIST(new Date()));
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

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
        .select("id, building_name, locality, city, inspection_date, inspection_start_time, inspection_end_time, status, inspection_notes")
        .not("inspection_date", "is", null)
        .in("status", ["inspection_proposed", "inspection_scheduled"]),
      supabase
        .from("visits")
        .select("id, scheduled_at, status, property:properties!inner(building_name, locality, city), tenant:users!visits_tenant_id_fkey(full_name)")
        .in("status", ["scheduled", "confirmed"]),
    ]);

    const mapped: CalendarEvent[] = [];

    if (inspRes.data) {
      for (const p of inspRes.data) {
        if (!p.inspection_date) continue;
        const dateObj = new Date(p.inspection_date + "T00:00:00Z");
        const istDate = toIST(dateObj);
        const startH = p.inspection_start_time ? parseTimeToHours(p.inspection_start_time) : 10;
        const endH = p.inspection_end_time ? parseTimeToHours(p.inspection_end_time) : startH + 1;
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
          color: isScheduled ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30",
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
          badgeLabel: v.status === "confirmed" ? "Confirmed" : "Scheduled",
          badgeVariant: "secondary",
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = view === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [currentDate];

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const d of days) {
      const key = format(d, "yyyy-MM-dd");
      map.set(key, events.filter((e) => isSameDay(e.date, d)));
    }
    return map;
  }, [events, days]);

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

  if (authLoading) return null;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Field Calendar</h1>
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

        {/* Calendar Grid */}
        {loading ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid gap-0" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
              <div className="h-10 border-b bg-muted" />
              {days.map((_, i) => (
                <Skeleton key={i} className="h-10 border-b border-l" />
              ))}
              {hours.map((_, hi) => (
                <>
                  <Skeleton key={`t-${hi}`} className="h-[60px] border-b" />
                  {days.map((_, di) => (
                    <Skeleton key={`c-${hi}-${di}`} className="h-[60px] border-b border-l" />
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
              style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
            >
              <div className="h-12 border-r" />
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className={`h-12 flex flex-col items-center justify-center border-r text-sm ${
                    isToday(d) ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span className="text-xs uppercase">{format(d, "EEE")}</span>
                  <span className="text-sm">{format(d, "d")}</span>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              <div
                className="grid"
                style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
              >
                {hours.map((h) => (
                  <>
                    <div
                      key={`label-${h}`}
                      className="h-[60px] border-r border-b flex items-start justify-end pr-2 pt-0.5"
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
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
                            const height = Math.max((ev.endHour - ev.startHour) * HOUR_HEIGHT, 20);
                            const hasConflict = conflictIds.has(ev.id);

                            return (
                              <Popover key={ev.id}>
                                <PopoverTrigger asChild>
                                  <button
                                    className={`absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1.5 py-0.5 overflow-hidden text-left cursor-pointer hover:opacity-90 transition-opacity ${ev.color} ${ev.borderColor} ${
                                      hasConflict ? "!border-l-red-500 ring-1 ring-red-300" : ""
                                    }`}
                                    style={{
                                      top: `${topOffset}px`,
                                      height: `${height}px`,
                                      zIndex: 5,
                                    }}
                                  >
                                    {hasConflict && (
                                      <AlertTriangle className="absolute top-0.5 right-0.5 h-3 w-3 text-red-500" />
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
                                <PopoverContent className="w-64 text-sm space-y-2" side="right">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground">{ev.detail.Type}</span>
                                    <Badge
                                      variant={ev.badgeVariant as any}
                                      className={
                                        ev.type === "inspection" && ev.status === "inspection_scheduled"
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
                                      <div key={k} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">{k}</span>
                                        <span className="text-foreground text-right">{v}</span>
                                      </div>
                                    ))}
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
        {!loading && events.filter((e) => days.some((d) => isSameDay(e.date, d))).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No field activity this {view === "week" ? "week" : "day"}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
