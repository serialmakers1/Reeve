import type { SearchMode } from "@/features/search/domain/searchMode";

interface RentBuySelectorProps {
  value: SearchMode | null;
  onChange: (mode: SearchMode) => void;
}

export function RentBuySelector({ value, onChange }: RentBuySelectorProps) {
  return (
    <div className="flex rounded-lg border border-border bg-muted p-1 gap-1">
      {(["rent", "buy"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
          className={[
            "flex-1 min-h-[44px] rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            value === mode
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {mode === "rent" ? "Rent" : "Buy"}
        </button>
      ))}
    </div>
  );
}
