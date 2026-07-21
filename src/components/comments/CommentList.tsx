import { useMemo } from "react";
import CommentThread from "./CommentThread";
import type { CommentRow } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  rows: CommentRow[];
  canInteract: boolean;
  propertyId: string;
  propertyOwnerId: string;
  currentPseudonym: string | null;
  currentUserId: string;
  currentUserFullName: string | null;
  replyOpenId: string | null;
  reportedIds: Set<string>;
  onReplyToggle: (commentId: string) => void;
  onLike: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReplyPosted: (row: CommentRow) => void;
  // P6-G1: optional additions. Defaults preserve prior behaviour.
  sortMode?: "newest" | "liked";
  topLevelLimit?: number;
}

export default function CommentList(props: Props) {
  const isMobile = useIsMobile();

  const { topLevel, childrenMap } = useMemo(() => {
    const map = new Map<string, CommentRow[]>();
    const top: CommentRow[] = [];
    for (const r of props.rows) {
      if (r.parent_comment_id === null) top.push(r);
      else {
        const arr = map.get(r.parent_comment_id) ?? [];
        arr.push(r);
        map.set(r.parent_comment_id, arr);
      }
    }
    // P6-G1: honor sortMode prop; default "newest" preserves prior behaviour.
    if (props.sortMode === "liked") {
      top.sort((a, b) => b.like_count - a.like_count);
    } else {
      top.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }
    for (const [k, v] of map) {
      v.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      map.set(k, v);
    }
    return { topLevel: top, childrenMap: map };
  }, [props.rows, props.sortMode]);

  // P6-G1: cap visible top-level threads. Children of visible parents render fully.
  const visibleTop =
    typeof props.topLevelLimit === "number" && Number.isFinite(props.topLevelLimit)
      ? topLevel.slice(0, props.topLevelLimit)
      : topLevel;

  return (
    <div className="space-y-3">
      {visibleTop.map((r) => (
        <CommentThread
          key={r.comment_id}
          row={r}
          childrenMap={childrenMap}
          depth={0}
          canInteract={props.canInteract}
          isMobile={isMobile}
          propertyId={props.propertyId}
          propertyOwnerId={props.propertyOwnerId}
          currentPseudonym={props.currentPseudonym}
          currentUserId={props.currentUserId}
          currentUserFullName={props.currentUserFullName}
          replyOpenId={props.replyOpenId}
          reportedIds={props.reportedIds}
          onReplyToggle={props.onReplyToggle}
          onLike={props.onLike}
          onReport={props.onReport}
          onDelete={props.onDelete}
          onReplyPosted={props.onReplyPosted}
        />
      ))}
    </div>
  );
}
