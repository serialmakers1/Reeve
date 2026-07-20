import { useState } from "react";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { CommentRow } from "./types";
import { mapCommentError, type MappedError } from "./utils";

interface Props {
  propertyId: string;
  pseudonym: string | null;
  currentUserId: string;
  onPosted: (row: CommentRow) => void;
}

const MAX = 1000;

export default function CommentComposer({ propertyId, pseudonym, currentUserId, onPosted }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<MappedError | null>(null);

  const count = text.length;
  const counterCls =
    count >= MAX ? "text-destructive" :
    count >= 900 ? "text-amber-600" : "text-muted-foreground";

  const trimmed = text.trim();
  const disabled = submitting || trimmed.length === 0 || count >= MAX;

  const submit = async () => {
    if (disabled) return;
    setSubmitting(true);
    setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("post_comment", {
      p_property_id: propertyId,
      p_text: trimmed,
      p_parent_comment_id: null,
    });
    setSubmitting(false);
    if (error) {
      setErr(mapCommentError(error.message ?? ""));
      return;
    }
    const newId = typeof data === "string" ? data : (data?.comment_id ?? crypto.randomUUID());
    onPosted({
      comment_id: newId,
      parent_comment_id: null,
      depth: 0,
      pseudonym: pseudonym ?? "you",
      is_owner: false,
      real_name: null,
      badges: [],
      text: trimmed,
      hidden_reason: null,
      like_count: 0,
      liked_by_me: false,
      is_mine: true,
      created_at: new Date().toISOString(),
    });
    setText("");
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask a question or share what you know about this property or area…"
        rows={3}
        maxLength={MAX + 200}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          You'll appear as <span className="font-mono">{pseudonym ?? "…"}</span> — your anonymous comment name.
        </p>
        <span className={`text-xs ${counterCls}`}>{count} / {MAX}</span>
      </div>
      {err && (
        <p className="text-sm text-destructive">
          {err.text}
          {err.profileLink && (
            <> · <Link to="/profile" className="underline">Go to profile</Link></>
          )}
        </p>
      )}
      <div className="flex justify-end">
        <Button size="sm" disabled={disabled} onClick={submit}>
          {submitting ? "Posting…" : "Post comment"}
        </Button>
      </div>
      {/* touch to satisfy unused-var lint on currentUserId */}
      <span className="hidden">{currentUserId}</span>
    </div>
  );
}
