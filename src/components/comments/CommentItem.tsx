import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, Home, Flag, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ReplyComposer from "./ReplyComposer";
import type { CommentRow } from "./types";

interface Props {
  row: CommentRow;
  canInteract: boolean;
  propertyId: string;
  currentPseudonym: string | null;
  replyOpenId: string | null;
  reported: boolean;
  onReplyToggle: (commentId: string) => void;
  onLike: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReplyPosted: (row: CommentRow) => void;
}

function deletedCopy(reason: string | null): string {
  if (reason === "auto_hidden_reports") return "[removed pending review]";
  if (reason === "admin_hidden") return "[removed by moderator]";
  return "[deleted]";
}

export default function CommentItem({
  row,
  canInteract,
  propertyId,
  currentPseudonym,
  replyOpenId,
  reported,
  onReplyToggle,
  onLike,
  onReport,
  onDelete,
  onReplyPosted,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleted = row.text === "[deleted]" || !!row.hidden_reason;
  const nameCls = row.is_owner
    ? "text-sm font-medium text-foreground"
    : "text-sm font-medium text-muted-foreground";
  const cardCls = row.is_owner
    ? "rounded-lg bg-primary/5 border border-primary/10 p-3"
    : "rounded-lg p-3";
  const replyOpen = replyOpenId === row.comment_id;

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2 flex-wrap">
        {row.is_owner && <Home className="h-4 w-4 text-primary" aria-hidden />}
        <span className={nameCls}>
          {row.is_owner && row.real_name ? row.real_name : row.pseudonym}
        </span>
        {row.is_owner && (
          <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            Owner
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
        </span>
      </div>

      <div className="mt-1.5">
        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">{deletedCopy(row.hidden_reason)}</p>
        ) : (
          <p className="whitespace-pre-line text-sm text-foreground">{row.text}</p>
        )}
      </div>

      {!isDeleted && (
        <div className="mt-2 flex items-center gap-3">
          {canInteract ? (
            <button
              type="button"
              onClick={() => onLike(row.comment_id)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Like"
            >
              <Heart className={`h-3.5 w-3.5 ${row.liked_by_me ? "fill-current text-red-500" : ""}`} />
              <span>{row.like_count}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label="Likes">
              <Heart className="h-3.5 w-3.5" />
              <span>{row.like_count}</span>
            </span>
          )}
          {canInteract && (
            <button
              type="button"
              onClick={() => onReplyToggle(row.comment_id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
          {canInteract && !row.is_mine && (
            reported ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground opacity-60">
                <Flag className="h-3.5 w-3.5" /> Reported ✓
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onReport(row.comment_id)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Flag className="h-3.5 w-3.5" /> Report
              </button>
            )
          )}
          {row.is_mine && (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      )}

      {replyOpen && (
        <ReplyComposer
          propertyId={propertyId}
          parentCommentId={row.comment_id}
          parentPseudonym={row.pseudonym}
          pseudonym={currentPseudonym}
          onCancel={() => onReplyToggle(row.comment_id)}
          onPosted={(newRow) => { onReplyPosted(newRow); onReplyToggle(row.comment_id); }}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove your comment?</AlertDialogTitle>
            <AlertDialogDescription>
              Your comment text will be removed permanently. Your anonymous name ({row.pseudonym}) will stay visible with "[deleted]" in its place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete(row.comment_id); setDeleteOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove comment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
