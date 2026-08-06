import { useRef, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RatingChoiceGroup from "./RatingChoiceGroup";
import {
  RATING_QUESTIONS,
  isComplete,
  type RatingAnswers,
  type RatingFieldKey,
} from "./ratingQuestions";
import type { RateableInteraction } from "./useRateableInteractions";

function mapErr(msg: string): string {
  switch (msg) {
    case "ALREADY_SUBMITTED":
      return "You've already rated this interaction.";
    case "NOT_APPROVED":
      return "This interaction isn't available to rate.";
    case "MISSING_ANSWER":
      return "Please answer all five questions.";
    case "UNAUTHORIZED":
    case "RATING_NOT_FOUND":
      return "This rating isn't available to you.";
    default:
      return "Something went wrong — please try again.";
  }
}

interface Props {
  interaction: RateableInteraction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (contactRequestId: string, answers: RatingAnswers, counterpartyUserId: string) => Promise<void>;
}

export default function InteractionRatingAccordion({ interaction, open, onOpenChange, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Partial<RatingAnswers>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(interaction.my_submitted);
  const [err, setErr] = useState<string | null>(null);
  const inFlight = useRef(false);

  const name = interaction.counterparty_name?.trim() || (interaction.i_am === "owner" ? "this seeker" : "the lister");
  const context = [interaction.building_name, interaction.locality].filter(Boolean).join(", ")
    || "Property no longer available";

  const setAnswer = (key: RatingFieldKey, value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const complete = isComplete(answers);

  const handleSubmit = async () => {
    if (!complete || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setErr(null);
    try {
      await onSubmit(interaction.contact_request_id, answers, interaction.counterparty_user_id);
      setSubmitted(true); // answers preserved on failure; cleared implicitly by unmount on success view
    } catch (e) {
      setErr(mapErr((e as { message?: string })?.message ?? ""));
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  };

  // Submitted state — compact, vibrant, no controls.
  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
          Rating submitted — thank you.
        </p>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:border-primary/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">Rate experience</span>
            <span className="block truncate text-xs text-muted-foreground">
              {name} · {context}
            </span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-primary transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4">
        <div className="space-y-5 rounded-xl border bg-card p-4">
          {RATING_QUESTIONS.map((q) => (
            <RatingChoiceGroup
              key={q.key}
              question={q}
              value={answers[q.key]}
              onChange={(v) => setAnswer(q.key, v)}
              disabled={submitting}
            />
          ))}

          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}

          <div className="flex items-center justify-end gap-3">
            {!complete && (
              <span className="text-xs text-muted-foreground">Answer all five to submit</span>
            )}
            <Button onClick={handleSubmit} disabled={!complete || submitting} className="min-h-[44px]">
              {submitting ? "Submitting…" : "Submit rating"}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
