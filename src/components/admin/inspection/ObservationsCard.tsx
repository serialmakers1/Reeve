/**
 * ObservationsCard — General Observations, Inspector Notes, and Media Drive Link.
 */
import type { InspectionRecord } from "@/types/inspection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleCard } from "./CollapsibleCard";

type ObservationsCardProps = {
  inspection: InspectionRecord;
  updateInspectionField: (field: keyof InspectionRecord, value: unknown) => void;
};

export function ObservationsCard({ inspection, updateInspectionField }: ObservationsCardProps) {
  return (
    <CollapsibleCard title="General Observations & Inspector Notes">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>General Observations</Label>
          <Textarea
            rows={5}
            value={inspection.general_observations ?? ""}
            onChange={(event) => updateInspectionField("general_observations", event.target.value)}
            onBlur={(event) => updateInspectionField("general_observations", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Inspector Notes</Label>
          <Textarea
            rows={5}
            value={inspection.inspector_notes ?? ""}
            onChange={(event) => updateInspectionField("inspector_notes", event.target.value)}
            onBlur={(event) => updateInspectionField("inspector_notes", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-drive-link">Photo & Video Walkthrough (Google Drive link)</Label>
          <Input
            id="media-drive-link"
            type="url"
            placeholder="https://drive.google.com/…"
            value={inspection.media_drive_link ?? ""}
            onChange={(event) => updateInspectionField("media_drive_link", event.target.value || null)}
            onBlur={(event) => updateInspectionField("media_drive_link", event.target.value || null)}
          />
          <p className="text-xs text-muted-foreground">
            Paste the Google Drive folder link containing photos and video walkthrough. Shown in the exported PDF.
          </p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
