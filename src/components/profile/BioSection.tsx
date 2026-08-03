import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { BIO_MAX } from "@/lib/bioValidation";

interface BioSectionProps {
  bio: string | null;
  onSave: (bio: string) => Promise<{ ok: true } | { ok: false; error?: string }>;
}

export function BioSection({ bio, onSave }: BioSectionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setDraft(bio ?? "");
    setInlineError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(bio ?? "");
    setInlineError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setInlineError(null);
    try {
      const result = await onSave(draft);
      if (!result.ok) {
        if (result.error) setInlineError(result.error);
        return;
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Bio</Label>
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setInlineError(null);
            }}
            placeholder="A short line about yourself"
            maxLength={BIO_MAX}
            rows={3}
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground text-right">
            {draft.length} / {BIO_MAX}
          </p>
          {inlineError && (
            <p className="text-sm text-destructive">{inlineError}</p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>
    );
  }

  if (bio) {
    return (
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground whitespace-pre-line">{bio}</p>
        <Button variant="outline" size="sm" onClick={openEditor}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit bio
        </Button>
      </section>
    );
  }

  return (
    <section>
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Add a bio to tell others about yourself.
        </p>
        <Button variant="ghost" size="sm" onClick={openEditor} className="mt-2">
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Add bio
        </Button>
      </div>
    </section>
  );
}
