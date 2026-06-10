/**
 * ApplianceInventory — collapsible appliance table with location column.
 *
 * Location column: second column (after Type). Options are derived from
 * `rooms` prop — each room's `room_label` — plus a static "Common Area" option.
 * Value writes to `appliance.location` via `updateApplianceField(id, "location", value)`.
 *
 * NOTE: `LocalAppliance.location` is a new optional field pending DB migration.
 * Until the migration runs, Supabase silently ignores writes to this field.
 *
 * Delete confirmation uses shadcn AlertDialog.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  type LocalAppliance,
  type LocalRoom,
  APPLIANCE_TYPE_OPTIONS,
  APPLIANCE_CONDITION_OPTIONS,
  APPLIANCE_OWNERSHIP_OPTIONS,
} from "@/types/inspection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CollapsibleCard } from "./CollapsibleCard";
import { Badge } from "@/components/ui/badge";

type ApplianceInventoryProps = {
  appliances: LocalAppliance[];
  rooms: LocalRoom[];
  updateApplianceField: (id: string, field: string, value: unknown) => void;
  handleAddAppliance: () => void;
  handleDeleteAppliance: (id: string) => void;
};

export function ApplianceInventory({
  appliances,
  rooms,
  updateApplianceField,
  handleAddAppliance,
  handleDeleteAppliance,
}: ApplianceInventoryProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Location options: room labels from the inspection + a static "Common Area"
  const locationOptions = [
    "Common Area",
    ...rooms.map((r) => r.room_label).filter(Boolean),
  ];

  const badge = appliances.length > 0 ? (
    <Badge variant="secondary" className="text-xs">{appliances.length}</Badge>
  ) : undefined;

  return (
    <>
      <CollapsibleCard title="Appliance Inventory" badge={badge}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model No.</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Last Service</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {appliances.map((appliance) => (
                <TableRow key={appliance.id}>
                  <TableCell className="min-w-[180px]">
                    <Select
                      value={appliance.appliance_type || undefined}
                      onValueChange={(value) => updateApplianceField(appliance.id, "appliance_type", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLIANCE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    <Select
                      value={appliance.location || undefined}
                      onValueChange={(value) => updateApplianceField(appliance.id, "location", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <Input
                      className="h-9"
                      value={appliance.custom_label ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "custom_label", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "custom_label", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <Input
                      className="h-9"
                      value={appliance.brand ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "brand", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "brand", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <Input
                      className="h-9"
                      value={appliance.model_number ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "model_number", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "model_number", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <Input
                      className="h-9"
                      value={appliance.color ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "color", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "color", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[100px]">
                    <Input
                      className="h-9"
                      type="number"
                      value={appliance.manufacturing_year ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "manufacturing_year", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "manufacturing_year", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[170px]">
                    <Select
                      value={appliance.condition || undefined}
                      onValueChange={(value) => updateApplianceField(appliance.id, "condition", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLIANCE_CONDITION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    <Select
                      value={appliance.ownership || undefined}
                      onValueChange={(value) => updateApplianceField(appliance.id, "ownership", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Ownership" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLIANCE_OWNERSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <Textarea
                      rows={2}
                      className="min-h-[72px]"
                      value={appliance.notes ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "notes", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "notes", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <Input
                      className="h-9"
                      value={appliance.serial_number ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "serial_number", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "serial_number", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <Input
                      className="h-9"
                      type="date"
                      value={appliance.last_service_date ?? ""}
                      onChange={(event) => updateApplianceField(appliance.id, "last_service_date", event.target.value)}
                      onBlur={(event) => updateApplianceField(appliance.id, "last_service_date", event.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingDeleteId(appliance.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button type="button" variant="outline" onClick={handleAddAppliance} className="mt-4">
          <Plus className="h-4 w-4" />
          Add Appliance
        </Button>
      </CollapsibleCard>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appliance?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) {
                  handleDeleteAppliance(pendingDeleteId);
                  setPendingDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
