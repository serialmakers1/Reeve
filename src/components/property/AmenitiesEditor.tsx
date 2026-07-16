/**
 * AmenitiesEditor — shared JSONB building-amenities editor (D-170).
 *
 * Used by both owner form (ListProperty.tsx) and admin form (PropertyEdit.tsx).
 * Value is a flat string[] mixing canonical BUILDING_AMENITIES values +
 * owner-added custom strings; the component splits them for rendering:
 *   - Canonical items: checkbox grid
 *   - Custom items: editable list with delete
 *
 * Emits the same flat shape on onChange. Caller wraps into the amenities JSONB
 * (`{ building, furnishing_items }`) using `buildAmenitiesJson` from types.
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { BUILDING_AMENITIES } from "@/config/property-form";

export interface AmenitiesEditorProps {
  value: string[];
  onChange: (updated: string[]) => void;
  className?: string;
}

const CANONICAL_VALUES: Set<string> = new Set(BUILDING_AMENITIES.map((a) => a.value as string));

export function AmenitiesEditor({ value, onChange, className }: AmenitiesEditorProps) {
  const items = value ?? [];
  const canonical = items.filter((v) => CANONICAL_VALUES.has(v));
  const customs = items.map((v, idx) => ({ v, idx })).filter((x) => !CANONICAL_VALUES.has(x.v));

  const toggleCanonical = (val: string) => {
    if (canonical.includes(val)) {
      onChange(items.filter((v) => v !== val));
    } else {
      onChange([...items, val]);
    }
  };

  const addCustom = () => onChange([...items, ""]);
  const updateCustom = (idx: number, next: string) =>
    onChange(items.map((v, ix) => (ix === idx ? next : v)));
  const deleteCustom = (idx: number) => onChange(items.filter((_, ix) => ix !== idx));

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-sm font-medium">Building amenities</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {BUILDING_AMENITIES.map((a) => (
            <label key={a.value} className="flex items-center gap-2 min-h-[36px] cursor-pointer">
              <Checkbox
                checked={canonical.includes(a.value)}
                onCheckedChange={() => toggleCanonical(a.value)}
              />
              <span className="text-sm">{a.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Something else? Add it</Label>
          <button type="button" onClick={addCustom} className="text-sm text-primary hover:underline">
            + Add amenity
          </button>
        </div>
        {customs.map(({ v, idx }) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input
              value={v}
              placeholder="e.g. Rooftop terrace"
              onChange={(e) => updateCustom(idx, e.target.value)}
              className="min-h-[40px] flex-1"
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
