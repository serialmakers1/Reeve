import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export interface PendingRatingRow {
  contact_request_id: string;
  property_id: string;
  building_name: string;
  locality: string;
  window_opens_at: string;
  window_closes_at: string;
  counterparty_name: string;
  i_am: string;
  other_submitted: boolean;
}

type Q1 = "yes" | "partially" | "no";
type Q2 = "yes" | "rescheduled" | "didnt_happen" | "not_reached";
type Q3 = "yes" | "maybe" | "no";

const REVIEW_MAX = 500;

function mapErr(msg: string): string {
  if (msg === "WINDOW_CLOSED") return "The rating window has closed.";
  if (msg === "ALREADY_SUBMITTED") return "You've already submitted a rating for this.";
  if (msg === "Q3_REQUIRED") return "Please answer 'Would you deal with them again?' to submit.";
  if (msg === "NON_ENGLISH") return "Please write in English";
  if (msg === "CONTAINS_URL") return "Links aren't allowed in reviews";
  if (msg === "CONTAINS_EMAIL" || msg === "CONTAINS_PHONE") return "Please don't share contact details here";
  if (msg === "BLOCKED_WORD") return "Review contains disallowed content";
  if (msg === "PATTERN_SPAM" || msg === "CONTAINS_EMOJI") return "Please rephrase your review";
  return "Something went wrong — please try again.";
}

interface Props {
  row: PendingRatingRow;
}

export default function PendingRatingCard({ row }: Props) {
  const [q1, setQ1] = useState<Q1 | "">("");
  const [q2, setQ2] = useState<Q2 | "">("");
  const [q3, setQ3] = useState<Q3 | "">("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ other_submitted: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const daysLeft = useMemo(() => {
    const ms = new Date(row.window_closes_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [row.window_closes_at]);

  const firstName = row.counterparty_name.split(" ")[0] || row.counterparty_name;
  const countdownCls = daysLeft <= 3 ? "text-amber-600 bg-amber-50" : "text-muted-foreground bg-muted";

  const submit = async () => {
    if (!q3 || submitting) return;
    setSubmitting(true);
    setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("submit_rating", {
      p_contact_request_id: row.contact_request_id,
      p_q1: q1 || null,
      p_q2: q2 || null,
      p_q3: q3,
      p_review_text: review.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      setErr(mapErr(error.message ?? ""));
      return;
    }
    const res = data as { other_submitted?: boolean } | null;
    setSubmitted({ other_submitted: !!res?.other_submitted });
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">✓ Rating submitted</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {submitted.other_submitted
                ? "Both ratings submitted — published now."
                : `Your rating will be published when ${firstName} rates, or in ${daysLeft} days.`}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${countdownCls}`}>
            {daysLeft} days left
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {row.counterparty_name} — Rate your experience
            </p>
            <p className="text-xs text-muted-foreground">
              {row.building_name}{row.locality ? `, ${row.locality}` : ""}
            </p>
            {row.other_submitted && (
              <p className="mt-1 text-xs text-amber-700">
                {firstName} has already rated — submit yours to publish both.
              </p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${countdownCls}`}>
            {daysLeft} days left to rate
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          You have 10 days from when contact was shared to rate your experience.
        </p>

        {/* Q1 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Did they respond and communicate well after contact was shared?
          </p>
          <RadioGroup value={q1} onValueChange={(v) => setQ1(v as Q1)}>
            {(["yes", "partially", "no"] as const).map((v) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem id={`q1-${row.contact_request_id}-${v}`} value={v} />
                <Label htmlFor={`q1-${row.contact_request_id}-${v}`} className="text-sm font-normal capitalize">
                  {v === "yes" ? "Yes" : v === "partially" ? "Partially" : "No"}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Q2 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Did the visit happen as planned?</p>
          <RadioGroup value={q2} onValueChange={(v) => setQ2(v as Q2)}>
            {([
              ["yes", "Yes"],
              ["rescheduled", "It was rescheduled but happened"],
              ["didnt_happen", "It didn't happen"],
              ["not_reached", "We didn't get that far"],
            ] as const).map(([v, label]) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem id={`q2-${row.contact_request_id}-${v}`} value={v} />
                <Label htmlFor={`q2-${row.contact_request_id}-${v}`} className="text-sm font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Q3 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Would you deal with them again?</p>
          <RadioGroup value={q3} onValueChange={(v) => setQ3(v as Q3)}>
            {(["yes", "maybe", "no"] as const).map((v) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem id={`q3-${row.contact_request_id}-${v}`} value={v} />
                <Label htmlFor={`q3-${row.contact_request_id}-${v}`} className="text-sm font-normal capitalize">
                  {v}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">This field is required to submit.</p>
        </div>

        {/* Review */}
        {q3 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Add a short written review (optional)</p>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share what you know about your experience…"
              rows={3}
              maxLength={REVIEW_MAX + 50}
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              {review.length} / {REVIEW_MAX}
            </div>
          </div>
        )}

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!q3 || submitting}>
            {submitting ? "Submitting…" : "Submit rating"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
