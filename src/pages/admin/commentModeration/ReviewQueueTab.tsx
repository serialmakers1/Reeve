/**
 * Review Queue — comments currently auto-hidden by 3 unresolved reports.
 * Spacious cards (desktop + mobile), row → detail sheet, inline actions.
 * Reflects the CURRENT unresolved report batch (counts, hidden_at, signals).
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePageParam, totalPages } from "@/pages/admin/adminPropertyHelpers";
import { identityLine, authorTypeLabel, summarizeQueueSignals, REPORT_REASON_OPTIONS, AUTHOR_TYPE_OPTIONS, REVIEW_QUEUE_SORT_OPTIONS } from "./moderationHelpers";
import { KindBadge, PropertyCell, SignalChip } from "./moderationUi";
import ModerationActions from "./ModerationActions";
import ModerationListState from "./ModerationListState";
import ModerationPagination from "./ModerationPagination";
import ModerationDetailSheet from "./ModerationDetailSheet";
import { useReviewQueue, type ReviewQueueRow } from "./useCommentModeration";

export default function ReviewQueueTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reason = searchParams.get("rqReason") || "all";
  const author = searchParams.get("rqAuthor") || "all";
  const sort = searchParams.get("rqSort") || "oldest";
  const page = parsePageParam(searchParams.get("rqPage"));
  const qParam = searchParams.get("rqQ") || "";

  const [searchInput, setSearchInput] = useState(qParam);
  useEffect(() => { setSearchInput(qParam); }, [qParam]);

  const setParam = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all" || (k === "rqSort" && v === "oldest")) next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("rqPage");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== qParam) setParam({ rqQ: searchInput || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useReviewQueue({ search: qParam, reason, authorType: author, sort, page });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;

  // Clamp out-of-range page after data settles (e.g. last item actioned away).
  const pageCount = totalPages(total);
  useEffect(() => {
    if (!query.isFetching && total > 0 && page > pageCount) {
      setParam({ rqPage: String(pageCount) }, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isFetching, total, page, pageCount]);

  const [selected, setSelected] = useState<ReviewQueueRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = (row: ReviewQueueRow) => { setSelected(row); setSheetOpen(true); };

  // Keep the selected row in sync with refreshed data; drop it if it left the queue.
  useEffect(() => {
    if (!selected) return;
    const fresh = rows.find((r) => r.comment_id === selected.comment_id);
    if (fresh) { if (fresh !== selected) setSelected(fresh); }
    else if (!query.isFetching && sheetOpen) setSheetOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query.isFetching]);

  const showState = useMemo(
    () => query.isLoading || query.isError || rows.length === 0,
    [query.isLoading, query.isError, rows.length],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[12rem]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comment, poster, property…"
            className="pl-9"
            aria-label="Search review queue"
          />
        </div>
        <Select value={reason} onValueChange={(v) => setParam({ rqReason: v })}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by report reason"><SelectValue /></SelectTrigger>
          <SelectContent>{REPORT_REASON_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={author} onValueChange={(v) => setParam({ rqAuthor: v })}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by author type"><SelectValue /></SelectTrigger>
          <SelectContent>{AUTHOR_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setParam({ rqSort: v })}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Sort review queue"><SelectValue /></SelectTrigger>
          <SelectContent>{REVIEW_QUEUE_SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {showState ? (
        <ModerationListState
          isLoading={query.isLoading}
          isError={query.isError}
          isEmpty={rows.length === 0}
          onRetry={() => query.refetch()}
          emptyText="Nothing to review — no comments are auto-hidden right now."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const signals = summarizeQueueSignals(row);
            return (
              <div
                key={row.comment_id}
                role="button"
                tabIndex={0}
                onClick={() => openSheet(row)}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openSheet(row); } }}
                className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge isReply={row.is_reply} />
                  <span className="rounded-full border border-amber-500 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {row.open_report_count} unresolved
                  </span>
                  {row.hidden_at && (
                    <span className="text-xs text-muted-foreground">
                      hidden {formatDistanceToNow(new Date(row.hidden_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 break-words text-sm text-foreground">{row.comment_text}</p>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="text-foreground">{identityLine(row.poster_pseudonym, row.poster_full_name)}</span>
                      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5">{authorTypeLabel(row.poster_is_owner)}</span>
                      {!row.poster_is_active && <span className="ml-1.5">(inactive)</span>}
                    </p>
                    <PropertyCell
                      propertyId={row.property_id}
                      building={row.property_building}
                      locality={row.property_locality}
                      city={row.property_city}
                      status={row.property_status}
                    />
                    <p>Owner: {identityLine(row.owner_pseudonym, row.owner_full_name)}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <ModerationActions commentId={row.comment_id} state="auto_hidden" />
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={(e) => { e.stopPropagation(); openSheet(row); }}>
                      Review
                    </Button>
                  </div>
                </div>

                {signals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {signals.map((s) => <SignalChip key={s}>{s}</SignalChip>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModerationPagination total={total} page={page} onPage={(n) => setParam({ rqPage: String(n) }, false)} />

      <ModerationDetailSheet row={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
