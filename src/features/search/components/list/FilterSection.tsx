import { cn } from "@/lib/utils";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

export function FilterSection({ title, children, disabled, disabledReason }: FilterSectionProps) {
  return (
    <div className={cn("py-4 border-b last:border-b-0", disabled && "opacity-50")}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {disabled && disabledReason && (
          <span className="text-[10px] text-muted-foreground">{disabledReason}</span>
        )}
      </div>
      <div className={cn(disabled && "pointer-events-none")}>{children}</div>
    </div>
  );
}
