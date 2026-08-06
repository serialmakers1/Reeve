// Ratings & Reputation v2 — single shared question configuration used by both
// directions (owner/lister rating a seeker, seeker rating a lister). No stars,
// no free text. Answers map to a colour tone that carries meaning alongside text.

export const RATING_MIN_PUBLIC = 3;

export type RatingTone = "positive" | "intermediate" | "negative" | "neutral";

export type RatingFieldKey = "reach" | "accuracy" | "progress" | "respect" | "trust";

export interface RatingOption {
  value: string;
  label: string;
  tone: RatingTone;
}

export interface RatingQuestion {
  /** DB field suffix (o_<key> / t_<key>) and submit param (p_<key>). */
  key: RatingFieldKey;
  question: string;
  /** Accessible helper text rendered behind an info button (Q2/Q3 only). */
  helper?: string;
  options: RatingOption[];
}

// Order is the render + submit order. All five are mandatory.
export const RATING_QUESTIONS: RatingQuestion[] = [
  {
    key: "reach",
    question: "After contact was shared, were they reachable by call or message?",
    options: [
      { value: "easily", label: "Easily reachable", tone: "positive" },
      { value: "difficult", label: "Difficult to reach", tone: "intermediate" },
      { value: "no_response", label: "Did not respond", tone: "negative" },
    ],
  },
  {
    key: "accuracy",
    question: "Were the important details they shared accurate?",
    helper:
      "Check whether the person's role and the important details they shared matched reality. " +
      "Examples include a lister saying they were the owner but actually being a broker; differences " +
      "in property specifications, condition, photos, price, charges or availability; or material " +
      "differences in a tenant or buyer's stated budget, occupants, requirements, timeline or readiness.",
    options: [
      { value: "matched", label: "Yes, everything matched", tone: "positive" },
      { value: "minor", label: "Mostly, with minor differences", tone: "intermediate" },
      { value: "major", label: "No, there were major differences", tone: "negative" },
    ],
  },
  {
    key: "progress",
    question: "After the initial conversation, did the interaction move forward to a concrete next step?",
    helper:
      "A concrete next step can include a property visit, scheduled call or meeting, document " +
      "exchange, negotiation, booking or agreement. This measures whether the interaction progressed, " +
      "not whether a final deal was completed.",
    options: [
      { value: "next_step", label: "Yes, a next step happened", tone: "positive" },
      { value: "discussed", label: "A next step was discussed but did not happen", tone: "intermediate" },
      { value: "no_progress", label: "No, the interaction did not progress", tone: "negative" },
      { value: "mutual_stop", label: "We mutually decided not to proceed", tone: "neutral" },
    ],
  },
  {
    key: "respect",
    question: "Was their communication respectful and free from unwanted pressure?",
    options: [
      { value: "yes", label: "Yes", tone: "positive" },
      { value: "mostly", label: "Mostly", tone: "intermediate" },
      { value: "no", label: "No", tone: "negative" },
    ],
  },
  {
    key: "trust",
    question: "Based on your experience, would you deal with this person again?",
    options: [
      { value: "yes", label: "Yes", tone: "positive" },
      { value: "maybe", label: "Maybe", tone: "intermediate" },
      { value: "no", label: "No", tone: "negative" },
    ],
  },
];

export type RatingAnswers = Record<RatingFieldKey, string>;

export function isComplete(answers: Partial<RatingAnswers>): answers is RatingAnswers {
  return RATING_QUESTIONS.every((q) => !!answers[q.key]);
}

// Tone → Tailwind classes for choice cards. Colour + border + (selected) ring,
// never colour alone — the label text and a check icon also convey selection.
export const TONE_CARD: Record<RatingTone, { base: string; selected: string }> = {
  positive: {
    base: "border-emerald-200 hover:border-emerald-400 text-emerald-900 dark:text-emerald-100",
    selected: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40",
  },
  intermediate: {
    base: "border-amber-200 hover:border-amber-400 text-amber-900 dark:text-amber-100",
    selected: "border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/40",
  },
  negative: {
    base: "border-rose-200 hover:border-rose-400 text-rose-900 dark:text-rose-100",
    selected: "border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500/40",
  },
  neutral: {
    base: "border-slate-200 hover:border-slate-400 text-slate-700 dark:text-slate-200",
    selected: "border-slate-500 bg-slate-100 dark:bg-slate-800/60 ring-2 ring-slate-500/30",
  },
};

// ── Public reputation summary shape (mirrors get_user_rating_summary_v2) ──────

export interface RatingMetric {
  pct: number;
  denom: number;
}

export type MovedForwardMetric =
  | { status: "none" }
  | { status: "insufficient" }
  | { status: "ok"; pct: number; denom: number };

export interface RatingSideMetrics {
  easy_to_reach: RatingMetric;
  details_matched: RatingMetric;
  moved_forward: MovedForwardMetric;
  respectful: RatingMetric;
  deal_again: RatingMetric;
}

export interface RatingSide {
  total: number;
  metrics: RatingSideMetrics | null; // null when total < 3
}

export interface RatingSummaryV2 {
  as_lister: RatingSide | null;
  as_seeker: RatingSide | null;
}

// Labels for the five public metric rows, in display order.
export const METRIC_LABELS: { key: keyof RatingSideMetrics; label: string }[] = [
  { key: "easy_to_reach", label: "Easy to reach" },
  { key: "details_matched", label: "Important details matched" },
  { key: "moved_forward", label: "Moved to a concrete next step" },
  { key: "respectful", label: "Respectful communication" },
  { key: "deal_again", label: "Would deal again" },
];
