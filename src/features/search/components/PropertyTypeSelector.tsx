import { PROPERTY_TYPE_OPTIONS } from "@/config/property-form";
import { normalizePropertyTypes } from "@/features/search/domain/propertyTypes";

interface PropertyTypeSelectorProps {
  /** Selected property-type values (multi-select). Empty = all types. */
  value: string[];
  onChange: (next: string[]) => void;
}

export function PropertyTypeSelector({ value, onChange }: PropertyTypeSelectorProps) {
  const selected = new Set(value);

  function toggle(v: string) {
    const next = selected.has(v) ? value.filter((x) => x !== v) : [...value, v];
    // Normalize so callers always receive a deterministic, valid, deduped array.
    onChange(normalizePropertyTypes(next));
  }

  return (
    // Mobile keeps the familiar 2-col layout; desktop uses a container-width-safe
    // auto-fit grid so labels never split mid-word (no `break-words`, no forced
    // 3-column squeeze inside a narrow dialog column).
    <div className="grid grid-cols-2 gap-2 min-w-0 desk:[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
      {PROPERTY_TYPE_OPTIONS.map((opt) => {
        const active = selected.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(opt.value)}
            className={[
              "min-w-0 min-h-[44px] rounded-lg border text-sm font-medium transition-colors px-3 py-2 text-center leading-tight whitespace-normal break-normal",
              active
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
