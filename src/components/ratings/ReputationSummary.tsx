import { Skeleton } from "@/components/ui/skeleton";
import { useRatingSummary } from "./useRatingSummary";
import ReputationMetricRows from "./ReputationMetricRows";
import type { RatingSide } from "./ratingQuestions";

function SideSection({ heading, side }: { heading: string; side: RatingSide }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      {side.metrics === null ? (
        <p className="text-sm text-muted-foreground">
          {side.total} interaction{side.total === 1 ? "" : "s"} rated
        </p>
      ) : (
        <>
          <ReputationMetricRows metrics={side.metrics} />
          <p className="text-xs text-muted-foreground">Based on {side.total} rated interactions</p>
        </>
      )}
    </section>
  );
}

/**
 * Full reputation summary for /me and /u/:userId. Shows "As a lister" and/or
 * "As a property seeker" sections only when each has data; one overall
 * "No ratings yet" when both are empty. No stars, no reviews.
 */
export default function ReputationSummary({ userId }: { userId: string | null | undefined }) {
  const { summary, isLoading } = useRatingSummary(userId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const lister = summary?.as_lister ?? null;
  const seeker = summary?.as_seeker ?? null;

  if (!lister && !seeker) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">No ratings yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lister && <SideSection heading="As a lister" side={lister} />}
      {seeker && <SideSection heading="As a property seeker" side={seeker} />}
    </div>
  );
}
