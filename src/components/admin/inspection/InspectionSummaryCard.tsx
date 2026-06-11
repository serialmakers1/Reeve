/**
 * InspectionSummaryCard — Overall inspection summary.
 *
 * Data is stored in `inspection.inspection_summary` as a JSONB object.
 * Shape: { overall_condition, cleaning_required, repainting_required, urgent_items, recommended_items }
 *
 * NOTE: `InspectionRecord.inspection_summary` is a new optional field pending DB migration
 * (ADD COLUMN inspection_summary JSONB on property_inspections).
 * Until the migration runs, Supabase silently ignores writes — no crash.
 *
 * All fields default to "" when the column is null/absent on existing inspections.
 */
import type { InspectionRecord } from "@/types/inspection";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleCard } from "./CollapsibleCard";

type InspectionSummary = {
  overall_condition: "" | "good" | "fair" | "poor" | "critical";
  cleaning_required: "" | "none" | "basic_clean" | "deep_clean";
  repainting_required: "" | "none" | "touch_up" | "full_some_rooms" | "full_all_rooms";
  urgent_items: string;
  recommended_items: string;
};

const DEFAULT_SUMMARY: InspectionSummary = {
  overall_condition: "",
  cleaning_required: "",
  repainting_required: "",
  urgent_items: "",
  recommended_items: "",
};

type InspectionSummaryCardProps = {
  inspection: InspectionRecord;
  updateInspectionField: (field: keyof InspectionRecord, value: unknown) => void;
};

export function InspectionSummaryCard({ inspection, updateInspectionField }: InspectionSummaryCardProps) {
  const raw = inspection.inspection_summary as Partial<InspectionSummary> | null | undefined;
  const summary: InspectionSummary = { ...DEFAULT_SUMMARY, ...raw };

  const update = (field: keyof InspectionSummary, value: string) => {
    updateInspectionField("inspection_summary", { ...summary, [field]: value });
  };

  return (
    <CollapsibleCard title="Inspection Summary">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Overall Property Condition</Label>
            <Select
              value={summary.overall_condition || undefined}
              onValueChange={(value) => update("overall_condition", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor — Visible Damage</SelectItem>
                <SelectItem value="critical">Critical — Severe Damage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cleaning Required</Label>
            <Select
              value={summary.cleaning_required || undefined}
              onValueChange={(value) => update("cleaning_required", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="basic_clean">Basic Clean</SelectItem>
                <SelectItem value="deep_clean">Deep Clean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Repainting Required</Label>
            <Select
              value={summary.repainting_required || undefined}
              onValueChange={(value) => update("repainting_required", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="touch_up">Touch-up Only</SelectItem>
                <SelectItem value="full_some_rooms">Full Repaint — Some Rooms</SelectItem>
                <SelectItem value="full_all_rooms">Full Repaint — All Rooms</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Urgent Items</Label>
          <Textarea
            rows={3}
            placeholder="List items requiring immediate attention"
            value={summary.urgent_items}
            onChange={(e) => update("urgent_items", e.target.value)}
            onBlur={(e) => update("urgent_items", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Recommended Items</Label>
          <Textarea
            rows={3}
            placeholder="List items to address before next tenancy"
            value={summary.recommended_items}
            onChange={(e) => update("recommended_items", e.target.value)}
            onBlur={(e) => update("recommended_items", e.target.value)}
          />
        </div>
      </div>
    </CollapsibleCard>
  );
}
