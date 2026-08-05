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
import { EditableCustomName } from "@/components/property/EditableCustomName";
import { CustomItemAdder } from "@/components/property/CustomItemAdder";
import { validateCustomName } from "@/utils/property/customItemValidation";

export interface AmenitiesEditorProps {
  value: string[];
  onChange: (updated: string[]) => void;
  className?: string;
  /**
   * When set (owner form passes 5), enforces a max-N custom cap + duplicate/length
   * validation via a staging input. When undefined (admin), the editor keeps its
   * original unrestricted append-blank behaviour.
   */
  customLimit?: number;
}

const CANONICAL_VALUES: Set<string> = new Set(BUILDING_AMENITIES.map((a) => a.value as string));

export function AmenitiesEditor({ value, onChange, className, customLimit }: AmenitiesEditorProps) {
  const items = value ?? [];
  const canonical = items.filter((v) => CANONICAL_VALUES.has(v));
  const customs = items.map((v, idx) => ({ v, idx })).filter((x) => !CANONICAL_VALUES.has(x.v));
  const limited = customLimit != null;
  const customNames = customs.map((c) => c.v);

  const toggleCanonical = (val: string) => {
    if (canonical.includes(val)) {
      onChange(items.filter((v) => v !== val));
    } else {
      onChange([...items, val]);
    }
  };

  const addCustom = () => onChange([...items, ""]);
  const addCustomNamed = (name: string) => onChange([...items, name]);
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
        <Label className="text-sm font-medium mb-2 block">Something else? Add it</Label>
        {limited ? (
          <>
            {customs.map(({ v, idx }) => (
              <EditableCustomName
                key={idx}
                value={v}
                placeholder="e.g. Rooftop terrace"
                validate={(name) =>
                  validateCustomName(name, {
                    mode: "edit",
                    existingCustoms: customNames,
                    canonicalOptions: BUILDING_AMENITIES,
                    limit: customLimit!,
                    noun: "amenities",
                    selfIndex: idx,
                  })
                }
                onCommit={(name) => updateCustom(idx, name)}
                onDelete={() => deleteCustom(idx)}
              />
            ))}
            <CustomItemAdder
              existingCustoms={customNames}
              canonicalOptions={BUILDING_AMENITIES}
              limit={customLimit!}
              noun="amenities"
              onAdd={addCustomNamed}
              placeholder="Add a custom amenity"
            />
          </>
        ) : (
          <>
            <div className="flex justify-end mb-2">
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
          </>
        )}
      </div>
    </div>
  );
}
