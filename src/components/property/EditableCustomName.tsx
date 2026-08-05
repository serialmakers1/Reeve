/**
 * EditableCustomName — one editable custom furniture/amenity row (owner-limited mode).
 *
 * Holds its own draft state so intermediate keystrokes never reach the parent /
 * autosave (no partial "Study Tabl" writes). Commits to the parent only on blur or
 * Enter when valid; an invalid blur / Escape reverts to the value captured at the
 * start of the edit. Resyncs via useEffect when its `value` prop changes, so a
 * sibling deletion that shifts this row's value in never leaks a stale draft/error
 * (index-as-key is therefore safe).
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { CustomNameResult } from "@/utils/property/customItemValidation";

export interface EditableCustomNameProps {
  value: string;
  /** Validate the current draft in "edit" mode (parent excludes this row). */
  validate: (name: string) => CustomNameResult;
  /** Commit a valid, changed name to the parent. */
  onCommit: (name: string) => void;
  onDelete: () => void;
  /** Optional trailing control (e.g. furniture count input). */
  trailing?: ReactNode;
  placeholder?: string;
}

function displayForm(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function EditableCustomName({
  value,
  validate,
  onCommit,
  onDelete,
  trailing,
  placeholder,
}: EditableCustomNameProps) {
  const [draft, setDraft] = useState(value);
  const startRef = useRef(value);

  // Resync when the underlying value changes externally (e.g. sibling deleted).
  useEffect(() => {
    setDraft(value);
    startRef.current = value;
  }, [value]);

  const result = validate(draft);
  const showError = result.code !== "OK" && result.code !== "BLANK";

  const commit = () => {
    if (result.code === "OK") {
      const next = displayForm(draft);
      if (next !== startRef.current) onCommit(next);
      startRef.current = next;
      setDraft(next);
    } else {
      // Invalid or blank → revert to the pre-edit value.
      setDraft(startRef.current);
    }
  };

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft(startRef.current);
            }
          }}
          className={cn("min-h-[40px] flex-1", showError && "border-destructive")}
        />
        {trailing}
        <button type="button" onClick={onDelete} aria-label="Remove item">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      {showError && <p className="mt-1 text-sm text-destructive">{result.message}</p>}
    </div>
  );
}
