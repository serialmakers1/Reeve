import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Phase 3 Prompt 4 — decline reason modal.
// Values match the contact_request_decline_reason enum verbatim (D-P3-007).
export const DECLINE_REASONS: Array<{ value: string; label: string }> = [
  { value: "preferences_dont_fit",             label: "Preferences don't fit" },
  { value: "property_currently_unavailable",   label: "Property currently unavailable" },
  { value: "prefer_to_wait",                   label: "Prefer to wait for now" },
  { value: "not_the_right_fit",                label: "Not the right fit right now" },
  { value: "property_no_longer_available",     label: "Property no longer available" },
];

interface DeclineReasonModalProps {
  open: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
  submitting?: boolean;
}

export default function DeclineReasonModal({ open, onConfirm, onClose, submitting = false }: DeclineReasonModalProps) {
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!open) setSelected("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this request?</DialogTitle>
          <DialogDescription>
            Choose a reason. The tenant sees the reason in their dashboard — no free text.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2 py-2">
          {DECLINE_REASONS.map((r) => (
            <Label
              key={r.value}
              htmlFor={`dr-${r.value}`}
              className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/40"
            >
              <RadioGroupItem id={`dr-${r.value}`} value={r.value} />
              <span className="text-sm">{r.label}</span>
            </Label>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!selected || submitting}
            onClick={() => selected && onConfirm(selected)}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Decline request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
