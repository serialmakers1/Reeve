import React, { useState, useEffect, useMemo, useCallback } from "react";
import { addDays, startOfDay, format, isToday } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Building2,
  Home,
  Check,
  Phone,
  MessageCircle,
  Send,
  AlertCircle,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Types ────────────────────────────────────────────────────────────────────

type Intent = "owner" | "tenant";
type ContactChannel = "whatsapp" | "telegram" | "botim";

// ─── Slot constants (exported for reuse) ─────────────────────────────────────

export const CALLBACK_SLOT_KEYS = [
  "asap",
  "09_10",
  "10_11",
  "11_12",
  "12_13",
  "13_14",
  "14_15",
  "15_16",
  "16_17",
  "17_18",
  "18_19",
  "19_20",
] as const;

export const CALLBACK_SLOT_LABELS: Record<string, string> = {
  asap: "Call me ASAP",
  "09_10": "9:00 – 10:00 AM",
  "10_11": "10:00 – 11:00 AM",
  "11_12": "11:00 AM – 12:00 PM",
  "12_13": "12:00 – 1:00 PM",
  "13_14": "1:00 – 2:00 PM",
  "14_15": "2:00 – 3:00 PM",
  "15_16": "3:00 – 4:00 PM",
  "16_17": "4:00 – 5:00 PM",
  "17_18": "5:00 – 6:00 PM",
  "18_19": "6:00 – 7:00 PM",
  "19_20": "7:00 – 8:00 PM",
  "02_03": "2:00 – 3:00 AM IST (Night Window)",
};

const CHANNEL_LABELS: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  botim: "Botim",
};

const CHANNEL_ICONS: Record<ContactChannel, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4" />,
  telegram: <Send className="h-4 w-4" />,
  botim: <Phone className="h-4 w-4" />,
};

// ─── IANA timezone list ───────────────────────────────────────────────────────

const ALL_TIMEZONES: string[] = (() => {
  try {
    return (Intl as any).supportedValuesOf("timeZone") as string[];
  } catch {
    return [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Toronto",
      "America/Vancouver",
      "America/Sao_Paulo",
      "America/Argentina/Buenos_Aires",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Moscow",
      "Asia/Kolkata",
      "Asia/Karachi",
      "Asia/Dhaka",
      "Asia/Dubai",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Seoul",
      "Australia/Sydney",
      "Australia/Melbourne",
      "Australia/Perth",
      "Pacific/Auckland",
      "Pacific/Honolulu",
      "Africa/Cairo",
      "Africa/Nairobi",
      "Africa/Lagos",
    ];
  }
})();

// ─── IST utilities (src/components/RequestCallbackModal.tsx) ─────────────────

/**
 * Returns the current hour in IST (Asia/Kolkata), 0–23.
 * Exported for use by RequestCallbackButton and pages.
 */
export function getISTHour(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  return h === 24 ? 0 : h;
}

/** Returns the IST hour component of an arbitrary UTC Date. */
function getISTHourFromDate(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  return h === 24 ? 0 : h;
}

/** Formats a UTC Date as a human-readable IST time string ("2:30 PM"). */
function formatInIST(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Returns { year, month (0-indexed), day } for a date in the given IANA timezone. */
function getLocalDateComponents(
  tz: string,
  d: Date
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  return {
    year: parseInt(parts.find((p) => p.type === "year")!.value, 10),
    month: parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1,
    day: parseInt(parts.find((p) => p.type === "day")!.value, 10),
  };
}

/**
 * Returns the ms offset of a timezone relative to UTC.
 * Positive = ahead of UTC (e.g. IST = +19800000 = +5:30h).
 */
function getTimezoneOffsetMs(tz: string, refDate: Date = new Date()): number {
  const utcWall = new Date(
    refDate.toLocaleString("en-US", { timeZone: "UTC" })
  );
  const tzWall = new Date(refDate.toLocaleString("en-US", { timeZone: tz }));
  return tzWall.getTime() - utcWall.getTime();
}

/**
 * Converts a "HH:MM" string entered in `tz` timezone on `refDate` to a UTC Date.
 * Returns null if the string is invalid.
 */
function localTimeToIST(
  timeStr: string,
  tz: string,
  refDate: Date
): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;

  const { year, month, day } = getLocalDateComponents(tz, refDate);
  const naiveUTCMs = Date.UTC(year, month, day, h, m, 0);
  const offsetMs = getTimezoneOffsetMs(tz, refDate);
  return new Date(naiveUTCMs - offsetMs);
}

