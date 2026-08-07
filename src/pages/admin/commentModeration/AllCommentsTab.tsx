/**
 * All Comments — every comment in any state, server-side filter/sort/paginate.
 * Desktop grid rows, mobile stacked cards. Actions are state-driven (never an
 * action the backend rejects by design).
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusDisplay } from "@/lib/propertyStatus";
import { parsePageParam, totalPages } from "@/pages/admin/adminPropertyHelpers";
import {
  identityLine, authorTypeLabel,
  COMMENT_STATE_OPTIONS, REPORT_BUCKET_OPTIONS, AUTHOR_TYPE_OPTIONS, ALL_COMMENTS_SORT_OPTIONS,
} from "./moderationHelpers";
import { KindBadge, StateBadge, PropertyCell } from "./moderationUi";
import ModerationActions from "./ModerationActions";
import ModerationListState from "./ModerationListState";
import ModerationPagination from "./ModerationPagination";
import { useAdminComments } from "./useCommentModeration";

const PROPERTY_STATUS_OPTIONS = [
  { value: "all", label: "All properties" },
  ...["listed", "edit_pending_review", "unlisted", "archived", "draft", "pending_review", "changes_requested"].map(
    (s) => ({ value: s, label: getStatusDisplay(s).label }),
  ),
];

const GRID = "grid-cols-[2fr_1.2fr_1.3fr_0.9fr_0.7fr_0.9fr_1.4fr]";

function ReportCount({ count }: { count: number }) {
  return (
    <span className={count > 0 ? "text-sm font-medium text-amber-700" : "text-sm text-muted-foreground"}>
      {count}
    </span>
  );
}

export default function AllCommentsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = searchParams.get("state") || "all";
  const bucket = searchParams.get("bucket") || "all";
  const author = searchParams.get("author") || "all";
  const pstatus = searchParams.get("pstatus") || "all";
  const sort = searchParams.get("sort") || "newest";
  const page = parsePageParam(searchParams.get("page"));
  const qParam = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(qParam);
  useEffect(() => { setSearchInput(qParam); }, [qParam]);

  const setParam = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all" || (k === "sort" && v === "newest")) next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== qParam) setParam({ q: searchInput || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useAdminComments({ search: qParam, state, bucket, authorType: author, propertyStatus: pstatus, sort, page });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;

  const pageCount = totalPages(total);
  useEffect(() => {
    if (!query.isFetching && total > 0 && page > pageCount) setParam({ page: String(pageCount) }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isFetching, total, page, pageCount]);

  const showState = query.isLoading || query.isError || rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[12rem]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search comment, poster, property…" className="pl-9" aria-label="Search comments" />
        </div>
        <Select value={state} onValueChange={(v) => setParam({ state: v })}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by state"><SelectValue /></SelectTrigger>
          <SelectContent>{COMMENT_STATE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={bucket} onValueChange={(v) => setParam({ bucket: v })}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by report count"><SelectValue /></SelectTrigger>
          <SelectContent>{REPORT_BUCKET_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={author} onValueChange={(v) => setParam({ author: v })}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by author type"><SelectValue /></SelectTrigger>
          <SelectContent>{AUTHOR_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={pstatus} onValueChange={(v) => setParam({ pstatus: v })}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by property status"><SelectValue /></SelectTrigger>
          <SelectContent>{PROPERTY_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setParam({ sort: v })}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Sort comments"><SelectValue /></SelectTrigger>
          <SelectContent>{ALL_COMMENTS_SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {showState ? (
        <ModerationListState
          isLoading={query.isLoading}
          isError={query.isError}
          isEmpty={rows.length === 0}
          onRetry={() => query.refetch()}
          emptyText="No comments match these filters."
        />
      ) : (
        <div className="rounded-lg border">
          <div className={`hidden md:grid ${GRID} gap-4 border-b bg-muted px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground`}>
            <span>Comment</span><span>Poster</span><span>Property</span><span>State</span><span>Reports</span><span>Posted</span><span className="text-right">Actions</span>
          </div>
          {rows.map((row) => (
            <div key={row.comment_id} className="border-t px-4 py-3 first:border-t-0">
              {/* Mobile card */}
              <div className="space-y-2 md:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge isReply={row.is_reply} />
                  <StateBadge state={row.state} />
                  <span className="ml-auto text-xs text-muted-foreground">{format(new Date(row.comment_created_at), "d MMM yyyy")}</span>
                </div>
                <p className="line-clamp-3 break-words text-sm text-foreground">{row.comment_text}</p>
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground">{identityLine(row.poster_pseudonym, row.poster_full_name)}</span>
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5">{authorTypeLabel(row.poster_is_owner)}</span>
                  {!row.poster_is_active && <span className="ml-1.5">(inactive)</span>}
                </div>
                <PropertyCell propertyId={row.property_id} building={row.property_building} locality={row.property_locality} city={row.property_city} status={row.property_status} />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Reports: <ReportCount count={row.report_count} /></span>
                  <ModerationActions commentId={row.comment_id} state={row.state} />
                </div>
              </div>

              {/* Desktop grid */}
              <div className={`hidden md:grid ${GRID} gap-4 items-start`}>
                <div className="min-w-0">
                  <KindBadge isReply={row.is_reply} />
                  <p className="mt-1 line-clamp-2 break-words text-sm text-foreground">{row.comment_text}</p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="truncate text-foreground">{identityLine(row.poster_pseudonym, row.poster_full_name)}</p>
                  <p className="text-xs text-muted-foreground">{authorTypeLabel(row.poster_is_owner)}{!row.poster_is_active && " · inactive"}</p>
                </div>
                <PropertyCell propertyId={row.property_id} building={row.property_building} locality={row.property_locality} city={row.property_city} status={row.property_status} />
                <div><StateBadge state={row.state} /></div>
                <ReportCount count={row.report_count} />
                <span className="text-sm text-muted-foreground">{format(new Date(row.comment_created_at), "d MMM yyyy")}</span>
                <div className="flex justify-end">
                  <ModerationActions commentId={row.comment_id} state={row.state} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModerationPagination total={total} page={page} onPage={(n) => setParam({ page: String(n) }, false)} />
    </div>
  );
}
