import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type CrStatus = "pending" | "approved" | "declined" | "withdrawn" | "auto_cancelled";

interface SummaryRow {
  id: string;
  status: CrStatus;
}

interface Counts {
  pending: number;
  approved: number;
  declined: number;
  total: number;
}

export default function ContactRequestsSummaryCard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<SummaryRow[] | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    const sb = supabase as unknown as { from: (table: string) => any };
    const { data, error } = await sb
      .from("contact_requests")
      // Public-visibility gate via the embedded status only. RLS enforces
      // is_active=true for non-owner viewers of these statuses; the status trigger
      // keeps them in lockstep. is_active is not in the authenticated 65-column grant.
      .select("id, status, properties!inner(status)")
      .eq("tenant_id", user.id)
      .in("properties.status", ["listed", "edit_pending_review"]);
    if (error) {
      console.error("SUMMARY_CARD_FETCH_ERROR", error);
      setFetchError(true);
      setRows([]);
      return;
    }
    setFetchError(false);
    setRows((data ?? []) as SummaryRow[]);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refetch();
  }, [authLoading, isAuthenticated, refetch]);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const channel = supabase
      .channel(`cr_summary:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests", filter: `tenant_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, user?.id, refetch]);

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

  const counts: Counts | null = rows
    ? {
        pending: rows.filter((r) => r.status === "pending").length,
        approved: rows.filter((r) => r.status === "approved").length,
        declined: rows.filter((r) => r.status === "declined").length,
        total: rows.length,
      }
    : null;

  const activeBadge = counts ? counts.pending + counts.approved : 0;

  const shell = (children: React.ReactNode) => (
    <section className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Contact Requests</h2>
        </div>
        {activeBadge > 0 && (
          <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">{activeBadge}</Badge>
        )}
      </div>
      {children}
    </section>
  );

  if (authLoading || rows === null) {
    return shell(<Skeleton className="h-24 w-full" />);
  }

  if (fetchError) {
    return shell(
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Could not load contact requests.</p>
        <Button variant="outline" size="sm" onClick={() => { setFetchError(false); setRows(null); refetch(); }}>
          Retry
        </Button>
      </div>,
    );
  }

  if (counts!.total === 0) {
    return shell(
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">No current contact requests.</p>
        <Button variant="outline" onClick={() => navigate("/search")}>Browse properties →</Button>
      </div>,
    );
  }

  const hasActive = counts!.pending + counts!.approved + counts!.declined > 0;

  if (!hasActive) {
    return shell(
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">No active contact requests.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/tenant-dashboard/contact-requests")}>
          View all contact requests
        </Button>
      </div>,
    );
  }

  return shell(
    <div className="space-y-3">
      <div className="space-y-1">
        {counts!.pending > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pending</span>
            <span className="font-medium tabular-nums">{counts!.pending}</span>
          </div>
        )}
        {counts!.approved > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Approved</span>
            <span className="font-medium tabular-nums text-emerald-700">{counts!.approved}</span>
          </div>
        )}
        {counts!.declined > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Declined</span>
            <span className="font-medium tabular-nums">{counts!.declined}</span>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={() => navigate("/tenant-dashboard/contact-requests")}>
        View all contact requests
      </Button>
    </div>,
  );
}
