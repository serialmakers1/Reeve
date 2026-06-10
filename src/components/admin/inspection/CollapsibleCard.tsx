/**
 * CollapsibleCard — standard wrapper for all inspection form sections.
 *
 * Design choices:
 * - Full card header is the tap target (mobile-first, 44px min height).
 * - Chevron rotates 180° when expanded.
 * - Collapsed by default (defaultOpen = false).
 * - Optional badge slot next to the title (e.g. damage count, key status).
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type CollapsibleCardProps = {
  title: string;
  /** Defaults to false — all cards start collapsed. */
  defaultOpen?: boolean;
  /** Optional badge rendered to the right of the title (e.g. item count chip). */
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function CollapsibleCard({
  title,
  defaultOpen = false,
  badge,
  children,
  className,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn("inspection-card overflow-hidden", className)}>
        {/* Trigger covers the full header row — min-h-[44px] for touch targets */}
        <CollapsibleTrigger className="flex w-full min-h-[44px] cursor-pointer items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold leading-tight">{title}</span>
            {badge}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-6 pt-2">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
