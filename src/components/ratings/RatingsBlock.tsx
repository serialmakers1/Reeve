import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export interface RatingSide {
  total: number;
  yes_count: number;
  deal_again_pct: number;
  reviews: { text: string; created_at: string }[];
}

export interface RatingSummaryResult {
  status: "new" | "active";
  as_owner?: RatingSide;
  as_tenant?: RatingSide;
}

interface Props {
  summary: RatingSummaryResult | null;
  loading: boolean;
}

function SideSection({ heading, side }: { heading: string; side: RatingSide }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{heading}</h2>
      <p className="text-sm text-muted-foreground">
        <span className="text-lg font-semibold text-foreground">{side.deal_again_pct}%</span>
        {" "}would deal again · {side.total} ratings
      </p>
      {side.reviews.length > 0 && (
        <div className="space-y-2">
          {side.reviews.map((r, i) => (
            <Card key={`${r.created_at}-${i}`}>
              <CardContent className="p-3 space-y-1">
                <p className="whitespace-pre-line text-sm text-foreground">{r.text}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default function RatingsBlock({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (!summary || summary.status !== "active") return null;
  const showOwner = summary.as_owner && summary.as_owner.total >= 3;
  const showTenant = summary.as_tenant && summary.as_tenant.total >= 3;
  if (!showOwner && !showTenant) return null;
  return (
    <div className="space-y-6">
      {showOwner && <SideSection heading="Owner ratings" side={summary.as_owner!} />}
      {showTenant && <SideSection heading="Tenant ratings" side={summary.as_tenant!} />}
    </div>
  );
}
