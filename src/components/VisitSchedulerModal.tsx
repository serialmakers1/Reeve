import React, { useState, useEffect } from "react";
import { format, addDays, isBefore, startOfDay, isSameDay } from "date-fns";
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
import { Loader2, ArrowLeft, Moon, Sunrise, Sun, Sunset, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisitSchedulerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: Date) => void;
  title?: string;
  confirmLabel?: string;
  loading?: boolean;
  /** 'tenant' uses slot cards (default). 'admin' uses exact date + time inputs. */
  mode?: "tenant" | "admin";
}

type Step = "date" | "slot";
type TimeSlot = "early_morning" | "morning" | "afternoon" | "evening";

// ─── Constants ─────────────────────────────────────────────────────────────────

// IST = UTC+5:30. Each slot's UTC equivalent:
// Early Morning  06:00 IST → 00:30 UTC
// Morning        09:00 IST → 03:30 UTC
// Afternoon      12:00 IST → 06:30 UTC
// Evening        16:00 IST → 10:30 UTC
const TIME_SLOTS: {
  key: TimeSlot;
  label: string;
  range: string;
  icon: React.ReactNode;
  utcH: number;
  utcM: number;
  istStartH: number;
}[] = [
  {
    key: "early_morning",
    label: "Early Morning",
    range: "6:00 AM – 9:00 AM",
    icon: <Moon className="h-5 w-5" />,
    utcH: 0,
    utcM: 30,
    istStartH: 6,
  },
  {
    key: "morning",
    label: "Morning",
    range: "9:00 AM – 12:00 PM",
    icon: <Sunrise className="h-5 w-5" />,
    utcH: 3,
    utcM: 30,
    istStartH: 9,
  },
  {
    key: "afternoon",
    label: "Afternoon",
    range: "12:00 PM – 4:00 PM",
    icon: <Sun className="h-5 w-5" />,
    utcH: 6,
    utcM: 30,
    istStartH: 12,
  },
  {
    key: "evening",
    label: "Evening",
    range: "4:00 PM – 7:00 PM",
    icon: <Sunset className="h-5 w-5" />,
    utcH: 10,
    utcM: 30,
    istStartH: 16,
  },
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Build a UTC Date from a calendar date + "HH:MM" IST string. */
function buildUTCFromIST(date: Date, timeStr: string): Date {
  const [hh, mm] = timeStr.split(":").map(Number);
  // Date.UTC with hh/mm treats them as UTC; subtracting IST offset converts to real UTC.
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm) -
      IST_OFFSET_MS
  );
}

// ─── Inner content ─────────────────────────────────────────────────────────────

