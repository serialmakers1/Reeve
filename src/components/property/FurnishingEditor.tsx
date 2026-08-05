/**
 * FurnishingEditor — shared JSONB furnishing_detail editor (D-170).
 *
 * Used by both owner form (ListProperty.tsx) and admin form (PropertyEdit.tsx).
 * Caller owns state and save — component just emits the updated JSONB array.
 *
 * Renders:
 *   - Canonical items grid from FURNISHING_ITEM_OPTIONS (checkbox + count + optional size/rooms)
 *   - Custom items list (owner-added via "+ Add item"), each editable + deletable
 */
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { FURNISHING_ITEM_OPTIONS } from "@/config/property-form";
import type { FurnishingDetailItem } from "@/types/property";

interface FurnitureCountInputProps {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}

function FurnitureCountInput({ value, onChange, className }: FurnitureCountInputProps) {
  const [display, setDisplay] = useState(() => String(value));
  const isFocusedRef = useRef(false);

  // Sync from parent only when not actively editing
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplay(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw !== "" && !/^\d+$/.test(raw)) return; // reject non-digits silently
    setDisplay(raw);
    if (raw !== "") {
      const n = Math.min(99, Math.max(1, parseInt(raw, 10)));
      onChange(n);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const n = parseInt(display, 10);
    const final = !Number.isFinite(n) || n < 1 ? 1 : Math.min(99, n);
    setDisplay(String(final));
    onChange(final);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={display}
      onFocus={() => { isFocusedRef.current = true; }}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}

export interface FurnishingEditorProps {
  value: FurnishingDetailItem[];
  onChange: (updated: FurnishingDetailItem[]) => void;
  className?: string;
}

export function FurnishingEditor({ value, onChange, className }: FurnishingEditorProps) {
  const items = value ?? [];
  const findIndex = (key: string) => items.findIndex((i) => i.item === key && !i.custom);
  const customs = items.map((it, idx) => ({ it, idx })).filter((x) => x.it.custom);

  const toggleStandard = (opt: (typeof FURNISHING_ITEM_OPTIONS)[number]) => {
    const idx = findIndex(opt.value);
    if (idx >= 0) {
      onChange(items.filter((_, i) => i !== idx));
    } else {
      const entry: FurnishingDetailItem = { item: opt.value };
      if (!opt.yesNoOnly) entry.count = 1;
      onChange([...items, entry]);
    }
  };

  const updateStandard = (key: string, patch: Partial<FurnishingDetailItem>) => {
    onChange(items.map((i) => (i.item === key && !i.custom ? { ...i, ...patch } : i)));
  };

  const addCustom = () => onChange([...items, { item: "", custom: true }]);
  const updateCustom = (idx: number, patch: Partial<FurnishingDetailItem>) => {
    onChange(items.map((i, ix) => (ix === idx ? { ...i, ...patch } : i)));
  };
  const deleteCustom = (idx: number) => onChange(items.filter((_, ix) => ix !== idx));

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-sm font-medium">What's already there?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {FURNISHING_ITEM_OPTIONS.map((opt) => {
            const idx = findIndex(opt.value);
            const checked = idx >= 0;
            const detail = checked ? items[idx] : null;
            return (
              <div
                key={opt.value}
                className={cn(
                  "rounded border p-2 transition-colors",
                  checked && "border-primary bg-accent/30",
                )}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={() => toggleStandard(opt)} />
                  <span className="text-sm flex-1">{opt.label}</span>
                  {checked && !opt.yesNoOnly && (
                    <FurnitureCountInput
                      value={detail?.count ?? 1}
                      onChange={(n) => updateStandard(opt.value, { count: n })}
                      className="w-14 h-8 text-sm"
                    />
                  )}
                </label>
                {checked && "hasSizeText" in opt && opt.hasSizeText && (
                  <div className="mt-2 ml-7">
                    <Input
                      value={detail?.size ?? ""}
                      onChange={(e) => updateStandard(opt.value, { size: e.target.value })}
                      placeholder="e.g. Queen or 1 Queen + 1 Single"
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                {checked && "hasRooms" in opt && opt.hasRooms && (
                  <div className="mt-2 ml-7">
                    <Input
                      value={detail?.rooms ?? ""}
                      onChange={(e) => updateStandard(opt.value, { rooms: e.target.value })}
                      placeholder="e.g. Master + Living Room"
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Something else? Add it</Label>
          <button type="button" onClick={addCustom} className="text-sm text-primary hover:underline">
            + Add item
          </button>
        </div>
        {customs.map(({ it, idx }) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input
              value={it.item}
              placeholder="e.g. Study table"
              onChange={(e) => updateCustom(idx, { item: e.target.value })}
              className="min-h-[40px] flex-1"
            />
            <FurnitureCountInput
              value={it.count ?? 1}
              onChange={(n) => updateCustom(idx, { count: n })}
              className="w-20 h-10"
            />
            <button type="button" onClick={() => deleteCustom(idx)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
