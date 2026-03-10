import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Phone, CheckCircle2, MessageCircle, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TIMEZONE_OPTIONS = [
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "UAE (GST)", value: "Asia/Dubai" },
  { label: "Singapore (SGT)", value: "Asia/Singapore" },
  { label: "United Kingdom (GMT)", value: "Europe/London" },
  { label: "USA Eastern (EST)", value: "America/New_York" },
  { label: "USA Pacific (PST)", value: "America/Los_Angeles" },
  { label: "Australia Sydney (AEST)", value: "Australia/Sydney" },
  { label: "Canada Eastern", value: "America/Toronto" },
];

const TIME_SLOTS = [
  "9:00 AM – 11:00 AM",
  "11:00 AM – 1:00 PM",
  "1:00 PM – 3:00 PM",
  "3:00 PM – 5:00 PM",
  "5:00 PM – 7:00 PM",
  "7:00 PM – 9:00 PM",
];

const SLOT_START_HOUR: Record<string, number> = {
  "9:00 AM – 11:00 AM": 9,
  "11:00 AM – 1:00 PM": 11,
  "1:00 PM – 3:00 PM": 13,
  "3:00 PM – 5:00 PM": 15,
  "5:00 PM – 7:00 PM": 17,
  "7:00 PM – 9:00 PM": 19,
};

interface Property {
  id: string;
  building_name: string;
  locality: string | null;
}

interface OwnerInspectionTabProps {
  userId: string;
}

function getTomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatCallbackDateTime(scheduledAt: string, timezone: string): string {
  try {
    const d = new Date(scheduledAt);
    const datePart = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    });
    const hour = d.toLocaleString("en-US", { hour: "numeric", hour12: true, timeZone: timezone });
    const hourNum = parseInt(d.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone }));
    const endHour = hourNum + 2;
    const endFormatted = new Date(0);
    endFormatted.setHours(endHour);
    const endStr = endFormatted.toLocaleString("en-US", { hour: "numeric", hour12: true });
    const tzAbbr = d.toLocaleString("en-US", { timeZoneName: "short", timeZone: timezone }).split(" ").pop();
    return `${datePart} · ${hour} – ${endStr} ${tzAbbr}`;
  } catch {
    return scheduledAt;
  }
}

function localToUTC(dateStr: string, hour: number, timezone: string): string {
  // Build a date string and use Intl to resolve the correct UTC offset
  const pad = (n: number) => String(n).padStart(2, "0");
  const localStr = `${dateStr}T${pad(hour)}:00:00`;

  // Get the offset for the target timezone at the desired date/time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Strategy: create a Date in UTC, then calculate offset by comparing
  // the UTC date's representation in the target timezone vs UTC
  const utcGuess = new Date(`${localStr}Z`);
  const parts = formatter.formatToParts(utcGuess);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const tzYear = parseInt(get("year"));
  const tzMonth = parseInt(get("month")) - 1;
  const tzDay = parseInt(get("day"));
  const tzHour = parseInt(get("hour") === "24" ? "0" : get("hour"));
  const tzMin = parseInt(get("minute"));
  const tzSec = parseInt(get("second"));
  const tzDate = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin, tzSec));
  const offsetMs = tzDate.getTime() - utcGuess.getTime();

  // The actual UTC time = local time - offset
  const [y, m, d] = dateStr.split("-").map(Number);
  const localMs = Date.UTC(y, m - 1, d, hour, 0, 0);
  const utcMs = localMs - offsetMs;
  return new Date(utcMs).toISOString();
}

