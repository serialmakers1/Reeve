import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Info, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import CommentGateCard from "./CommentGateCard";
import CommentComposer from "./CommentComposer";
import CommentList from "./CommentList";
import ReportModal from "./ReportModal";
import type { CommentRow } from "./types";

interface Props {
  propertyId: string;
  propertyOwnerId: string;
  commentCount: number;
}

export interface CommentSectionHandle {
  triggerLoad: () => void;
}

const PAGE_SIZE = 20;

const CommentSection = forwardRef<CommentSectionHandle, Props>(function CommentSection(
  { propertyId, propertyOwnerId, commentCount },
  ref,
) {
  const { user, isAuthenticated, isFullyVerified } = useAuth();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [reportOpenId, setReportOpenId] = useState<string | null>(null);
  // F3-C2: section open by default (was collapsed in F1F-7). The IO sentinel
  // now mounts on first paint, so triggerLoad fires without a user click.
  const [sectionOpen, setSectionOpen] = useState<boolean>(true);
  // P6-G1: sort mode + initial top-level cap. Reset cap when the property changes.
  const [sortMode, setSortMode] = useState<"newest" | "liked">("newest");
  const [visibleCount, setVisibleCount] = useState<number>(3);
  useEffect(() => { setVisibleCount(3); }, [propertyId]);
  // Headline count = server total (get_property_counts: all non-deleted comments,
  // top-level + replies) adjusted by this session's optimistic post/delete deltas.
  // Deriving it from loaded rows was wrong — it dropped replies, counted tombstones,
  // and shrank to the loaded page. Reset the delta when the property changes.
  const [countDelta, setCountDelta] = useState<number>(0);
  useEffect(() => { setCountDelta(0); }, [propertyId]);

  // Client-side "Most liked" sort. `rows` is a flat array; we reorder top-level
  // parents by like_count and keep children beside their parents so CommentList's
  // childrenMap still groups correctly.
  const sortedRows = useMemo(() => {
    if (sortMode === "newest") return rows;
    const tops = rows.filter((r) => r.parent_comment_id === null);
    const children = rows.filter((r) => r.parent_comment_id !== null);
    tops.sort((a, b) => b.like_count - a.like_count);
    return [...tops, ...children];
  }, [rows, sortMode]);

  const topLevelCount = useMemo(
    () => rows.filter((r) => r.parent_comment_id === null).length,
    [rows],
  );

  const fetchPage = useCallback(async (cursor?: string) => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("get_property_comments", {
      p_property_id: propertyId,
      p_cursor: cursor ?? null,
      p_limit: PAGE_SIZE,
    });
    setLoading(false);
    const arr = Array.isArray(data) ? (data as CommentRow[]) : [];
    setRows((prev) => cursor ? [...prev, ...arr] : arr);
    // hasMore heuristic: only meaningful when counting new top-level rows.
    const newTop = arr.filter((r) => r.parent_comment_id === null).length;
    setHasMore(newTop >= PAGE_SIZE);
    setLoaded(true);
  }, [propertyId]);

  const triggerLoad = useCallback(() => {
    // F1F-7: external trigger also opens the section so the loaded rows are visible.
    setSectionOpen(true);
    if (loaded || loading) return;
    fetchPage();
  }, [loaded, loading, fetchPage]);

  useImperativeHandle(ref, () => ({ triggerLoad }), [triggerLoad]);

  // IntersectionObserver — fires on first scroll into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loaded) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        triggerLoad();
      }
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [loaded, triggerLoad]);

  // Fetch current user's pseudonym for the composer's "Commenting as…" line.
  useEffect(() => {
    if (!isAuthenticated || !isFullyVerified || !user?.id) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("users")
        .select("pseudonym")
        .eq("id", user.id)
        .maybeSingle();
      setPseudonym((data as { pseudonym?: string | null } | null)?.pseudonym ?? null);
    })();
  }, [isAuthenticated, isFullyVerified, user?.id]);

  const handleReplyToggle = useCallback((commentId: string) => {
    setReplyOpenId((cur) => (cur === commentId ? null : commentId));
  }, []);

  const handleLike = useCallback(async (commentId: string) => {
    // Optimistic
    let prevSnapshot: { liked: boolean; count: number } | null = null;
    setRows((prev) => prev.map((r) => {
      if (r.comment_id !== commentId) return r;
      prevSnapshot = { liked: r.liked_by_me, count: r.like_count };
      return { ...r, liked_by_me: !r.liked_by_me, like_count: r.like_count + (r.liked_by_me ? -1 : 1) };
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("toggle_comment_like", { p_comment_id: commentId });
    if (error) {
      // Revert
      setRows((prev) => prev.map((r) =>
        r.comment_id === commentId && prevSnapshot
          ? { ...r, liked_by_me: prevSnapshot.liked, like_count: prevSnapshot.count }
          : r,
      ));
      toast.error("Couldn't update like — try again");
      return;
    }
    const server = data as { liked?: boolean; like_count?: number } | null;
    if (server && typeof server.like_count === "number") {
      setRows((prev) => prev.map((r) =>
        r.comment_id === commentId
          ? { ...r, liked_by_me: server.liked ?? r.liked_by_me, like_count: server.like_count! }
          : r,
      ));
    }
  }, []);

  const handleDelete = useCallback(async (commentId: string) => {
    let prev: CommentRow | null = null;
    setRows((rs) => rs.map((r) => {
      if (r.comment_id !== commentId) return r;
      prev = r;
      return { ...r, text: "[deleted]", hidden_reason: "user_deleted" };
    }));
    setCountDelta((d) => d - 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("delete_own_comment", {
      p_comment_id: commentId,
    });
    if (error) {
      setRows((rs) => rs.map((r) => (r.comment_id === commentId && prev ? prev : r)));
      setCountDelta((d) => d + 1);
      const msg = error.message ?? "";
      if (msg === "NOT_YOUR_COMMENT") toast.error("You can only delete your own comments");
      else if (msg === "COMMENT_NOT_FOUND") toast.error("This comment no longer exists");
      else if (msg === "ALREADY_DELETED") toast.error("This comment is already deleted");
      else toast.error("Couldn't delete comment — try again");
    }
  }, []);

  const handleReport = useCallback((commentId: string) => {
    setReportOpenId(commentId);
  }, []);

  const handleReplyPosted = useCallback((row: CommentRow) => {
    setRows((prev) => [...prev, row]);
    setCountDelta((d) => d + 1);
  }, []);

  const loadMore = () => {
    const lastTop = [...rows].reverse().find((r) => r.parent_comment_id === null);
    if (lastTop) fetchPage(lastTop.created_at);
  };

  const gateState: "logged_out" | "needs_phone" | "needs_email" | "needs_both" | null =
    !isAuthenticated ? "logged_out" :
    isFullyVerified ? null :
    (!user?.phone_verified && !user?.email_verified) ? "needs_both" :
    !user?.phone_verified ? "needs_phone" : "needs_email";

  const canInteract = isFullyVerified;

  const displayCount = Math.max(0, commentCount + countDelta);

  return (
    <section className="space-y-3 px-4 lg:px-0">
      {/* F1F-7: section-level toggle; body loads on open (defers RPC + auto-load). */}
      <button
        type="button"
        onClick={() => {
          setSectionOpen((v) => {
            const next = !v;
            if (next) triggerLoad();
            return next;
          });
        }}
        aria-expanded={sectionOpen}
        className="flex w-full items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Questions &amp; Answers</h2>
          {displayCount > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {displayCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            sectionOpen && "rotate-180",
          )}
        />
      </button>
      {!sectionOpen ? null : (<>

      {/* P6-G1 + F1-B5e: guidance line + shadcn Tooltip (works on touch via tap). */}
      <TooltipProvider delayDuration={200}>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <span>Public Q&amp;A — your question helps other tenants too. Property questions only.</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Comment rules"
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              Public + permanent · shown under your alias · 1000 char max · rate-limited to 3/hr,
              10/day · no links or phone numbers · reported comments auto-hide.
            </TooltipContent>
          </Tooltip>
        </p>
      </TooltipProvider>

      {gateState ? (
        <CommentGateCard state={gateState} />
      ) : (
        user?.id && (
          <CommentComposer
            propertyId={propertyId}
            propertyOwnerId={propertyOwnerId}
            pseudonym={pseudonym}
            currentUserId={user.id}
            currentUserFullName={user.full_name ?? null}
            onPosted={(row) => { setRows((prev) => [row, ...prev]); setCountDelta((d) => d + 1); }}
          />
        )
      )}

      {/* P6-G1: sort toggle — client-side reorder, no re-fetch. */}
      {loaded && topLevelCount > 0 && (
        <div className="flex gap-1.5">
          {(["newest", "liked"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSortMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                sortMode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m === "newest" ? "Newest" : "Most liked"}
            </button>
          ))}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />

      {!loaded && loading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {loaded && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {gateState === "logged_out"
            ? "No comments yet. Log in to be the first."
            : gateState
              ? "No comments yet. Complete verification to comment."
              : "No comments yet. Ask a question or share what you know about this property or area."}
        </p>
      )}

      {loaded && rows.length > 0 && (
        <>
          <CommentList
            rows={sortedRows}
            canInteract={canInteract}
            propertyId={propertyId}
            propertyOwnerId={propertyOwnerId}
            currentPseudonym={pseudonym}
            currentUserId={user?.id ?? ""}
            currentUserFullName={user?.full_name ?? null}
            replyOpenId={replyOpenId}
            reportedIds={reportedIds}
            onReplyToggle={handleReplyToggle}
            onLike={handleLike}
            onReport={handleReport}
            onDelete={handleDelete}
            onReplyPosted={handleReplyPosted}
            sortMode={sortMode}
            topLevelLimit={visibleCount}
          />
          {topLevelCount > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount(Number.POSITIVE_INFINITY)}
              className="text-sm font-medium text-primary"
            >
              View all {topLevelCount} {topLevelCount === 1 ? "comment" : "comments"}
            </button>
          )}
        </>
      )}

      {loaded && hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <ReportModal
        open={reportOpenId !== null}
        onOpenChange={(v) => { if (!v) setReportOpenId(null); }}
        commentId={reportOpenId}
        onReported={(id, autoHidden) => {
          setReportedIds((s) => new Set(s).add(id));
          // If this report was the 3rd that auto-hid the comment, the server count
          // (is_deleted=false) dropped by 1 — mirror it, and reconcile the loaded
          // row to its tombstone so existing isDeleted gating removes interactions.
          if (autoHidden) {
            setCountDelta((d) => d - 1);
            setRows((rs) => rs.map((r) =>
              r.comment_id === id ? { ...r, hidden_reason: "auto_hidden_reports" } : r));
          }
        }}
      />
      </>)}
    </section>
  );
});

export default CommentSection;
