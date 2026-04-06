import React, { useState, useEffect } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, ArrowLeft, Sunrise, Sun, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisitSchedulerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: Date) => void;
  title?: string;
  confirmLabel?: string;
  loading?: boolean;
}

type Step = "date" | "slot";
type TimeSlot = "morning" | "afternoon" | "evening";

// ─── Constants (hoisted to module level to avoid re-creating each render) ─────

// IST = UTC+5:30. Each slot's UTC equivalent:
// Morning   09:00 IST → 03:30 UTC
// Afternoon 12:00 IST → 06:30 UTC
// Evening   16:00 IST → 10:30 UTC
const TIME_SLOTS: {
  key: TimeSlot;
  label: string;
  range: string;
  icon: React.ReactNode;
  utcH: number;
  utcM: number;
}[] = [
  {
    key: "morning",
    label: "Morning",
    range: "9:00 AM – 12:00 PM",
    icon: <Sunrise className="h-5 w-5" />,
    utcH: 3,
    utcM: 30,
  },
  {
    key: "afternoon",
    label: "Afternoon",
    range: "12:00 PM – 4:00 PM",
    icon: <Sun className="h-5 w-5" />,
    utcH: 6,
    utcM: 30,
  },
  {
    key: "evening",
    label: "Evening",
    range: "4:00 PM – 7:00 PM",
    icon: <Sunset className="h-5 w-5" />,
    utcH: 10,
    utcM: 30,
  },
];

// ─── Inner content — extracted so Dialog and Drawer share identical markup ────

interface SchedulerContentProps {
  step: Step;
  selectedDate: Date | undefined;
  selectedSlot: TimeSlot | undefined;
  minDate: Date;
  maxDate: Date;
  loading: boolean;
  confirmLabel: string;
  onDateSelect: (date: Date | undefined) => void;
  onSlotSelect: (slot: TimeSlot) => void;
  onBack: () => void;
  onConfirm: () => void;
}

function SchedulerContent({
  step,
  selectedDate,
  selectedSlot,
  minDate,
  maxDate,
  loading,
  confirmLabel,
  onDateSelect,
  onSlotSelect,
  onBack,
  onConfirm,
}: SchedulerContentProps) {
  const isDisabled = (date: Date) =>
    isBefore(date, minDate) || isBefore(maxDate, date);

  return (
    <div className="space-y-4 p-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "rounded-full px-2 py-0.5",
            step === "date"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          Step 1
        </span>
        <span className="text-muted-foreground">→</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5",
            step === "slot"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          Step 2
        </span>
      </div>

      {/* Step 1 — Date selection */}
      {step === "date" && (
        <>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Choose a date
            </h3>
            <p className="text-sm text-muted-foreground">
              Select a date to visit this property
            </p>
          </div>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              disabled={isDisabled}
              className="pointer-events-auto rounded-lg border border-border p-3"
            />
          </div>
          {selectedDate && (
            <p className="text-center text-sm font-medium text-foreground">
              {format(selectedDate, "EEEE, d MMMM yyyy")}
            </p>
          )}
        </>
      )}

      {/* Step 2 — Slot selection */}
      {step === "slot" && (
        <>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Choose a time slot
            </h3>
            {selectedDate && (
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy")}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.key}
                type="button"
                onClick={() => onSlotSelect(slot.key)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all",
                  selectedSlot === slot.key
                    ? "border-primary bg-accent shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    selectedSlot === slot.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {slot.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {slot.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{slot.range}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={onBack}
              disabled={loading}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button
              className="min-h-[44px] flex-1"
              disabled={!selectedSlot || loading}
              onClick={onConfirm}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const VisitSchedulerModal: React.FC<VisitSchedulerModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = "Schedule a Visit",
  confirmLabel = "Confirm Visit",
  loading = false,
}) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | undefined>();

  // Reset state each time the modal opens
  useEffect(() => {
    if (open) {
      setStep("date");
      setSelectedDate(undefined);
      setSelectedSlot(undefined);
    }
  }, [open]);

  // Compute min/max once per render (stable unless day changes)
  const today = new Date();
  const isPast6PM = today.getHours() >= 18;
  const minDate = isPast6PM
    ? addDays(startOfDay(today), 1)
    : startOfDay(today);
  const maxDate = addDays(startOfDay(today), 30);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(undefined);
    if (date) setStep("slot"); // auto-advance
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    const slotDef = TIME_SLOTS.find((s) => s.key === selectedSlot)!;
    // Build UTC Date from the IST slot time
    const utcDate = new Date(
      Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        slotDef.utcH,
        slotDef.utcM,
        0,
        0
      )
    );
    onConfirm(utcDate);
  };

  const handleBack = () => {
    setStep("date");
    setSelectedSlot(undefined);
  };

  const contentProps: SchedulerContentProps = {
    step,
    selectedDate,
    selectedSlot,
    minDate,
    maxDate,
    loading,
    confirmLabel,
    onDateSelect: handleDateSelect,
    onSlotSelect: handleSlotSelect,
    onBack: handleBack,
    onConfirm: handleConfirm,
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent className="max-h-[90vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <SchedulerContent {...contentProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <SchedulerContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
};

export default VisitSchedulerModal;
