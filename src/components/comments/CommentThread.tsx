import { useState } from "react";
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
}

// P6-G2: pl-{n} + left border replaces prior ml-{n}. The left border IS the
// connector line — clicking it collapses the thread's children.
function indentClass(depth: number, isMobile: boolean): string {
  if (depth === 0) return "";
  const capped = isMobile ? Math.min(depth, 2) : Math.min(depth, 4);
  const map: Record<number, string> = { 1: "pl-4", 2: "pl-8", 3: "pl-12", 4: "pl-16" };
  return map[capped] ?? "pl-16";
}

export default function CommentThread(props: Props) {
  const { row, childrenMap, depth, isMobile } = props;
  const kids = childrenMap.get(row.comment_id) ?? [];
  // Owner-replied indicator: only on top-level threads where a direct child is owner.
  const hasOwnerReply = depth === 0 && !row.is_owner && kids.some((c) => c.is_owner);
  // F2-A2: reply threads (depth > 0) start collapsed; root questions stay expanded.
  const [collapsed, setCollapsed] = useState(depth > 0);
  const showConnector = depth > 0;

  const inner = (
    <>
      <CommentItem
        row={row}
        canInteract={props.canInteract}
        propertyId={props.propertyId}
        propertyOwnerId={props.propertyOwnerId}
        currentPseudonym={props.currentPseudonym}
        currentUserId={props.currentUserId}
        currentUserFullName={props.currentUserFullName}
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
        collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mt-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/10"
          >
            — {kids.length} repl{kids.length === 1 ? "y" : "ies"} · tap to expand
          </button>
        ) : (
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
        )
      )}
    </>
  );

  if (!showConnector) {
    // Depth 0 has no left border — but still supports collapse via the reply pill above.
    // Provide a "collapse thread" affordance via a subtle button when there are children.
    return (
      <div>
        {inner}
        {kids.length > 0 && !collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse replies"
            className="mt-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Collapse thread
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={collapsed ? "Expand replies" : "Collapse replies"}
      onClick={(e) => {
        // Only toggle when the click hits the container itself, not a descendant
        // interactive element (like/reply/report/etc.).
        if (e.target === e.currentTarget) setCollapsed((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setCollapsed((v) => !v);
        }
      }}
      className={`relative border-l-2 border-muted transition-colors hover:border-primary/40 ${indentClass(depth, isMobile)}`}
    >
      {inner}
    </div>
  );
}
