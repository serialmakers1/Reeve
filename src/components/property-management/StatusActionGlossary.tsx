/**
 * StatusActionGlossary — collapsible full reference of every owner status and
 * action, rendered in the Details tab beneath the current-status StatusGuidance
 * card. Complements (does not replace) that card.
 *
 * Copy comes from src/lib/ownerStatusGlossary.ts. The current status is
 * highlighted so owners can orient quickly.
 */

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  STATUS_EXPLANATIONS,
  ACTION_EXPLANATIONS,
  type OwnerActionKey,
} from "@/lib/ownerStatusGlossary";

interface Props {
  status: string;
}

// Display order for statuses.
const STATUS_ORDER = [
  "draft",
  "pending_review",
  "changes_requested",
  "listed",
  "edit_pending_review",
  "unlisted",
  "archived",
] as const;

// Display order for actions.
const ACTION_ORDER: OwnerActionKey[] = [
  "edit",
  "withdraw_submission",
  "unlist",
  "relist",
  "cancel_edit",
  "archive",
];

export default function StatusActionGlossary({ status }: Props) {
  return (
    <Accordion type="single" collapsible className="rounded-lg border bg-card">
      <AccordionItem value="glossary" className="border-b-0">
        <AccordionTrigger className="px-4 text-sm font-semibold">
          Understand statuses &amp; actions
        </AccordionTrigger>
        <AccordionContent className="px-4">
          <div className="space-y-5 pb-1">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Statuses
              </h3>
              <dl className="space-y-2.5">
                {STATUS_ORDER.map((key) => {
                  const s = STATUS_EXPLANATIONS[key];
                  if (!s) return null;
                  const isCurrent = key === status;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-md p-2.5",
                        isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : "",
                      )}
                    >
                      <dt className="text-sm font-medium text-foreground flex items-center gap-2">
                        {s.label}
                        {isCurrent && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            Current
                          </span>
                        )}
                      </dt>
                      <dd className="text-sm text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">
                        {s.explanation}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Actions
              </h3>
              <dl className="space-y-2.5">
                {ACTION_ORDER.map((key) => {
                  const a = ACTION_EXPLANATIONS[key];
                  return (
                    <div key={key}>
                      <dt className="text-sm font-medium text-foreground">{a.label}</dt>
                      <dd className="text-sm text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">
                        {a.explanation}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
