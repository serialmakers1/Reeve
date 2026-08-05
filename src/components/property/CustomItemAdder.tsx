/**
 * CustomItemAdder — staging input + Add button for owner-limited custom items.
 *
 * Validates the name in "add" mode (blank/length/duplicate/limit) before it is
 * added; the Add button is disabled while invalid. Nothing is appended to the
 * parent until Add is pressed on a valid name — no blank-row append. Enter adds
 * without submitting the surrounding form.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  validateCustomName,
  type CanonicalOption,
} from "@/utils/property/customItemValidation";

export interface CustomItemAdderProps {
  existingCustoms: string[];
  canonicalOptions: readonly CanonicalOption[];
  limit: number;
  /** Noun for messages/counter, e.g. "furniture items" / "amenities". */
  noun: string;
  onAdd: (name: string) => void;
  placeholder?: string;
}

export function CustomItemAdder({
  existingCustoms,
  canonicalOptions,
  limit,
  noun,
  onAdd,
  placeholder,
}: CustomItemAdderProps) {
  const [draft, setDraft] = useState("");

  const result = validateCustomName(draft, {
    mode: "add",
    existingCustoms,
    canonicalOptions,
    limit,
    noun,
  });
  const atLimit = existingCustoms.length >= limit;
  const canAdd = result.code === "OK";
  const showError = result.code !== "OK" && result.code !== "BLANK";

  const add = () => {
    if (!canAdd) return;
    onAdd(draft.trim().replace(/\s+/g, " "));
    setDraft("");
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">
        {existingCustoms.length} of {limit} custom items added
      </p>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          disabled={atLimit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              add();
            }
          }}
          className="min-h-[40px] flex-1"
        />
        <Button type="button" onClick={add} disabled={!canAdd} className="shrink-0">
          Add
        </Button>
      </div>
      {showError && <p className="mt-1 text-sm text-destructive">{result.message}</p>}
    </div>
  );
}
