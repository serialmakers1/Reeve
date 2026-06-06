import { useRef, useState } from 'react';
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
import { REPORT_TYPE_META } from '@/lib/inspection-report/types';
import type { ReportType, UtilityKey } from '@/lib/inspection-report/types';
import type {
  PropertyRecord,
  InspectionRecord,
  LocalRoom,
  LocalAppliance,
  DamageItem,
} from '@/pages/admin/InspectionForm';

type Stage = 'idle' | 'flushing' | 'recording' | 'preparing' | 'rendering' | 'done' | 'error';

const ACTIVE_STAGES: Stage[] = ['flushing', 'recording', 'preparing', 'rendering'];

const REPORT_TYPES: ReportType[] = ['PBR', 'MIR', 'BIR', 'MOCR'];

export interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payloadBase: {
    property: PropertyRecord;
    inspection: InspectionRecord;
    rooms: LocalRoom[];
    appliances: LocalAppliance[];
    damages: DamageItem[];
    utilitiesOverview: Partial<Record<UtilityKey, unknown>>;
    ownerName: string;
    mediaDriveLink?: string | null;
  };
  flushPendingSaves: () => Promise<void>;
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
  flushPendingSaves,
}: ExportReportDialogProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('PBR');
  const [inspectorName, setInspectorName] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const hasGeneratedBefore = useRef(false);

  const isGenerating = isActiveStage(stage);
  const canGenerate = !isGenerating && stage !== 'done' && inspectorName.trim().length > 0;

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
    if (!inspectorName.trim()) return;

    try {
      setStage('flushing');
      await flushPendingSaves();

      setStage('recording');
      setStage(hasGeneratedBefore.current ? 'rendering' : 'preparing');

      const { generateReportPdf } = await import('@/lib/inspection-report/generate');
      await generateReportPdf(
        {
          ...payloadBase,
          reportType,
          inspectorName: inspectorName.trim(),
          generatedAt: new Date(),
        },
        supabase,
        flushPendingSaves,
      );

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
            <RadioGroup
              value={reportType}
              onValueChange={(v) => setReportType(v as ReportType)}
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
                        <span className="text-primary">{type}</span>
                        {' — '}
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
