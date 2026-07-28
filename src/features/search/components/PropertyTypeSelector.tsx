import { PROPERTY_TYPE_OPTIONS } from "@/config/property-form";

interface PropertyTypeSelectorProps {
  value: string | null;
  onChange: (v: string | null) => void;
}

export function PropertyTypeSelector({ value, onChange }: PropertyTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {PROPERTY_TYPE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={[
              "min-h-[44px] rounded-lg border text-sm font-medium transition-colors px-3 py-2",
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
