import { useState } from "react";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { CommentRow } from "./types";
import { mapCommentError, type MappedError } from "./utils";

interface Props {
  propertyId: string;
  propertyOwnerId: string;
  parentCommentId: string;
  parentPseudonym: string;
  pseudonym: string | null;
  currentUserId: string;
  currentUserFullName: string | null;
  onCancel: () => void;
  onPosted: (row: CommentRow) => void;
}

const MAX = 1000;

export default function ReplyComposer({
  propertyId,
  propertyOwnerId,
  parentCommentId,
  parentPseudonym,
  pseudonym,
  currentUserId,
  currentUserFullName,
  onCancel,
  onPosted,
}: Props) {
  const isOwner = currentUserId === propertyOwnerId;
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
      p_parent_comment_id: parentCommentId,
    });
    setSubmitting(false);
    if (error) {
      setErr(mapCommentError(error.message ?? ""));
      return;
    }
    // See CommentComposer note: real DB id is on `data.id`.
    const newId = typeof data === "string" ? data : (data?.id ?? data?.comment_id ?? crypto.randomUUID());
    onPosted({
      comment_id: newId,
      parent_comment_id: parentCommentId,
      depth: 1,
      pseudonym: pseudonym ?? "you",
      is_owner: isOwner,
      real_name: isOwner ? (currentUserFullName ?? null) : null,
      badges: isOwner ? ["owner"] : [],
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
    <div className="mt-2 space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Reply to ${parentPseudonym}…`}
        rows={2}
        maxLength={MAX + 200}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          You'll appear as <span className="font-mono">{pseudonym ?? "…"}</span>.
        </p>
        <span className={`text-xs ${counterCls}`}>{count} / {MAX}</span>
      </div>
      {err && (
        <p className="text-sm text-destructive">
          {err.text}
          {err.profileLink && <> · <Link to="/profile" className="underline">Go to profile</Link></>}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={disabled}>
          {submitting ? "Replying…" : "Reply"}
        </Button>
      </div>
    </div>
  );
}
