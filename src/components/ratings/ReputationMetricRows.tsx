import { cn } from "@/lib/utils";
import { METRIC_LABELS, type RatingSideMetrics } from "./ratingQuestions";

function barTone(pct: number): string {
  if (pct >= 67) return "bg-emerald-500";
  if (pct >= 34) return "bg-amber-500";
  return "bg-rose-500";
}

function MetricRow({ label, pct, denom, note }: { label: string; pct?: number; denom?: number; note?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-foreground">{label}</span>
        {note ? (
          <span className="text-xs text-muted-foreground">{note}</span>
        ) : (
          <span className="text-sm font-semibold text-foreground">
            {pct}% <span className="text-xs font-normal text-muted-foreground">· {denom}</span>
          </span>
        )}
      </div>
      {note ? null : (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={cn("h-full rounded-full transition-all", barTone(pct ?? 0))} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** The five colourful metric rows for a side with >= 3 ratings. */
export default function ReputationMetricRows({ metrics }: { metrics: RatingSideMetrics }) {
  return (
    <div className="space-y-3">
      {METRIC_LABELS.map(({ key, label }) => {
        if (key === "moved_forward") {
          const m = metrics.moved_forward;
          if (m.status === "none") return <MetricRow key={key} label={label} note="No applicable responses" />;
          if (m.status === "insufficient") return <MetricRow key={key} label={label} note="Not enough applicable responses" />;
          return <MetricRow key={key} label={label} pct={m.pct} denom={m.denom} />;
        }
        const m = metrics[key];
        return <MetricRow key={key} label={label} pct={m.pct} denom={m.denom} />;
      })}
    </div>
  );
}
