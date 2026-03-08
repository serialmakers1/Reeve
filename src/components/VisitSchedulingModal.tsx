import React, { useState, useEffect, useCallback } from "react";
import { format, addDays, isBefore, startOfDay, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
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
import {
  CheckCircle2,
  Loader2,
  MapPin,
  CalendarDays,
  Clock,
  ArrowLeft,
  Sunrise,
  Sun,
  Sunset,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScheduleStep = "date" | "time" | "confirmation";
type TimeSlot = "morning" | "afternoon" | "evening";

interface ExistingVisit {
  id: string;
  scheduled_at: string;
  status: string;
}

interface ConfirmationData {
  flat_number: string | null;
  floor_number: number | null;
  building_name: string;
  street_address: string;
  locality: string | null;
  city: string;
  pincode: string | null;
  bhk: string;
}

interface VisitSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  userId: string;
  buildingName: string;
  bhk: string;
  existingVisit: ExistingVisit | null;
  onVisitChanged: () => void;
}

const TIME_SLOTS: { key: TimeSlot; label: string; range: string; icon: React.ReactNode; hour: number }[] = [
  { key: "morning", label: "Morning", range: "9:00 AM – 12:00 PM", icon: <Sunrise className="h-5 w-5" />, hour: 9 },
  { key: "afternoon", label: "Afternoon", range: "12:00 PM – 4:00 PM", icon: <Sun className="h-5 w-5" />, hour: 12 },
  { key: "evening", label: "Evening", range: "4:00 PM – 7:00 PM", icon: <Sunset className="h-5 w-5" />, hour: 16 },
];

function bhkLabel(bhk: string): string {
  const map: Record<string, string> = { studio: "Studio", "1BHK": "1 BHK", "2BHK": "2 BHK", "3BHK": "3 BHK", "4BHK": "4 BHK", "5BHK_plus": "5 BHK+" };
  return map[bhk] ?? bhk;
}

function slotFromHour(h: number): { label: string; range: string } {
  if (h < 12) return { label: "Morning", range: "9:00 AM – 12:00 PM" };
  if (h < 16) return { label: "Afternoon", range: "12:00 PM – 4:00 PM" };
  return { label: "Evening", range: "4:00 PM – 7:00 PM" };
}

// ─── Main Component ──────────────────────────────────────────────────────────

const VisitSchedulingModal: React.FC<VisitSchedulingModalProps> = ({
  open,
  onOpenChange,
  propertyId,
  userId,
  buildingName,
  bhk,
  existingVisit,
  onVisitChanged,
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [step, setStep] = useState<ScheduleStep>("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [scheduledVisitDate, setScheduledVisitDate] = useState<Date | undefined>();
  const [scheduledSlot, setScheduledSlot] = useState<TimeSlot | undefined>();
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showManageView, setShowManageView] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      if (existingVisit) {
        setShowManageView(true);
        setStep("date");
        setIsRescheduling(false);
      } else {
        setShowManageView(false);
        setStep("date");
        setIsRescheduling(false);
      }
      setSelectedDate(undefined);
      setSelectedSlot(undefined);
      setConfirmationData(null);
    }
  }, [open, existingVisit]);

  const today = new Date();
  const isPast6PM = today.getHours() >= 18;
  const minDate = isPast6PM ? addDays(startOfDay(today), 1) : startOfDay(today);
  const maxDate = addDays(startOfDay(today), 30);

  const disabledDays = (date: Date) => {
    return isBefore(date, minDate) || isBefore(maxDate, date);
  };

  const handleConfirmVisit = useCallback(async () => {
    if (!selectedDate || !selectedSlot) return;
    setIsSubmitting(true);

    const slotInfo = TIME_SLOTS.find((s) => s.key === selectedSlot)!;
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(slotInfo.hour, 0, 0, 0);

    try {
      if (isRescheduling && existingVisit) {
        // Mark old visit as rescheduled
        await supabase
          .from("visits")
          .update({ status: "rescheduled" as "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show" | "rescheduled" })
          .eq("id", existingVisit.id);

        // Insert new visit
        const { error } = await supabase.from("visits").insert({
          property_id: propertyId,
          tenant_id: userId,
          scheduled_at: scheduledAt.toISOString(),
          status: "scheduled",
          full_address_sent: true,
        });

        if (error) throw error;
        toast({ title: "Visit rescheduled successfully" });
      } else {
        const { error } = await supabase.from("visits").insert({
          property_id: propertyId,
          tenant_id: userId,
          scheduled_at: scheduledAt.toISOString(),
          status: "scheduled",
          full_address_sent: true,
        });

        if (error) throw error;
      }

      // Fetch full property details for confirmation
      const { data: propData } = await supabase
        .from("properties")
        .select("flat_number, floor_number, building_name, street_address, locality, city, pincode, bhk")
        .eq("id", propertyId)
        .single();

      if (propData) {
        setConfirmationData(propData as ConfirmationData);
      }

      setScheduledVisitDate(selectedDate);
      setScheduledSlot(selectedSlot);
      setStep("confirmation");
      setShowManageView(false);
      onVisitChanged();
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDate, selectedSlot, isRescheduling, existingVisit, propertyId, userId, toast, onVisitChanged]);

  const handleCancelVisit = async () => {
    if (!existingVisit) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("visits")
        .update({ status: "cancelled" as "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show" | "rescheduled", cancelled_at: new Date().toISOString() })
        .eq("id", existingVisit.id);

      if (error) throw error;
      toast({ title: "Visit cancelled" });
      onVisitChanged();
      onOpenChange(false);
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const startReschedule = () => {
    setShowManageView(false);
    setIsRescheduling(true);
    setStep("date");
    setSelectedDate(undefined);
    setSelectedSlot(undefined);
  };

  // ─── Manage Existing Visit View ────────────────────────────────────────────

  const ManageVisitContent = () => {
    if (!existingVisit) return null;
    const visitDate = new Date(existingVisit.scheduled_at);
    const slot = slotFromHour(visitDate.getHours());

    return (
      <div className="space-y-4 p-4">
        <Card className="border-border">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {format(visitDate, "EEEE, d MMMM yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{slot.label} ({slot.range})</span>
            </div>
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              {existingVisit.status === "confirmed" ? "Confirmed" : "Scheduled"}
            </Badge>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" className="min-h-[44px] flex-1" onClick={startReschedule}>
            Reschedule
          </Button>
          <Button
            variant="destructive"
            className="min-h-[44px] flex-1"
            onClick={() => setCancelDialogOpen(true)}
          >
            Cancel Visit
          </Button>
        </div>
      </div>
    );
  };

  // ─── Step Content ──────────────────────────────────────────────────────────

  const renderStepContent = () => {
    if (showManageView) return <ManageVisitContent />;

    if (step === "confirmation") {
      const dateToShow = scheduledVisitDate!;
      const slotInfo = TIME_SLOTS.find((s) => s.key === scheduledSlot)!;
      const cd = confirmationData;

      return (
        <div className="space-y-4 p-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <h3 className="text-lg font-bold text-foreground">Visit Scheduled!</h3>
            <p className="text-sm text-muted-foreground">Here are your visit details</p>
          </div>

          <Card className="border-border">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-semibold text-foreground">
                {bhkLabel(cd?.bhk ?? bhk)} in {cd?.building_name ?? buildingName}
              </p>
              {cd && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <p className="text-sm text-foreground">
                    {cd.flat_number && `Flat ${cd.flat_number}, `}
                    {cd.floor_number != null && `Floor ${cd.floor_number}, `}
                    {cd.building_name}, {cd.street_address}
                    {cd.locality && `, ${cd.locality}`}, {cd.city}
                    {cd.pincode && ` — ${cd.pincode}`}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{format(dateToShow, "EEEE, d MMMM yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{slotInfo.label} ({slotInfo.range})</span>
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                Scheduled
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-border bg-accent/50">
            <CardContent className="p-4">
              <p className="text-sm text-accent-foreground">
                📋 Our platform representative will be present during your visit. You will not be meeting the owner directly.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button className="min-h-[44px] flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button variant="outline" className="min-h-[44px] flex-1" onClick={startReschedule}>
              Reschedule
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className={cn("rounded-full px-2 py-0.5", step === "date" ? "bg-primary text-primary-foreground" : "bg-muted")}>
            Step 1
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={cn("rounded-full px-2 py-0.5", step === "time" ? "bg-primary text-primary-foreground" : "bg-muted")}>
            Step 2
          </span>
        </div>

        {isRescheduling && existingVisit && (
          <Card className="border-primary/30 bg-accent/50">
            <CardContent className="p-3">
              <p className="text-xs text-accent-foreground">
                Rescheduling your visit originally set for{" "}
                <span className="font-semibold">{format(new Date(existingVisit.scheduled_at), "EEEE, d MMMM yyyy")}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {step === "date" && (
          <>
            <div>
              <h3 className="text-base font-semibold text-foreground">Choose a date</h3>
              <p className="text-sm text-muted-foreground">Select a date to visit this property</p>
            </div>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                modifiers={{ today: isToday }}
                className="p-3 pointer-events-auto rounded-lg border border-border"
              />
            </div>
            {selectedDate && (
              <p className="text-center text-sm font-medium text-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy")}
              </p>
            )}
            <Button
              className="min-h-[44px] w-full"
              disabled={!selectedDate}
              onClick={() => setStep("time")}
            >
              Next
            </Button>
          </>
        )}

        {step === "time" && (
          <>
            <div>
              <h3 className="text-base font-semibold text-foreground">Choose a time slot</h3>
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
                  onClick={() => setSelectedSlot(slot.key)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all",
                    selectedSlot === slot.key
                      ? "border-primary bg-accent shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  <span className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    selectedSlot === slot.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {slot.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                    <p className="text-xs text-muted-foreground">{slot.range}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() => setStep("date")}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                className="min-h-[44px] flex-1"
                disabled={!selectedSlot || isSubmitting}
                onClick={handleConfirmVisit}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...</>
                ) : (
                  "Confirm Visit"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── Title ─────────────────────────────────────────────────────────────────

  const getTitle = () => {
    if (showManageView) return "Manage Visit";
    if (step === "confirmation") return "";
    if (isRescheduling) return "Reschedule Visit";
    return "Schedule a Visit";
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const content = renderStepContent();
  const title = getTitle();

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh] overflow-y-auto">
            {title && (
              <DrawerHeader>
                <DrawerTitle>{title}</DrawerTitle>
              </DrawerHeader>
            )}
            {content}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            {title && (
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
            )}
            {content}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your visit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your visit? You can always schedule a new one later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Keep Visit</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelVisit}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VisitSchedulingModal;
