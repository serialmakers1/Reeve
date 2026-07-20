import { Home } from "lucide-react";
import CommentItem from "./CommentItem";
import type { CommentRow } from "./types";

interface Props {
  row: CommentRow;
  childrenMap: Map<string, CommentRow[]>;
  depth: number;
  canInteract: boolean;
  isMobile: boolean;
  propertyId: string;
  currentPseudonym: string | null;
  replyOpenId: string | null;
  reportedIds: Set<string>;
  onReplyToggle: (commentId: string) => void;
  onLike: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReplyPosted: (row: CommentRow) => void;
}

function indentClass(depth: number, isMobile: boolean): string {
  if (depth === 0) return "";
  const capped = isMobile ? Math.min(depth, 2) : Math.min(depth, 4);
  const map: Record<number, string> = { 1: "ml-4", 2: "ml-8", 3: "ml-12", 4: "ml-16" };
  return map[capped] ?? "ml-16";
}

export default function CommentThread(props: Props) {
  const { row, childrenMap, depth, isMobile } = props;
  const kids = childrenMap.get(row.comment_id) ?? [];
  // Owner-replied indicator: only on top-level threads where a direct child is owner.
  const hasOwnerReply = depth === 0 && !row.is_owner && kids.some((c) => c.is_owner);

  return (
    <div className={indentClass(depth, isMobile)}>
      <CommentItem
        row={row}
        canInteract={props.canInteract}
        propertyId={props.propertyId}
        currentPseudonym={props.currentPseudonym}
        replyOpenId={props.replyOpenId}
        reported={props.reportedIds.has(row.comment_id)}
        onReplyToggle={props.onReplyToggle}
        onLike={props.onLike}
        onReport={props.onReport}
        onDelete={props.onDelete}
        onReplyPosted={props.onReplyPosted}
      />
      {hasOwnerReply && (
        <p className="mt-1 ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Home className="h-3 w-3" /> Owner replied
        </p>
      )}
      {kids.length > 0 && (
        <div className="mt-2 space-y-2">
          {kids.map((c) => (
            <CommentThread
              key={c.comment_id}
              {...props}
              row={c}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
