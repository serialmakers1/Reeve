import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
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
  commentCount: number;
}

export interface CommentSectionHandle {
  triggerLoad: () => void;
}

const PAGE_SIZE = 20;

const CommentSection = forwardRef<CommentSectionHandle, Props>(function CommentSection(
  { propertyId, commentCount },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("delete_own_comment", {
      p_comment_id: commentId,
    });
    if (error) {
      setRows((rs) => rs.map((r) => (r.comment_id === commentId && prev ? prev : r)));
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

  return (
    <section id="comments" className="space-y-3 px-4 lg:px-0">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">Comments</h2>
        {commentCount > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {commentCount}
          </span>
        )}
      </div>

      {gateState ? (
        <CommentGateCard state={gateState} />
      ) : (
        user?.id && (
          <CommentComposer
            propertyId={propertyId}
            pseudonym={pseudonym}
            currentUserId={user.id}
            onPosted={(row) => setRows((prev) => [row, ...prev])}
          />
        )
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
        <CommentList
          rows={rows}
          canInteract={canInteract}
          propertyId={propertyId}
          currentPseudonym={pseudonym}
          replyOpenId={replyOpenId}
          reportedIds={reportedIds}
          onReplyToggle={handleReplyToggle}
          onLike={handleLike}
          onReport={handleReport}
          onDelete={handleDelete}
          onReplyPosted={handleReplyPosted}
        />
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
        onReported={(id) => setReportedIds((s) => new Set(s).add(id))}
      />
    </section>
  );
});

export default CommentSection;
