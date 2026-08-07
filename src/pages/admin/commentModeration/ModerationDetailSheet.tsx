/**
 * Right-side (desktop) / bottom near-full-screen (mobile) detail drawer for a
 * Review-Queue item: full comment, best-effort parent context, identities,
 * current unresolved reports with per-reporter factual signals, an optional
 * resolved-history section, and Unhide/Delete actions.
 *
 * Report details load independently — if that request fails the rest of the
 * sheet still renders and we fall back to the queue row's own open_reports JSON.
 */
import { formatDistanceToNow, format } from "date-fns";
import { AlertCircle, Home } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  identityLine, authorTypeLabel, parseOpenReports, summarizeQueueSignals,
} from "./moderationHelpers";
import {
  KindBadge, StateBadge, SignalChip, PropertyCell, reportReasonLabel,
} from "./moderationUi";
import ModerationActions from "./ModerationActions";
import {
  useReportDetails, useParentContext, type ReviewQueueRow, type ReportDetailRow,
} from "./useCommentModeration";

interface Props {
  row: ReviewQueueRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ReporterSignals({ r }: { r: ReportDetailRow }) {
  const bits = [
    `${r.reporter_lifetime_reports} filed`,
    `${r.reporter_dismissed_count} dismissed`,
    `${r.reporter_upheld_count} upheld`,
    `${r.reporter_reports_on_property} on this property`,
  ];
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{bits.join(" · ")}</span>
      {r.reporter_is_property_owner && <SignalChip>Owns this property</SignalChip>}
    </div>
  );
}

function ReportItem({
  reason, notes, createdAt, reporterLine, isOwner, signals,
}: {
  reason: string;
  notes: string | null;
  createdAt: string;
  reporterLine: string;
  isOwner: boolean;
  signals?: React.ReactNode;
}) {
  return (
    <li className="rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{reportReasonLabel(reason)}</span>
        {createdAt && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(createdAt), "d MMM yyyy, h:mm a")}
          </span>
        )}
      </div>
      {notes && <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground">{notes}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>by {reporterLine}</span>
        {isOwner && <SignalChip>Property owner</SignalChip>}
      </div>
      {signals}
    </li>
  );
}

export default function ModerationDetailSheet({ row, open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const details = useReportDetails(row?.comment_id ?? null, open && !!row);
  const parent = useParentContext(
    row?.property_id ?? null,
    row?.parent_comment_id ?? null,
    open && !!row?.is_reply,
  );

  const close = () => onOpenChange(false);

  const detailRows = (details.data ?? []) as ReportDetailRow[];
  const openReports = detailRows.filter((r) => !r.resolution);
  const historyReports = detailRows.filter((r) => r.resolution);
  const fallbackOpen = row ? parseOpenReports(row.open_reports) : [];
  const signals = row ? summarizeQueueSignals(row) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "h-[90dvh]" : "w-full sm:max-w-xl",
        )}
      >
        {!row ? null : (
          <>
            <SheetHeader className="space-y-2 border-b p-4 text-left">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <KindBadge isReply={row.is_reply} />
                <StateBadge state="auto_hidden" />
                {row.hidden_at && (
                  <span className="text-xs text-muted-foreground">
                    hidden {formatDistanceToNow(new Date(row.hidden_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <SheetTitle className="text-base">
                {row.open_report_count} unresolved {row.open_report_count === 1 ? "report" : "reports"}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {row.lifetime_report_count} lifetime
                </span>
              </SheetTitle>
              {signals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {signals.map((s) => (
                    <SignalChip key={s}>{s}</SignalChip>
                  ))}
                </div>
              )}
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <Section title="Comment">
                <p className="whitespace-pre-line break-words rounded-lg border bg-background p-3 text-sm text-foreground">
                  {row.comment_text}
                </p>
              </Section>

              {row.is_reply && (
                <Section title="In reply to">
                  {parent.isLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : parent.data ? (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        {parent.data.pseudonym ?? "Unknown"}
                      </p>
                      <p className={cn("mt-0.5 whitespace-pre-line break-words text-sm", parent.data.isDeleted ? "italic text-muted-foreground" : "text-foreground")}>
                        {parent.data.text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Parent comment not shown.</p>
                  )}
                </Section>
              )}

              <Section title="Poster">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-foreground">{identityLine(row.poster_pseudonym, row.poster_full_name)}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {authorTypeLabel(row.poster_is_owner)}
                  </span>
                  {row.poster_is_owner && <Home className="h-3.5 w-3.5 text-primary" aria-hidden />}
                  {!row.poster_is_active && (
                    <span className="text-xs text-muted-foreground">(inactive)</span>
                  )}
                </div>
              </Section>

              <Section title="Property">
                <PropertyCell
                  propertyId={row.property_id}
                  building={row.property_building}
                  locality={row.property_locality}
                  city={row.property_city}
                  status={row.property_status}
                />
                <p className="text-xs text-muted-foreground">
                  Owner: {identityLine(row.owner_pseudonym, row.owner_full_name)}
                </p>
              </Section>

              <Section title="Current reports">
                {details.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : details.isError ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Couldn't load full report details.
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => details.refetch()}>
                        Retry
                      </Button>
                    </div>
                    {/* Fallback: the queue row's own unresolved-report snapshot. */}
                    <ul className="space-y-2">
                      {fallbackOpen.map((r, i) => (
                        <ReportItem
                          key={i}
                          reason={r.reason}
                          notes={r.notes}
                          createdAt={r.created_at}
                          reporterLine={identityLine(r.reporter_pseudonym, r.reporter_full_name)}
                          isOwner={r.reporter_is_owner}
                        />
                      ))}
                    </ul>
                  </div>
                ) : openReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No unresolved reports.</p>
                ) : (
                  <ul className="space-y-2">
                    {openReports.map((r) => (
                      <ReportItem
                        key={r.report_id}
                        reason={r.reason}
                        notes={r.notes}
                        createdAt={r.created_at}
                        reporterLine={identityLine(r.reporter_pseudonym, r.reporter_full_name)}
                        isOwner={r.reporter_is_property_owner}
                        signals={<ReporterSignals r={r} />}
                      />
                    ))}
                  </ul>
                )}
              </Section>

              {historyReports.length > 0 && (
                <Section title={`History (${historyReports.length} resolved)`}>
                  <ul className="space-y-2">
                    {historyReports.map((r) => (
                      <li key={r.report_id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-foreground">{reportReasonLabel(r.reason)}</span>
                          <span className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            r.resolution === "upheld"
                              ? "border-destructive/40 text-destructive"
                              : "border-border text-muted-foreground",
                          )}>
                            {r.resolution}
                          </span>
                        </div>
                        {r.notes && <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{r.notes}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          by {identityLine(r.reporter_pseudonym, r.reporter_full_name)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>

            <div className="border-t p-4">
              <ModerationActions
                commentId={row.comment_id}
                state="auto_hidden"
                size="default"
                onActioned={() => close()}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
