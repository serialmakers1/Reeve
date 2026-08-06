import type { RatingSide } from "./ratingQuestions";

/**
 * Compact reputation summary for property-detail lister cards. Reads the
 * already-fetched `as_lister` side — no extra query.
 * - null (0 ratings) → renders nothing
 * - 1–2 ratings → interaction count only
 * - 3+ ratings → two chips (would deal again, easy to reach) + total
 */
export default function ReputationSummaryCompact({ side }: { side: RatingSide | null }) {
  if (!side) return null;

  if (side.metrics === null) {
    return (
      <p className="text-sm text-muted-foreground">
        {side.total} interaction{side.total === 1 ? "" : "s"} rated
      </p>
    );
  }

  const { deal_again, easy_to_reach } = side.metrics;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        {deal_again.pct}% would deal again
      </span>
      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-foreground">
        {easy_to_reach.pct}% easy to reach
      </span>
      <span className="text-xs text-muted-foreground">· {side.total} ratings</span>
    </div>
  );
}