interface SchedulerContentProps {
  mode: "tenant" | "admin";
  step: Step;
  selectedDate: Date | undefined;
  selectedSlot: TimeSlot | undefined;
  selectedTime: string; // "HH:MM" for admin mode
  minDate: Date;
  maxDate: Date;
  loading: boolean;
  confirmLabel: string;
  onDateSelect: (date: Date | undefined) => void;
  onSlotSelect: (slot: TimeSlot) => void;
  onTimeChange: (time: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

function SchedulerContent({
  mode,
  step,
  selectedDate,
  selectedSlot,
  selectedTime,
  minDate,
  maxDate,
  loading,
  confirmLabel,
  onDateSelect,
  onSlotSelect,
  onTimeChange,
  onBack,
  onConfirm,
}: SchedulerContentProps) {
  const isDisabled = (date: Date) =>
    isBefore(date, minDate) || isBefore(maxDate, date);

  // Admin: derive chosen UTC datetime + validation
  const adminChosenUTC =
    mode === "admin" && selectedDate && selectedTime
      ? buildUTCFromIST(selectedDate, selectedTime)
      : null;
  const adminIsPast = adminChosenUTC ? adminChosenUTC <= new Date() : false;
  const adminCanConfirm = !!adminChosenUTC && !adminIsPast && !loading;

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

      {/* Step 1 — Date selection (shared between modes) */}
      {step === "date" && (
        <>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Choose a date
            </h3>
            <p className="text-sm text-muted-foreground">
              {mode === "admin"
                ? "Select the visit date"
                : "Select a date to visit this property"}
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

      {/* Step 2 — TENANT: slot cards */}
      {step === "slot" && mode === "tenant" && (
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
            {(() => {
              const now = new Date();
              const currentISTHour = now.getHours();
              const isToday = selectedDate
                ? isSameDay(selectedDate, now)
                : false;
              return TIME_SLOTS.filter(
                (slot) => !isToday || slot.istStartH > currentISTHour
              ).map((slot) => (
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
              ));
            })()}
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

      {/* Step 2 — ADMIN: exact date + time picker */}
      {step === "slot" && mode === "admin" && (
        <>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Set exact time
            </h3>
            {selectedDate && (
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy")}
              </p>
            )}
          </div>

          {/* Time input */}
          <div className="space-y-2">
            <label
              htmlFor="admin-time-input"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time (IST)
            </label>
            <input
              id="admin-time-input"
              type="time"
              step="300"
              value={selectedTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className={cn(
                "h-11 w-full rounded-lg border bg-card px-3 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                "transition-colors",
                adminIsPast
                  ? "border-destructive focus:ring-destructive"
                  : "border-border hover:border-primary/50"
              )}
            />
          </div>

          {/* Human-readable preview */}
          {adminChosenUTC && !adminIsPast && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">Scheduled for</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {format(selectedDate!, "EEEE, d MMMM yyyy")}
                {" · "}
                {selectedTime
                  ? (() => {
                      const [hh, mm] = selectedTime.split(":").map(Number);
                      const period = hh >= 12 ? "PM" : "AM";
                      const h12 = hh % 12 || 12;
                      return `${h12}:${mm.toString().padStart(2, "0")} ${period} IST`;
                    })()
                  : ""}
              </p>
            </div>
          )}

          {/* Past-datetime error */}
          {adminIsPast && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                This date and time is in the past. Please choose a future time.
              </p>
            </div>
          )}

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
              disabled={!adminCanConfirm}
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
  mode = "tenant",
}) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Reset state each time the modal opens
  useEffect(() => {
    if (open) {
      setStep("date");
      setSelectedDate(undefined);
      setSelectedSlot(undefined);
      setSelectedTime("");
    }
  }, [open]);

  const today = new Date();

  // Tenant: 4PM cutoff — push minDate to tomorrow if too late to book today
  // Admin: no cutoff, always allow today
  const isPast4PM = today.getHours() >= 16;
  const minDate =
    mode === "tenant" && isPast4PM
      ? addDays(startOfDay(today), 1)
      : startOfDay(today);

  // Admin window: 30 days. Tenant window: 7 days.
  const maxDate = addDays(
    startOfDay(today),
    mode === "admin" ? 30 : 7
  );

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(undefined);
    setSelectedTime("");
    if (date) setStep("slot"); // auto-advance
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleConfirm = () => {
    if (!selectedDate) return;

    if (mode === "admin") {
      if (!selectedTime) return;
      const utcDate = buildUTCFromIST(selectedDate, selectedTime);
      if (utcDate <= new Date()) return; // safety guard
      onConfirm(utcDate);
    } else {
      if (!selectedSlot) return;
      const slotDef = TIME_SLOTS.find((s) => s.key === selectedSlot)!;
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
    }
  };

  const handleBack = () => {
    setStep("date");
    setSelectedSlot(undefined);
    setSelectedTime("");
  };

  const contentProps: SchedulerContentProps = {
    mode,
    step,
    selectedDate,
    selectedSlot,
    selectedTime,
    minDate,
    maxDate,
    loading,
    confirmLabel,
    onDateSelect: handleDateSelect,
    onSlotSelect: handleSlotSelect,
    onTimeChange: setSelectedTime,
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