export default function OwnerInspectionTab({ userId }: OwnerInspectionTabProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [loadingProps, setLoadingProps] = useState(true);

  // Callback state
  const [callbackData, setCallbackData] = useState<any>(null);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cbTimezone, setCbTimezone] = useState("Asia/Kolkata");
  const [cbDate, setCbDate] = useState("");
  const [cbSlot, setCbSlot] = useState("");
  const [cbLoading, setCbLoading] = useState(false);

  // Fetch properties
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, building_name, locality")
        .eq("owner_id", userId);
      if (data) setProperties(data);
      setLoadingProps(false);
    })();
  }, [userId]);

  // Fetch active callback when property changes
  useEffect(() => {
    if (!selectedPropertyId) {
      setCallbackData(null);
      return;
    }
    const fetchCallback = async () => {
      const { data } = await supabase
        .from("inspection_callbacks")
        .select("*")
        .eq("owner_id", userId)
        .eq("property_id", selectedPropertyId)
        .neq("status", "cancelled")
        .maybeSingle();
      setCallbackData(data ?? null);
    };
    fetchCallback();
  }, [selectedPropertyId, userId]);

  const selectedProp = properties.find((p) => p.id === selectedPropertyId);

  const whatsappUrl = selectedProp
    ? `https://wa.me/917899874281?text=Hi%2C%20I%27d%20like%20to%20schedule%20an%20inspection%20for%20my%20property%20at%20${encodeURIComponent(selectedProp.building_name)}%2C%20${encodeURIComponent(selectedProp.locality || "")}`
    : "";

  const tomorrowStr = useMemo(() => getTomorrowDateStr(), []);
  const canSubmitModal = cbTimezone && cbDate && cbSlot;

  const resetModalFields = () => {
    setCbTimezone("Asia/Kolkata");
    setCbDate("");
    setCbSlot("");
  };

  const openNewCallbackModal = () => {
    setIsRescheduling(false);
    resetModalFields();
    setShowCallbackModal(true);
  };

  const openRescheduleModal = () => {
    setIsRescheduling(true);
    if (callbackData) {
      setCbTimezone(callbackData.timezone || "Asia/Kolkata");
    }
    setCbDate("");
    setCbSlot("");
    setShowCallbackModal(true);
  };

  const refetchCallback = async () => {
    const { data } = await supabase
      .from("inspection_callbacks")
      .select("*")
      .eq("owner_id", userId)
      .eq("property_id", selectedPropertyId)
      .neq("status", "cancelled")
      .maybeSingle();
    setCallbackData(data ?? null);
  };

  const onSubmitCallback = async () => {
    setCbLoading(true);
    const startHour = SLOT_START_HOUR[cbSlot];
    if (startHour === undefined) {
      setCbLoading(false);
      return;
    }
    const scheduledAt = localToUTC(cbDate, startHour, cbTimezone);

    if (isRescheduling && callbackData) {
      const { error } = await supabase
        .from("inspection_callbacks")
        .update({
          scheduled_at: scheduledAt,
          timezone: cbTimezone,
          rescheduled_at: new Date().toISOString(),
          status: "rescheduled",
        })
        .eq("id", callbackData.id);

      if (error) {
        toast({ title: "Could not reschedule. Please try again.", variant: "destructive" });
      } else {
        setShowCallbackModal(false);
        await refetchCallback();
        toast({ title: "Callback rescheduled" });
      }
    } else {
      const { error } = await supabase.from("inspection_callbacks").insert({
        owner_id: userId,
        property_id: selectedPropertyId,
        timezone: cbTimezone,
        scheduled_at: scheduledAt,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "You already have an active callback for this property", variant: "destructive" });
        } else {
          toast({ title: "Could not save. Please try again.", variant: "destructive" });
        }
      } else {
        setShowCallbackModal(false);
        await refetchCallback();
        toast({ title: "Callback requested successfully" });
      }
    }
    setCbLoading(false);
  };

  const onCancelCallback = async () => {
    if (!callbackData) return;
    setCbLoading(true);
    const { error } = await supabase
      .from("inspection_callbacks")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancelReason || null,
      })
      .eq("id", callbackData.id);

    if (error) {
      toast({ title: "Could not cancel. Please try again.", variant: "destructive" });
    } else {
      setCallbackData(null);
      setShowCancelConfirm(false);
      setCancelReason("");
      toast({ title: "Callback cancelled" });
    }
    setCbLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Initiate Property Inspection for Listing
        </h2>
      </div>

      {/* Property selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Select Property</label>
        {loadingProps ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading properties…</span>
          </div>
        ) : properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties found.</p>
        ) : (
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Choose a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.building_name}{p.locality ? `, ${p.locality}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedPropertyId && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* WhatsApp Card */}
          <Card className="border-2" style={{ borderColor: "#25D366" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" style={{ color: "#25D366" }} />
                <CardTitle className="text-base">Chat with Us on WhatsApp</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Prefer to talk it through? Message us directly and our team will guide you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full min-h-[44px] font-medium"
                style={{ borderColor: "#25D366", color: "#25D366" }}
                onClick={() => window.open(whatsappUrl, "_blank")}
              >
                Open WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Callback Card */}
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                <CardTitle className="text-base text-primary-foreground">
                  {callbackData ? "✓ Callback Requested" : "Request a Callback"}
                </CardTitle>
              </div>
              {!callbackData && (
                <CardDescription className="text-sm text-primary-foreground/70">
                  Schedule a call with our team to initiate inspection
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {callbackData ? (
                <div className="space-y-3">
                  <p className="text-sm text-primary-foreground/90">
                    {formatCallbackDateTime(callbackData.scheduled_at, callbackData.timezone || "Asia/Kolkata")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 min-h-[44px]"
                      onClick={openRescheduleModal}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 min-h-[44px]"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full min-h-[44px]"
                  onClick={openNewCallbackModal}
                >
                  Request Callback
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Callback Modal */}
      <Dialog open={showCallbackModal} onOpenChange={setShowCallbackModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRescheduling ? "Reschedule Callback" : "Schedule Inspection Callback"}
            </DialogTitle>
            <DialogDescription>
              Choose your preferred date and time for a callback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Your Timezone</label>
              <Select value={cbTimezone} onValueChange={setCbTimezone}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Preferred Date</label>
              <Input
                type="date"
                className="min-h-[44px]"
                min={tomorrowStr}
                value={cbDate}
                onChange={(e) => setCbDate(e.target.value)}
              />
            </div>

            {/* Time slot grid */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Preferred Time Slot</label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setCbSlot(slot)}
                    className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                      cbSlot === slot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full min-h-[44px]"
              disabled={!canSubmitModal || cbLoading}
              onClick={onSubmitCallback}
            >
              {cbLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRescheduling ? "Confirm Reschedule" : "Confirm Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Callback Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this callback?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Reason (optional)</label>
              <Input
                className="min-h-[44px]"
                placeholder="Why are you cancelling?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelReason("");
                }}
              >
                Keep it
              </Button>
              <Button
                variant="destructive"
                className="flex-1 min-h-[44px]"
                disabled={cbLoading}
                onClick={onCancelCallback}
              >
                {cbLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
