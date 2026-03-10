import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, Search, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface VisitProperty {
  id: string;
  building_name: string;
  locality: string | null;
  city: string;
  bhk: string;
  listed_rent: number;
}

interface VisitRow {
  id: string;
  status: string;
  scheduled_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  no_show_at: string | null;
  properties: VisitProperty;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 border-blue-200" },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800 border-green-200" },
  rescheduled: { label: "Reschedule Requested", color: "bg-amber-100 text-amber-800 border-amber-200" },
  completed: { label: "Visit Done", color: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
  no_show: { label: "No Show", color: "bg-red-100 text-red-800 border-red-200" },
};

const UPCOMING = ["scheduled", "confirmed", "rescheduled"];

function formatRent(n: number) {
  return n.toLocaleString("en-IN");
}

export default function VisitsList() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  // action panel state
  const [activePanel, setActivePanel] = useState<{ id: string; type: "reschedule" | "cancel" } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVisits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("visits")
      .select(`id, status, scheduled_at, cancelled_at, cancellation_reason, completed_at, no_show_at, properties(id, building_name, locality, city, bhk, listed_rent)`)
      .eq("tenant_id", user.id)
      .order("scheduled_at", { ascending: false });
    setVisits((data as unknown as VisitRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("visits_channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "visits", filter: `tenant_id=eq.${user.id}` },
        (payload) => {
          setVisits((prev) =>
            prev.map((v) => (v.id === payload.new.id ? { ...v, ...(payload.new as Partial<VisitRow>) } : v))
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const openPanel = (id: string, type: "reschedule" | "cancel", visit: VisitRow) => {
    if (type === "reschedule") {
      const d = new Date(visit.scheduled_at);
      setRescheduleDate(format(d, "yyyy-MM-dd"));
      setRescheduleTime(format(d, "HH:mm"));
    }
    setCancelReason("");
    setActivePanel({ id, type });
  };

  const closePanel = () => { setActivePanel(null); };

  const handleReschedule = async (visitId: string) => {
    if (!rescheduleDate || !rescheduleTime) return;
    setSaving(true);
    const newDatetime = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
    const { error } = await supabase
      .from("visits")
      .update({ scheduled_at: newDatetime, status: "rescheduled" as any })
      .eq("id", visitId);
    setSaving(false);
    if (error) {
      toast({ title: "Could not reschedule. Please try again.", variant: "destructive" });
    } else {
      setVisits((prev) =>
        prev.map((v) => (v.id === visitId ? { ...v, scheduled_at: newDatetime, status: "rescheduled" } : v))
      );
      closePanel();
      toast({ title: "Reschedule requested. Our team will confirm shortly." });
    }
  };

  const handleCancel = async (visitId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("visits")
      .update({
        status: "cancelled" as any,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancelReason || null,
      })
      .eq("id", visitId);
    setSaving(false);
    if (error) {
      toast({ title: "Could not cancel. Please try again.", variant: "destructive" });
    } else {
      setVisits((prev) =>
        prev.map((v) =>
          v.id === visitId
            ? { ...v, status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: cancelReason || null }
            : v
        )
      );
      closePanel();
    }
  };

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

  const upcoming = visits.filter((v) => UPCOMING.includes(v.status));
  const past = visits.filter((v) => !UPCOMING.includes(v.status));

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

  const renderCard = (visit: VisitRow) => {
    const p = visit.properties;
    const badge = STATUS_MAP[visit.status] || { label: visit.status, color: "bg-muted text-muted-foreground" };
    const isUpcoming = UPCOMING.includes(visit.status);
    const panelOpen = activePanel?.id === visit.id;

    return (
      <div key={visit.id} className="space-y-0">
        <div
          onClick={() => navigate(`/property/${p.id}`)}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md space-y-1"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-foreground">{p.bhk} in {p.building_name}</span>
            <Badge variant="outline" className={`shrink-0 text-[11px] ${badge.color}`}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{p.locality}{p.locality && ","} {p.city}</p>
          <p className="text-xs text-muted-foreground">
            Scheduled: {format(new Date(visit.scheduled_at), "dd MMM yyyy, h:mm a")}
          </p>
          {p.listed_rent > 0 && (
            <p className="text-sm font-medium text-foreground">₹{formatRent(p.listed_rent)}/month</p>
          )}

          {isUpcoming && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); openPanel(visit.id, "reschedule", visit); }}
              >
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); openPanel(visit.id, "cancel", visit); }}
              >
                Cancel Visit
              </Button>
            </div>
          )}
        </div>

        {/* Reschedule panel */}
        {panelOpen && activePanel.type === "reschedule" && (
          <div className="rounded-b-xl border border-t-0 border-border bg-muted/30 p-4 space-y-3">
            <div className="flex gap-2">
              <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="flex-1" />
              <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="w-32" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={saving} onClick={() => handleReschedule(visit.id)}>
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Confirm Reschedule
              </Button>
              <Button size="sm" variant="ghost" disabled={saving} onClick={closePanel}>Back</Button>
            </div>
          </div>
        )}

        {/* Cancel panel */}
        {panelOpen && activePanel.type === "cancel" && (
          <div className="rounded-b-xl border border-t-0 border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm text-foreground">Are you sure you want to cancel this visit?</p>
            <Input
              placeholder="Reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" disabled={saving} onClick={() => handleCancel(visit.id)}>
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Yes, Cancel
              </Button>
              <Button size="sm" variant="ghost" disabled={saving} onClick={closePanel}>Keep Visit</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Visits</h1>

        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Visits</h2>
            {upcoming.map(renderCard)}
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Past Visits</h2>
            {past.map(renderCard)}
          </section>
        )}
      </div>
    </Layout>
  );
}
