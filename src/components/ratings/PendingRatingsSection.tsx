import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import PendingRatingCard, { type PendingRatingRow } from "./PendingRatingCard";

interface Props {
  onlyForContactRequestId?: string;
}

export default function PendingRatingsSection({ onlyForContactRequestId }: Props) {
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PendingRatingRow[]>([]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("get_pending_ratings_for_me");
      if (cancelled) return;
      const arr = Array.isArray(data) ? (data as PendingRatingRow[]) : [];
      setRows(arr);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isLoading, isAuthenticated]);

  if (!isAuthenticated) return null;

  const visible = onlyForContactRequestId
    ? rows.filter((r) => r.contact_request_id === onlyForContactRequestId)
    : rows;

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (visible.length === 0) return null;

  return (
    <section id="pending-ratings" className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Rate your experience</h2>
      <div className="space-y-3">
        {visible.map((r) => (
          <PendingRatingCard key={r.contact_request_id} row={r} />
        ))}
      </div>
    </section>
  );
}
