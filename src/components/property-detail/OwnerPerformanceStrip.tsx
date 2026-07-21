/**
 * P6 owner-viewing-own listing performance strip. Replaces OwnerCard for owner.
 * Three stat tiles + two action buttons. Pending-count query is enabled only
 * when isOwnProperty && !!propertyId — never fires for public viewers.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BarChart2, Eye, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PageSection from "./PageSection";

interface Props {
  propertyId: string;
  isOwnProperty: boolean;
  viewCount: number;
  commentCount: number;
}

function usePendingContactCount(propertyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["pendingContactsCount", propertyId],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<number> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as unknown as { from: (t: string) => any };
      const { count, error } = await sb
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .eq("status", "pending");
      if (error) throw error;
      return typeof count === "number" ? count : 0;
    },
  });
}

function Tile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-muted px-4 py-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function OwnerPerformanceStrip({
  propertyId,
  isOwnProperty,
  viewCount,
  commentCount,
}: Props) {
  const navigate = useNavigate();
  const { data: pending } = usePendingContactCount(propertyId, isOwnProperty);

  if (!isOwnProperty) return null;

  return (
    <PageSection title="Your Listing" icon={BarChart2} background="muted">
      <div className="grid grid-cols-3 gap-3">
        <Tile icon={Eye} value={viewCount} label="Views" />
        <Tile icon={MessageCircle} value={commentCount} label="Q&As" />
        <Tile icon={Mail} value={pending ?? 0} label="Pending" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => navigate("/owner-dashboard")}
          className="h-10 rounded-full px-4 text-sm font-medium"
        >
          Manage Listing →
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/list/${propertyId}`)}
          className="h-10 rounded-full px-4 text-sm font-medium"
        >
          Edit Listing →
        </Button>
      </div>
    </PageSection>
  );
}
