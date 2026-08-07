/**
 * Unhide / Delete controls, shared by the tabs and the detail sheet.
 * - Delete ALWAYS confirms (AlertDialog); Unhide does not.
 * - Actions for this comment are disabled while its mutation is in flight.
 * - Success → toast + onActioned("success"). Stale/two-admin errors reconcile
 *   (queries invalidate via the mutation) → onActioned("stale"). Normal errors
 *   just toast and leave the caller (e.g. sheet) open.
 */
import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  allowedActionsForState, moderationErrorMessage, isStaleModerationError,
  type ModerationAction,
} from "./moderationHelpers";
import { useModerationAction } from "./useCommentModeration";

interface Props {
  commentId: string;
  state: string;
  size?: "sm" | "default";
  /** Called after an action settles: "success" or a reconciled stale error. */
  onActioned?: (action: ModerationAction, outcome: "success" | "stale") => void;
  className?: string;
}

export default function ModerationActions({ commentId, state, size = "sm", onActioned, className }: Props) {
  const { toast } = useToast();
  const mutation = useModerationAction();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const actions = allowedActionsForState(state);
  const pending = mutation.isPending;
  const btnSize = size === "sm" ? "h-7 text-xs" : "";

  if (actions.length === 0) return null;

  const run = (action: ModerationAction) => {
    mutation.mutate(
      { action, commentId },
      {
        onSuccess: () => {
          toast({ title: action === "unhide" ? "Comment restored" : "Comment removed" });
          onActioned?.(action, "success");
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          toast({ title: moderationErrorMessage(message), variant: "destructive" });
          if (isStaleModerationError(message)) onActioned?.(action, "stale");
        },
      },
    );
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} onClick={(e) => e.stopPropagation()}>
      {actions.includes("unhide") && (
        <Button
          variant="outline"
          className={cn(btnSize, "border-green-500 text-green-700 hover:bg-green-50")}
          disabled={pending}
          onClick={(e) => { e.stopPropagation(); run("unhide"); }}
        >
          <RotateCcw className="mr-1 h-3 w-3" /> Unhide
        </Button>
      )}
      {actions.includes("delete") && (
        <Button
          variant="destructive"
          className={btnSize}
          disabled={pending}
          onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
        >
          <Trash2 className="mr-1 h-3 w-3" /> Delete
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be hidden from the property page and marked as removed by a moderator.
              This is reversible — you can Unhide it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => { e.stopPropagation(); run("delete"); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Removing…" : "Remove comment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
