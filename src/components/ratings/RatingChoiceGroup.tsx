import { useId, useRef } from "react";
import { Check, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TONE_CARD, type RatingQuestion } from "./ratingQuestions";

interface Props {
  question: RatingQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * One question rendered as a segmented radiogroup of vibrant choice cards
 * (no radio dots, no stars). Selection is conveyed by colour + border + ring +
 * a check icon + bold label — never colour alone. Full keyboard support via
 * roving arrow-key navigation.
 */
export default function RatingChoiceGroup({ question, value, onChange, disabled }: Props) {
  const groupId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusOption = (idx: number) => {
    const n = question.options.length;
    const target = ((idx % n) + n) % n;
    optionRefs.current[target]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (idx + 1) % question.options.length;
      onChange(question.options[next].value);
      focusOption(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (idx - 1 + question.options.length) % question.options.length;
      onChange(question.options[prev].value);
      focusOption(prev);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${groupId}-label`}
      className="space-y-2"
    >
      <div className="flex items-start gap-1.5">
        <p id={`${groupId}-label`} className="text-sm font-medium text-foreground">
          {question.question}
        </p>
        {question.helper ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`More information: ${question.question}`}
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Info className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="max-w-xs text-sm leading-relaxed">
              {question.helper}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((opt, idx) => {
          const selected = value === opt.value;
          const tone = TONE_CARD[opt.tone];
          return (
            <button
              key={opt.value}
              ref={(el) => (optionRefs.current[idx] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!value && idx === 0) ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => onKeyDown(e, idx)}
              className={cn(
                "flex min-h-[44px] items-center justify-between gap-2 rounded-xl border-2 bg-card px-3 py-2.5 text-left text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-60",
                tone.base,
                selected ? tone.selected : "bg-card",
              )}
            >
              <span className="whitespace-normal break-words">{opt.label}</span>
              {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
