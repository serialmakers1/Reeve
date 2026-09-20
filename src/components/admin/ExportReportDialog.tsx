import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { REPORT_TYPE_META, REPORT_TYPES } from '@/lib/inspection-report/types';
import type { ReportType, UtilityKey } from '@/lib/inspection-report/types';
import type {
  InspectionRecord,
  InspectionType,
  LocalRoom,
  LocalAppliance,
  DamageItem,
} from '@/types/inspection';

type Stage = 'idle' | 'flushing' | 'recording' | 'preparing' | 'rendering' | 'done' | 'error';

const ACTIVE_STAGES: Stage[] = ['flushing', 'recording', 'preparing', 'rendering'];

export interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payloadBase: {
    inspection: InspectionRecord;
    rooms: LocalRoom[];
    appliances: LocalAppliance[];
    damages: DamageItem[];
    utilitiesOverview: Partial<Record<UtilityKey, unknown>>;
  };
  /** Persisted inspection_type, used to preselect the report type (may be null). */
  inspectionType: InspectionType | null;
  /** Persist the chosen type back to the inspection (single source of truth). */
  onSelectInspectionType: (type: InspectionType) => void;
  flushPendingSaves: () => Promise<void>;
  /**
   * Runs after edits are flushed and before the payload is built. May return the
   * freshly snapshotted rooms so the PDF is built from them (not the pre-snapshot
   * rooms captured in payloadBase).
   */
  onBeforeExport?: () => Promise<LocalRoom[] | void>;
}

function buttonLabel(stage: Stage): string {
  switch (stage) {
    case 'flushing':   return 'Saving form changes…';
    case 'recording':  return 'Recording report…';
    case 'preparing':  return 'Preparing PDF engine (~3 seconds)…';
    case 'rendering':  return 'Generating PDF (5–10 seconds)…';
    case 'done':       return 'Downloaded ✓';
    default:           return 'Generate PDF';
  }
}

function isActiveStage(stage: Stage): boolean {
  return ACTIVE_STAGES.includes(stage);
}

export function ExportReportDialog({
  open,
  onOpenChange,
  payloadBase,
  inspectionType,
  onSelectInspectionType,
  flushPendingSaves,
  onBeforeExport,
}: ExportReportDialogProps) {
  const { toast } = useToast();
  // Preselect the persisted type; no silent default when none is saved yet —
  // the admin must explicitly classify the inspection before generating.
  const [reportType, setReportType] = useState<ReportType | null>(inspectionType);
  const [inspectorName, setInspectorName] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const hasGeneratedBefore = useRef(false);

  const isGenerating = isActiveStage(stage);
  const canGenerate =
    !isGenerating && stage !== 'done' && inspectorName.trim().length > 0 && reportType !== null;

  function handleSelectType(type: ReportType) {
    setReportType(type);
    // Persist immediately so the inspection row stays the single source of truth.
    onSelectInspectionType(type);
  }

  // Sync the preselection to the persisted type each time the dialog opens.
  useEffect(() => {
    if (open) setReportType(inspectionType);
  }, [open, inspectionType]);

  function guardedOpenChange(nextOpen: boolean) {
    // Block close while generation is in progress.
    if (!nextOpen && isGenerating) return;
    onOpenChange(nextOpen);
    if (!nextOpen) {
      // Reset dialog state on close.
      setTimeout(() => {
        setStage('idle');
        setError(null);
      }, 200);
    }
  }

  async function handleGenerate() {
    setError(null);
    if (!inspectorName.trim() || reportType === null) return;
    const selectedType = reportType;

    try {
      setStage('flushing');
      await flushPendingSaves();
      // Write derived condition snapshot + flush those patches before PDF generation.
      // Use the rooms it returns so the PDF reflects the just-written snapshot.
      let rooms = payloadBase.rooms;
      if (onBeforeExport) {
        const snapshotRooms = await onBeforeExport();
        if (snapshotRooms) rooms = snapshotRooms;
      }

      setStage('recording');
      setStage(hasGeneratedBefore.current ? 'rendering' : 'preparing');

      const [{ generateReportPdf }, { buildReportPayload }] = await Promise.all([
        import('@/lib/inspection-report/generate'),
        import('@/lib/inspection-report/buildReportPayload'),
      ]);
      // Sanitized allow-listed payload — owner contacts and all tenant data are
      // excluded at construction, never reaching the rendered PDF.
      const payload = buildReportPayload({
        inspection: payloadBase.inspection,
        rooms,
        appliances: payloadBase.appliances,
        damages: payloadBase.damages,
        utilitiesOverview: payloadBase.utilitiesOverview,
        reportType: selectedType,
        inspectorName: inspectorName.trim(),
        generatedAt: new Date(),
      });
      await generateReportPdf(payload, supabase, flushPendingSaves);

      hasGeneratedBefore.current = true;
      setStage('done');

      toast({
        title: 'Report downloaded',
        description:
          'If you generate multiple reports in this session, refresh the page between them for best performance.',
      });

      setTimeout(() => {
        guardedOpenChange(false);
      }, 800);
    } catch (err: any) {
      setStage('error');
      setError(err?.message ?? 'Could not generate report.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Inspection Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Report Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Report Type</Label>
            {reportType === null && (
              <p className="text-xs text-muted-foreground">
                Choose a report type to classify this inspection before generating.
              </p>
            )}
            <RadioGroup
              value={reportType ?? undefined}
              onValueChange={(v) => handleSelectType(v as ReportType)}
              className="grid grid-cols-1 gap-2"
              disabled={isGenerating}
            >
              {REPORT_TYPES.map((type) => {
                const meta = REPORT_TYPE_META[type];
                const selected = reportType === type;
                return (
                  <label
                    key={type}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                      selected
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border bg-background hover:bg-accent/40',
                      isGenerating && 'pointer-events-none opacity-60',
                    )}
                  >
                    <RadioGroupItem value={type} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">
                        {meta.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                        {meta.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Inspector Name */}
          <div className="space-y-2">
            <Label htmlFor="inspector-name" className="text-sm font-semibold">
              Inspector Name
            </Label>
            <Input
              id="inspector-name"
              autoFocus
              placeholder="Full name of the inspector signing this report"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* In-progress notice */}
          {isGenerating && (
            <p className="text-xs text-muted-foreground text-center">
              Generation in progress — please wait.
            </p>
          )}

          {/* Error */}
          {stage === 'error' && error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => guardedOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            {isGenerating || stage === 'done' ? (
              <>
                {stage !== 'done' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {buttonLabel(stage)}
              </>
            ) : (
              buttonLabel(stage)
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
