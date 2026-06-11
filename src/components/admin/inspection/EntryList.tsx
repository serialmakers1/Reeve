/**
 * EntryList — generic reusable add-entry / fill-fields / delete-entry component.
 *
 * Used for surfaces (walls, flooring, ceiling), doors/windows, electrical,
 * plumbing — any section that stores a list of entry objects in room_features JSONB.
 *
 * All field definitions come from the `fields` prop. This component contains
 * no surface-specific logic.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Public types ──────────────────────────────────────────────────────────────

export type FieldConfig = {
  key: string;
  label: string;
  type: "select" | "text" | "number" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  /** When defined, the field only renders when this predicate returns true. */
  showWhen?: (entry: Record<string, unknown>) => boolean;
  /**
   * When set and the field's current value equals this string, a free-text
   * input renders below the select, writing to `<key>_custom` in the entry.
   */
  customTextOnValue?: string;
  /** Placeholder for the custom text input shown via customTextOnValue. */
  customTextPlaceholder?: string;
};

export type EntryListProps = {
  entries: Record<string, unknown>[];
  fields: FieldConfig[];
  onUpdate: (index: number, key: string, value: unknown) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  /** Optional second add button for custom-labelled entries */
  onAddCustom?: () => void;
  addLabel?: string;
  deleteConfirmText?: string;
  emptyText?: string;
  entryTitle?: (entry: Record<string, unknown>, index: number) => string;
  /** When true an "Add custom item" button is shown alongside the regular Add */
  allowCustom?: boolean;
};

// ── Field renderer — defined outside component to avoid inline component rule ─

function FieldRenderer({
  field,
  entry,
  index,
  onUpdate,
}: {
  field: FieldConfig;
  entry: Record<string, unknown>;
  index: number;
  onUpdate: (index: number, key: string, value: unknown) => void;
}) {
  if (field.showWhen && !field.showWhen(entry)) return null;

  const rawVal = entry[field.key];
  const strVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : "";

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>

      {field.type === "select" && (
        <>
          <Select
            value={strVal || undefined}
            onValueChange={(v) => onUpdate(index, field.key, v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={field.placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Inline free-text input when the "custom"-style option is selected */}
          {field.customTextOnValue !== undefined && strVal === field.customTextOnValue && (
            <Input
              className="h-9"
              placeholder={field.customTextPlaceholder ?? "Describe…"}
              value={String(entry[`${field.key}_custom`] ?? "")}
              onChange={(e) => onUpdate(index, `${field.key}_custom`, e.target.value)}
              onBlur={(e) => onUpdate(index, `${field.key}_custom`, e.target.value)}
            />
          )}
        </>
      )}

      {field.type === "text" && (
        <Input
          className="h-9"
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onUpdate(index, field.key, e.target.value)}
          onBlur={(e) => onUpdate(index, field.key, e.target.value)}
        />
      )}

      {field.type === "number" && (
        <Input
          className="h-9"
          type="number"
          min={field.min ?? 0}
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onUpdate(index, field.key, e.target.value === "" ? "" : Number(e.target.value))}
          onBlur={(e) => onUpdate(index, field.key, e.target.value === "" ? "" : Number(e.target.value))}
        />
      )}

      {field.type === "textarea" && (
        <Textarea
          rows={2}
          className="resize-none text-sm"
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onUpdate(index, field.key, e.target.value)}
          onBlur={(e) => onUpdate(index, field.key, e.target.value)}
        />
      )}
    </div>
  );
}

// ── EntryCard — defined outside component ─────────────────────────────────────

function EntryCard({
  entry,
  index,
  fields,
  onUpdate,
  onRequestDelete,
  title,
}: {
  entry: Record<string, unknown>;
  index: number;
  fields: FieldConfig[];
  onUpdate: (index: number, key: string, value: unknown) => void;
  onRequestDelete: (index: number) => void;
  title: string;
}) {
  const isCustom = !!entry.is_custom;

  // For custom entries: show custom_label text input first, then skip the
  // first field (which is the select-type labeling field like which_wall).
  const visibleFields = isCustom ? fields.slice(1) : fields;

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      {/* Card header: title + delete */}
      <div className="flex items-center justify-between gap-2 min-h-[28px]">
        <span className="text-sm font-medium text-foreground leading-tight">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRequestDelete(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Custom label input (only for custom entries) */}
      {isCustom && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Custom label</Label>
          <Input
            className="h-9"
            placeholder="Describe this area…"
            value={String(entry.custom_label ?? "")}
            onChange={(e) => onUpdate(index, "custom_label", e.target.value)}
            onBlur={(e) => onUpdate(index, "custom_label", e.target.value)}
          />
        </div>
      )}

      {/* All fields (or all except the first for custom entries) */}
      {visibleFields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          entry={entry}
          index={index}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

// ── EntryList ─────────────────────────────────────────────────────────────────

export function EntryList({
  entries,
  fields,
  onUpdate,
  onAdd,
  onDelete,
  onAddCustom,
  addLabel = "Add entry",
  deleteConfirmText = "Delete this entry?",
  emptyText = "No entries recorded. Tap + to add.",
  entryTitle = (_, i) => `Entry ${i + 1}`,
  allowCustom = false,
}: EntryListProps) {
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  return (
    <>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          entries.map((entry, index) => (
            <EntryCard
              key={String(entry.id ?? index)}
              entry={entry}
              index={index}
              fields={fields}
              onUpdate={onUpdate}
              onRequestDelete={setPendingDeleteIdx}
              title={entryTitle(entry, index)}
            />
          ))
        )}

        {/* Add buttons */}
        <div className={cn("flex flex-wrap gap-2", entries.length > 0 && "pt-1")}>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
          {allowCustom && onAddCustom && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted-foreground"
              onClick={onAddCustom}
            >
              <Plus className="h-4 w-4" />
              Add custom item
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={pendingDeleteIdx !== null}
        onOpenChange={(open) => !open && setPendingDeleteIdx(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirmText}</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteIdx !== null) {
                  onDelete(pendingDeleteIdx);
                  setPendingDeleteIdx(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
