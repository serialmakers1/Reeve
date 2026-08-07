/**
 * User Signals — moderation-relevant users (authored ≥1 comment OR filed ≥1
 * report). Both directions, investigative only: no score, charts, or controls.
 *
 * `comments_auto_hidden` / `comments_admin_deleted` count CURRENT state (a later
 * unhide stops counting), so they are labelled "Currently …", not lifetime.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePageParam, totalPages } from "@/pages/admin/adminPropertyHelpers";
import { identityLine, USER_SIGNALS_SORT_OPTIONS } from "./moderationHelpers";
import { SignalChip } from "./moderationUi";
import ModerationListState from "./ModerationListState";
import ModerationPagination from "./ModerationPagination";
import { useUserSignals, type UserSignalRow } from "./useCommentModeration";

function Stat({ label, value, amber }: { label: string; value: number; amber?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 md:block md:text-center">
      <span className="text-xs text-muted-foreground md:block">{label}</span>
      <span className={amber && value > 0 ? "text-sm font-semibold text-amber-700" : "text-sm font-medium text-foreground"}>{value}</span>
    </div>
  );
}

function concentrationText(row: UserSignalRow): string {
  if (row.distinct_properties_reported === 0) return "—";
  return `${row.max_reports_single_property} on one · ${row.distinct_properties_reported} properties`;
}

export default function UserSignalsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("usSort") || "reports_filed";
  const page = parsePageParam(searchParams.get("usPage"));
  const qParam = searchParams.get("usQ") || "";

  const [searchInput, setSearchInput] = useState(qParam);
  useEffect(() => { setSearchInput(qParam); }, [qParam]);

  const setParam = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || (k === "usSort" && v === "reports_filed")) next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("usPage");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== qParam) setParam({ usQ: searchInput || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useUserSignals({ search: qParam, sort, page });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;

  const pageCount = totalPages(total);
  useEffect(() => {
    if (!query.isFetching && total > 0 && page > pageCount) setParam({ usPage: String(pageCount) }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isFetching, total, page, pageCount]);

  const showState = query.isLoading || query.isError || rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-[12rem]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by pseudonym or name…" className="pl-9" aria-label="Search users" />
        </div>
        <Select value={sort} onValueChange={(v) => setParam({ usSort: v })}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Sort users"><SelectValue /></SelectTrigger>
          <SelectContent>{USER_SIGNALS_SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {showState ? (
        <ModerationListState
          isLoading={query.isLoading}
          isError={query.isError}
          isEmpty={rows.length === 0}
          onRetry={() => query.refetch()}
          emptyText="No comment or report activity yet."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.user_id} className="rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{identityLine(row.pseudonym, row.full_name)}</span>
                {!row.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                {row.reports_on_owned_property > 0 && (
                  <SignalChip>{row.reports_on_owned_property} report{row.reports_on_owned_property === 1 ? "" : "s"} on own property</SignalChip>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
                <Stat label="Comments" value={row.comments_count} />
                <Stat label="Reports received" value={row.comment_reports_received} />
                <Stat label="Currently auto-hidden" value={row.comments_auto_hidden} amber />
                <Stat label="Currently admin-removed" value={row.comments_admin_deleted} amber />
                <Stat label="Reports filed" value={row.reports_filed} />
                <Stat label="Dismissed" value={row.reports_dismissed} />
                <Stat label="Upheld" value={row.reports_upheld} amber />
                <div className="col-span-2 flex items-baseline justify-between gap-2 md:col-span-1 md:block md:text-center">
                  <span className="text-xs text-muted-foreground md:block">Concentration</span>
                  <span className="text-sm text-foreground">{concentrationText(row)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModerationPagination total={total} page={page} onPage={(n) => setParam({ usPage: String(n) }, false)} />
    </div>
  );
}