/** Derives the 1-hour slot key from an IST hour (9 → "09_10"). */
function slotFromISTHour(istHour: number): string {
  const clamped = Math.max(9, Math.min(19, istHour));
  return `${String(clamped).padStart(2, "0")}_${String(clamped + 1).padStart(2, "0")}`;
}

/** Whether a given slot key should be disabled given today-ness and current IST hour. */
function isSlotDisabled(slotKey: string, dateIsToday: boolean): boolean {
  if (slotKey === "asap") {
    if (!dateIsToday) return true;
    const h = getISTHour();
    return h < 9 || h >= 20;
  }
  if (!dateIsToday) return false;
  const endHour = parseInt(slotKey.split("_")[1], 10);
  return getISTHour() >= endHour;
}

/** Formats a date pill label: "Today" / "Tomorrow" / "Wed 9". */
function formatDatePill(date: Date, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return format(date, "EEE d");
}

// ─── Phone validation ─────────────────────────────────────────────────────────

const PHONE_REGEX = /^[6-9]\d{9}$/;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RequestCallbackModalProps {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
  defaultIntent?: Intent;
  context?: "general" | "property" | "owner_landing" | "tenant_search";
}

// ─── Main component ───────────────────────────────────────────────────────────

const RequestCallbackModal: React.FC<RequestCallbackModalProps> = ({
  open,
  onClose,
  propertyId,
  defaultIntent,
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [intent, setIntent] = useState<Intent | null>(null);

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [userLoading, setUserLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isInternational, setIsInternational] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // ── Step 3A (India) ─────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // ── Step 3B (International) ─────────────────────────────────────────────────
  const [channel, setChannel] = useState<ContactChannel | null>(null);
  const [contactHandle, setContactHandle] = useState("");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [tzSearch, setTzSearch] = useState("");
  const [intlSelectedDate, setIntlSelectedDate] = useState<Date | null>(null);
  const [localTime, setLocalTime] = useState("");
  const [nightWindow, setNightWindow] = useState(false);
  const [preferredDatetimeIST, setPreferredDatetimeIST] =
    useState<Date | null>(null);
  const [timeNotice, setTimeNotice] = useState<string | null>(null);

  // ── Step 4 ──────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep(1);
      setIntent(defaultIntent ?? null);
      setUserLoading(false);
      setName("");
      setPhone("");
      setIsInternational(false);
      setPhoneError(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setChannel(null);
      setContactHandle("");
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setTzSearch("");
      setIntlSelectedDate(null);
      setLocalTime("");
      setNightWindow(false);
      setPreferredDatetimeIST(null);
      setTimeNotice(null);
      setSubmitting(false);
      setSubmitError(null);
      setSuccess(false);
    }
  }, [open, defaultIntent]);

  // ── Auto-close on success ────────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => onClose(), 2000);
      return () => clearTimeout(t);
    }
  }, [success, onClose]);

  // ── Fetch user data on step 2 ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || !open) return;
    let cancelled = false;
    const fetchUser = async () => {
      setUserLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const { data } = await supabase
          .from("users")
          .select("full_name, phone")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setName((prev) => prev || data.full_name || "");
          setPhone((prev) => prev || data.phone || "");
        }
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    };
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [step, open]);

  // ── IST time correction for Step 3B ──────────────────────────────────────────
  useEffect(() => {
    if (nightWindow || !localTime || !intlSelectedDate) {
      setPreferredDatetimeIST(null);
      setTimeNotice(null);
      return;
    }
    const base = localTimeToIST(localTime, timezone, intlSelectedDate);
    if (!base) {
      setPreferredDatetimeIST(null);
      setTimeNotice(null);
      return;
    }
    const istHour = getISTHourFromDate(base);

    if (istHour < 9) {
      // Shift to 09:00 IST same day
      const d = intlSelectedDate;
      const corrected = new Date(
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 3, 30) // 09:00 IST = 03:30 UTC
      );
      const localEquiv = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(corrected);
      setPreferredDatetimeIST(corrected);
      setTimeNotice(
        `Your selected time is before our working hours. We'll reach you after 9:00 AM IST — that's ${localEquiv} your time.`
      );
    } else if (istHour >= 20) {
      // Shift to 09:00 IST next day
      const next = addDays(intlSelectedDate, 1);
      const corrected = new Date(
        Date.UTC(next.getFullYear(), next.getMonth(), next.getDate(), 3, 30)
      );
      const localEquiv = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(corrected);
      setPreferredDatetimeIST(corrected);
      setTimeNotice(
        `Your selected time is after our working hours. We'll reach you at 9:00 AM IST the next day — that's ${localEquiv} your time.`
      );
    } else {
      setPreferredDatetimeIST(base);
      setTimeNotice(null);
    }
  }, [localTime, timezone, intlSelectedDate, nightWindow]);

  // ── Date pills ───────────────────────────────────────────────────────────────
  const datePills = useMemo(
    () => Array.from({ length: 10 }, (_, i) => addDays(startOfDay(new Date()), i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // stable per mount — date changes handled by timezone
  );

  // ── Filtered timezones ────────────────────────────────────────────────────────
  const filteredTimezones = useMemo(
    () =>
      tzSearch
        ? ALL_TIMEZONES.filter((tz) =>
            tz.toLowerCase().includes(tzSearch.toLowerCase())
          )
        : ALL_TIMEZONES,
    [tzSearch]
  );

  // ── Live IST preview (Step 3B time input) ────────────────────────────────────
  const liveISTPreview = useMemo(() => {
    if (!localTime || nightWindow) return null;
    const ref = intlSelectedDate ?? new Date();
    const base = localTimeToIST(localTime, timezone, ref);
    if (!base) return null;
    return formatInIST(base);
  }, [localTime, timezone, intlSelectedDate, nightWindow]);

  // ── Validation helpers ────────────────────────────────────────────────────────
  const validatePhone = useCallback(() => {
    if (!isInternational && !PHONE_REGEX.test(phone.trim())) {
      setPhoneError("Enter a valid 10-digit Indian mobile number (starts with 6–9)");
      return false;
    }
    setPhoneError(null);
    return true;
  }, [phone, isInternational]);

  const step3BValid =
    channel !== null &&
    intlSelectedDate !== null &&
    (nightWindow || (localTime.length >= 4 && preferredDatetimeIST !== null));

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const dateValue = isInternational
        ? intlSelectedDate!
        : selectedDate!;
      const preferredDate = format(dateValue, "yyyy-MM-dd");

      let finalSlot = selectedSlot;
      let finalDatetimeIST: string | null = null;

      if (isInternational) {
        if (nightWindow) {
          finalSlot = "02_03";
          const prevDay = addDays(intlSelectedDate!, -1);
          const nightWindowUTC = new Date(
            Date.UTC(
              prevDay.getFullYear(),
              prevDay.getMonth(),
              prevDay.getDate(),
              20,
              30 // 02:00 IST = 20:30 UTC previous day
            )
          );
          finalDatetimeIST = nightWindowUTC.toISOString();
        } else {
          finalDatetimeIST = preferredDatetimeIST!.toISOString();
          finalSlot = slotFromISTHour(getISTHourFromDate(preferredDatetimeIST!));
        }
      }

      const payload = {
        user_id: session.user.id,
        intent,
        name: name.trim(),
        phone: phone.trim() || null,
        is_international: isInternational,
        contact_channel: isInternational ? channel : "phone",
        contact_handle: isInternational && contactHandle.trim() ? contactHandle.trim() : null,
        timezone: isInternational ? timezone : null,
        preferred_date: preferredDate,
        preferred_slot: finalSlot,
        preferred_datetime_ist: finalDatetimeIST,
        property_id: propertyId ?? null,
        status: "pending",
      };

      const { error } = await (supabase as any)
        .from("callback_requests")
        .insert(payload);

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setSubmitError(
        err?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1.5 pb-2">
      {[1, 2, 3, 4].map((s) => (
        <React.Fragment key={s}>
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {s < step ? <Check className="h-3 w-3" /> : s}
          </span>
          {s < 4 && (
            <span
              className={cn(
                "h-px w-6 rounded bg-border transition-colors",
                s < step && "bg-primary/40"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Step 1: Intent ─────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      <StepIndicator />
      <div>
        <h3 className="text-base font-semibold text-foreground">
          How can we help you?
        </h3>
        <p className="text-sm text-muted-foreground">
          Tell us what you're looking to do
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            {
              value: "owner" as Intent,
              label: "I want to list my property",
              icon: <Building2 className="h-8 w-8" />,
            },
            {
              value: "tenant" as Intent,
              label: "I'm looking to rent",
              icon: <Home className="h-8 w-8" />,
            },
          ] as const
        ).map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setIntent(value)}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border p-5 text-center text-sm font-medium transition-all",
              intent === value
                ? "border-primary bg-accent shadow-sm"
                : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                intent === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {icon}
            </span>
            <span className="leading-tight">{label}</span>
          </button>
        ))}
      </div>

      <Button
        className="min-h-[44px] w-full"
        disabled={!intent}
        onClick={() => setStep(2)}
      >
        Next
      </Button>
    </div>
  );

  // ── Step 2: Contact details ────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-4">
      <StepIndicator />
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Your contact details
        </h3>
        <p className="text-sm text-muted-foreground">
          We'll use these to reach you
        </p>
      </div>

      {userLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cb-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cb-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="cb-phone">
              Phone number
              {!isInternational && (
                <span className="text-destructive"> *</span>
              )}
            </Label>
            <Input
              id="cb-phone"
              type="tel"
              inputMode="numeric"
              placeholder={
                isInternational ? "+1 234 567 8900" : "10-digit mobile number"
              }
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError(null);
              }}
              onBlur={validatePhone}
              className={cn("min-h-[44px]", phoneError && "border-destructive")}
            />
            {phoneError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> {phoneError}
              </p>
            )}
          </div>

          {/* International checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="cb-intl"
              checked={isInternational}
              onCheckedChange={(v) => {
                setIsInternational(!!v);
                setPhoneError(null);
              }}
            />
            <Label htmlFor="cb-intl" className="cursor-pointer text-sm font-normal">
              I'm located outside India
            </Label>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="min-h-[44px] flex-1"
          onClick={() => setStep(1)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button
          className="min-h-[44px] flex-1"
          disabled={
            userLoading ||
            !name.trim() ||
            (!isInternational && !phone.trim())
          }
          onClick={() => {
            if (!validatePhone()) return;
            setStep(3);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );

  // ── Step 3A: India schedule ────────────────────────────────────────────────
  const renderStep3A = () => {
    const dateIsToday = selectedDate ? isToday(selectedDate) : false;

    return (
      <div className="space-y-4">
        <StepIndicator />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            When should we call?
          </h3>
          <p className="text-sm text-muted-foreground">
            Pick a date and time that works for you
          </p>
        </div>

        {/* Date pills */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Date
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {datePills.map((date, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                className={cn(
                  "min-w-[60px] shrink-0 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all",
                  selectedDate &&
                    format(selectedDate, "yyyy-MM-dd") ===
                      format(date, "yyyy-MM-dd")
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                {formatDatePill(date, i)}
              </button>
            ))}
          </div>
        </div>

        {/* Slot grid */}
        {selectedDate && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Time slot
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CALLBACK_SLOT_KEYS.map((key) => {
                const disabled = isSlotDisabled(key, dateIsToday);
                const isAsap = key === "asap";

                const btn = (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setSelectedSlot(key)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all",
                      isAsap && "col-span-2",
                      selectedSlot === key && !disabled
                        ? "border-primary bg-accent shadow-sm"
                        : "border-border bg-card",
                      disabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:border-primary/40"
                    )}
                  >
                    {CALLBACK_SLOT_LABELS[key]}
                  </button>
                );

                if (isAsap && disabled) {
                  return (
                    <TooltipProvider key={key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="col-span-2">{btn}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Available today during working hours (9 AM – 8 PM
                            IST)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                return btn;
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="min-h-[44px] flex-1"
            onClick={() => setStep(2)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button
            className="min-h-[44px] flex-1"
            disabled={!selectedDate || !selectedSlot}
            onClick={() => setStep(4)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  // ── Step 3B: International schedule ──────────────────────────────────────────
  const renderStep3B = () => (
    <div className="space-y-4">
      <StepIndicator />
      <div>
        <h3 className="text-base font-semibold text-foreground">
          How & when to reach you
        </h3>
        <p className="text-sm text-muted-foreground">
          We'll message you on your preferred platform
        </p>
      </div>

      {/* Channel */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Contact via
        </p>
        <div className="flex gap-2">
          {(["whatsapp", "telegram", "botim"] as ContactChannel[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                channel === ch
                  ? "border-primary bg-accent shadow-sm"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              {CHANNEL_ICONS[ch]}
              {CHANNEL_LABELS[ch]}
            </button>
          ))}
        </div>
      </div>

      {/* Handle */}
      <div className="space-y-1.5">
        <Label htmlFor="cb-handle">Username / number (optional)</Label>
        <Input
          id="cb-handle"
          type="text"
          placeholder="@username or phone number"
          value={contactHandle}
          onChange={(e) => setContactHandle(e.target.value)}
          className="min-h-[44px]"
        />
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <Label htmlFor="cb-tz-search">Your timezone</Label>
        <Input
          id="cb-tz-search"
          type="text"
          placeholder="Search timezone..."
          value={tzSearch}
          onChange={(e) => setTzSearch(e.target.value)}
          className="min-h-[44px]"
        />
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          size={4}
          aria-label="Select timezone"
        >
          {filteredTimezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {/* Date pills */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Date
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {datePills.map((date, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIntlSelectedDate(date)}
              className={cn(
                "min-w-[60px] shrink-0 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all",
                intlSelectedDate &&
                  format(intlSelectedDate, "yyyy-MM-dd") ===
                    format(date, "yyyy-MM-dd")
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              {formatDatePill(date, i)}
            </button>
          ))}
        </div>
      </div>

      {/* Night window */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
        <Checkbox
          id="cb-night"
          checked={nightWindow}
          onCheckedChange={(v) => {
            setNightWindow(!!v);
            if (v) setLocalTime("");
          }}
          className="mt-0.5"
        />
        <div>
          <Label
            htmlFor="cb-night"
            className="flex cursor-pointer items-center gap-1.5 text-sm font-medium"
          >
            <Moon className="h-4 w-4 text-muted-foreground" />
            Night window (2:00 – 3:00 AM IST)
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Best for US / UK / Europe — 2 AM IST is daytime for you
          </p>
        </div>
      </div>

      {/* Time picker */}
      {!nightWindow && (
        <div className="space-y-1.5">
          <Label htmlFor="cb-time">
            Preferred time{" "}
            <span className="font-normal text-muted-foreground">
              (in your local timezone)
            </span>
          </Label>
          <Input
            id="cb-time"
            type="time"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            className="min-h-[44px]"
          />
          {liveISTPreview && (
            <p className="text-xs text-muted-foreground">
              = {liveISTPreview} IST
            </p>
          )}
          {timeNotice && (
            <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {timeNotice}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="min-h-[44px] flex-1"
          onClick={() => setStep(2)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button
          className="min-h-[44px] flex-1"
          disabled={!step3BValid}
          onClick={() => setStep(4)}
        >
          Next
        </Button>
      </div>
    </div>
  );

  // ── Step 4: Confirm ────────────────────────────────────────────────────────
  const renderStep4 = () => {
    if (success) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">
              Callback requested!
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Our team will reach out to you shortly.
            </p>
          </div>
        </div>
      );
    }

    // Build summary text
    let summaryLine = "";
    if (!isInternational) {
      const dateLabel =
        selectedDate ? format(selectedDate, "EEEE, d MMMM") : "";
      const slotLabel = selectedSlot
        ? CALLBACK_SLOT_LABELS[selectedSlot]
        : "";
      const phoneDisplay = phone.trim() || "your number";
      if (selectedSlot === "asap") {
        summaryLine = `We'll call ${phoneDisplay} within 60 minutes (during working hours)`;
      } else {
        summaryLine = `We'll call ${phoneDisplay} on ${dateLabel} between ${slotLabel}`;
      }
    } else {
      const chLabel = channel ? CHANNEL_LABELS[channel] : "your account";
      const dateLabel = intlSelectedDate
        ? format(intlSelectedDate, "d MMMM")
        : "";
      if (nightWindow) {
        summaryLine = `We'll message you on ${chLabel} on ${dateLabel} at the night window (2:00 – 3:00 AM IST)`;
      } else {
        const istLabel = preferredDatetimeIST
          ? formatInIST(preferredDatetimeIST)
          : "";
        summaryLine = `We'll message you on ${chLabel} on ${dateLabel} at ${localTime} your time (${istLabel} IST)`;
      }
    }

    return (
      <div className="space-y-4">
        <StepIndicator />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Confirm your request
          </h3>
          <p className="text-sm text-muted-foreground">
            Review the details below
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-xl border border-border bg-accent/40 p-4 space-y-2.5 text-sm">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-xs font-medium text-muted-foreground w-16 shrink-0">
              Purpose
            </span>
            <span className="text-foreground font-medium">
              {intent === "owner"
                ? "List my property"
                : "I'm looking to rent"}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-xs font-medium text-muted-foreground w-16 shrink-0">
              Name
            </span>
            <span className="text-foreground">{name.trim()}</span>
          </div>
          {phone.trim() && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-medium text-muted-foreground w-16 shrink-0">
                Phone
              </span>
              <span className="text-foreground">{phone.trim()}</span>
            </div>
          )}
          <div className="mt-1 rounded-lg bg-background border border-border p-3 text-sm text-foreground leading-relaxed">
            {summaryLine}
          </div>
        </div>

        {submitError && (
          <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="min-h-[44px] flex-1"
            onClick={() => setStep(3)}
            disabled={submitting}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button
            className="min-h-[44px] flex-1"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Confirm Request"
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ── Content switcher ─────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return isInternational ? renderStep3B() : renderStep3A();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const title =
    step === 4 && success ? "" : "Request a Callback";

  const inner = (
    <div className="space-y-4 p-4">{renderContent()}</div>
  );

  // ── Dialog / Drawer ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent className="max-h-[92vh] overflow-y-auto">
          {title && (
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
          )}
          {inner}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {inner}
      </DialogContent>
    </Dialog>
  );
};

export default RequestCallbackModal;
