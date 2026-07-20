import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Reason = "spam" | "abusive" | "false_information" | "other";

const REASONS: { value: Reason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "abusive", label: "Abusive or harassing" },
  { value: "false_information", label: "False information" },
  { value: "other", label: "Other" },
];

const NOTES_MAX = 500;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  commentId: string | null;
  onReported: (commentId: string) => void;
}

export default function ReportModal({ open, onOpenChange, commentId, onReported }: Props) {
  const [reason, setReason] = useState<Reason>("spam");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inlineErr, setInlineErr] = useState<string | null>(null);

  const reset = () => {
    setReason("spam");
    setNotes("");
    setInlineErr(null);
  };

  const notesTrim = notes.trim();
  const disabled = submitting || (reason === "other" && notesTrim.length === 0) || notes.length > NOTES_MAX;

  const submit = async () => {
    if (!commentId || disabled) return;
    setSubmitting(true);
    setInlineErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("report_comment", {
      p_comment_id: commentId,
      p_reason: reason,
      p_notes: notesTrim || undefined,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message ?? "";
      if (msg === "ALREADY_REPORTED") {
        setInlineErr("You've already reported this comment.");
      } else {
        setInlineErr("Something went wrong — try again.");
      }
      return;
    }
    toast.success("Thanks for reporting — we review all flagged comments and remove ones that break our guidelines.");
    onReported(commentId);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report comment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as Reason)}>
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem id={`report-reason-${r.value}`} value={r.value} />
                <Label htmlFor={`report-reason-${r.value}`} className="text-sm font-normal">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <div className="space-y-1">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={reason === "other" ? "Please describe the issue (required)" : "Add more details (optional)"}
              rows={3}
              maxLength={NOTES_MAX + 50}
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              {notes.length} / {NOTES_MAX}
            </div>
          </div>
          {inlineErr && <p className="text-sm text-destructive">{inlineErr}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={disabled}>
            {submitting ? "Reporting…" : "Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
