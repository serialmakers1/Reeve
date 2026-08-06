/**
 * StatusInfoButton — small accessible info trigger on owner listing cards.
 *
 * Desktop: Popover. Mobile: bottom Sheet. Content = the current status's
 * explanation (falling back to getStatusDisplay for legacy/unknown statuses)
 * plus the actions actually available for that status (getOwnerActions — the
 * same source ActionsBar uses, so it never advertises an unavailable action).
 *
 * The visible icon is small but the hit area is >=44x44px on mobile.
 */

import { useState } from "react";
import { Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { getStatusDisplay } from "@/lib/propertyStatus";
import {
  STATUS_EXPLANATIONS,
  ACTION_EXPLANATIONS,
  getOwnerActions,
} from "@/lib/ownerStatusGlossary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
}

const TRIGGER_CLASS =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground " +
  "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring sm:h-8 sm:w-8";

function GlossaryBody({ status }: Props) {
  const known = STATUS_EXPLANATIONS[status];
  const label = known?.label ?? getStatusDisplay(status).label;
  const explanation = known?.explanation ?? getStatusDisplay(status).guidance?.body ?? getStatusDisplay(status).nextAction;
  const actions = getOwnerActions(status);

  return (
    <div className="space-y-3 text-left">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground mt-1 [overflow-wrap:anywhere]">{explanation}</p>
      </div>
      {actions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            What you can do
          </p>
          <dl className="space-y-2">
            {actions.map((a) => {
              const info = ACTION_EXPLANATIONS[a];
              return (
                <div key={a}>
                  <dt className="text-sm font-medium text-foreground">{info.label}</dt>
                  <dd className="text-xs text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">{info.explanation}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}

export default function StatusInfoButton({ status }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const label = "What does this status mean?";

  const trigger = (
    <button
      type="button"
      aria-label={label}
      className={cn(TRIGGER_CLASS)}
      onClick={(e) => {
        e.stopPropagation();
        if (isMobile) setOpen(true);
      }}
    >
      <Info className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>Status &amp; actions</SheetTitle>
            </SheetHeader>
            <div className="mt-3">
              <GlossaryBody status={status} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <GlossaryBody status={status} />
      </PopoverContent>
    </Popover>
  );
}
