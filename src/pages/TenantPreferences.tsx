import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2, Minus, Plus } from "lucide-react";
import posthog from "posthog-js";
import { toast as sonnerToast } from "sonner";

import Layout from "@/components/Layout";
import VerificationGate from "@/components/VerificationGate";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// D-172, D-177: rental preferences page. Single scrolling page, submit-on-click.

type Gender = "male" | "female" | "other";
type MaritalStatus = "single" | "married" | "family" | "live_in";
type Occupation = "salaried" | "self_employed" | "student" | "retired" | "other";
type Diet = "veg" | "non_veg";
type StayDuration =
  | "less_than_6_months"
  | "6_to_11_months"
  | "1_year"
  | "2_years"
  | "3_years_plus"
  | "flexible";
type PetType = "dog" | "cat" | "other";

interface FormState {
  preferred_city: string;
  preferred_localities_text: string;
  move_in_by: Date | null;
  age: string;
  gender: Gender | "";
  marital_status: MaritalStatus | "";
  occupation: Occupation | "";
  occupation_other: string;
  diet_preference: Diet | "";
  is_foreign_citizen: boolean;
  number_of_occupants: number;
  expected_stay_duration: StayDuration | "";
  has_pets: boolean;
  pet_types: PetType[];
}

const INITIAL_FORM: FormState = {
  preferred_city: "",
  preferred_localities_text: "",
  move_in_by: null,
  age: "",
  gender: "",
  marital_status: "",
  occupation: "",
  occupation_other: "",
  diet_preference: "",
  is_foreign_citizen: false,
  number_of_occupants: 1,
  expected_stay_duration: "",
  has_pets: false,
  pet_types: [],
};

const STAY_OPTIONS: { value: StayDuration; label: string }[] = [
  { value: "less_than_6_months", label: "Less than 6 months" },
  { value: "6_to_11_months", label: "6–11 months" },
  { value: "1_year", label: "1 year" },
  { value: "2_years", label: "2 years" },
  { value: "3_years_plus", label: "3+ years" },
  { value: "flexible", label: "Flexible" },
];

const MAX_MOVE_IN_DAYS = 90;

function parseLocalities(text: string): string[] | null {
  const items = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function ToggleButton({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[44px] rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all",
        selected
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border bg-background text-foreground hover:border-muted-foreground/40",
      )}
    >
      {label}
    </button>
  );
}

function TenantPreferencesInner() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const existingRowRef = useRef<boolean>(false);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("rental_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        existingRowRef.current = true;
        setForm({
          preferred_city: data.preferred_city ?? "",
          preferred_localities_text: (data.preferred_localities ?? []).join(", "),
          move_in_by: data.move_in_by ? new Date(data.move_in_by) : null,
          age: data.age != null ? String(data.age) : "",
          gender: (data.gender as Gender) ?? "",
          marital_status: (data.marital_status as MaritalStatus) ?? "",
          occupation: (data.occupation as Occupation) ?? "",
          occupation_other: data.occupation_other ?? "",
          diet_preference: (data.diet_preference as Diet) ?? "",
          is_foreign_citizen: !!data.is_foreign_citizen,
          number_of_occupants: data.number_of_occupants ?? 1,
          expected_stay_duration: (data.expected_stay_duration as StayDuration) ?? "",
          has_pets: !!data.has_pets,
          pet_types: (data.pet_types ?? []) as PetType[],
        });
      }
      setLoading(false);
    })();
  }, [authLoading, user?.id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const ageNum = form.age === "" ? null : Number(form.age);
  const ageValid = ageNum !== null && ageNum >= 16 && ageNum <= 100;

  const requiredComplete = useMemo(() => {
    let n = 0;
    if (ageValid) n++;
    if (form.gender) n++;
    if (form.number_of_occupants >= 1) n++;
    if (form.occupation) n++;
    if (form.expected_stay_duration) n++;
    return n;
  }, [ageValid, form.gender, form.number_of_occupants, form.occupation, form.expected_stay_duration]);

  const canSave = requiredComplete === 5 && !saving;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const moveInMax = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + MAX_MOVE_IN_DAYS);
    return d;
  }, [today]);

  const handleAgeChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 3);
    update("age", digits);
    if (digits === "") {
      setAgeError(null);
      return;
    }
    const n = Number(digits);
    setAgeError(n < 16 || n > 100 ? "Age must be between 16 and 100." : null);
  };

  const togglePet = (pet: PetType) => {
    update(
      "pet_types",
      form.pet_types.includes(pet)
        ? form.pet_types.filter((p) => p !== pet)
        : [...form.pet_types, pet],
    );
  };

  const handleSave = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      preferred_city: form.preferred_city.trim() || null,
      preferred_localities: parseLocalities(form.preferred_localities_text),
      move_in_by: form.move_in_by ? format(form.move_in_by, "yyyy-MM-dd") : null,
      age: ageNum,
      gender: form.gender || null,
      marital_status: form.marital_status || null,
      occupation: form.occupation || null,
      occupation_other:
        form.occupation === "other" ? form.occupation_other.trim() || null : null,
      diet_preference: form.diet_preference || null,
      is_foreign_citizen: form.is_foreign_citizen,
      number_of_occupants: form.number_of_occupants,
      expected_stay_duration: form.expected_stay_duration || null,
      has_pets: form.has_pets,
      pet_types: form.has_pets && form.pet_types.length > 0 ? form.pet_types : null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("rental_preferences")
      .upsert(payload, { onConflict: "user_id" });

    setSaving(false);

    if (error) {
      console.error("rental_preferences upsert failed:", error);
      sonnerToast("Failed to save. Please try again.");
      return;
    }

    const fieldsFilled = Object.entries(payload).filter(
      ([k, v]) => k !== "user_id" && v !== null && !(Array.isArray(v) && v.length === 0),
    ).length;

    posthog?.capture("rental_preferences_saved", {
      is_update: existingRowRef.current,
      fields_filled: fieldsFilled,
    });
    existingRowRef.current = true;
    sonnerToast("Preferences saved");
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const showOccupationOther = form.occupation === "other";

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-6 pb-32">
        <Link
          to="/tenant-dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Tenant Dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-foreground">Rental Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is shared with a property owner only when you send them a contact request.
        </p>

        {/* ── Section 1 — Location & Timing ── */}
        <section className="mt-8 rounded-xl border bg-card p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Location & Timing</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Helps owners understand where you're looking and when you need to move.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferred_city">Preferred city</Label>
            <Input
              id="preferred_city"
              value={form.preferred_city}
              onChange={(e) => update("preferred_city", e.target.value)}
              placeholder="e.g. Bangalore"
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferred_localities">Preferred localities</Label>
            <Input
              id="preferred_localities"
              value={form.preferred_localities_text}
              onChange={(e) => update("preferred_localities_text", e.target.value)}
              placeholder="e.g. HSR Layout, Koramangala"
              className="min-h-[44px]"
            />
            <p className="text-xs text-muted-foreground">Separate multiple localities with commas.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Move-in by</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full min-h-[44px] justify-start text-left font-normal",
                    !form.move_in_by && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.move_in_by ? format(form.move_in_by, "EEEE, d MMMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.move_in_by ?? undefined}
                  onSelect={(d) => {
                    update("move_in_by", d ?? null);
                    setDatePickerOpen(false);
                  }}
                  disabled={(d) => d < today || d > moveInMax}
                  className="pointer-events-auto rounded-lg border border-border p-3"
                />
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* ── Section 2 — About You ── */}
        <section className="mt-6 rounded-xl border bg-card p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">About You</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Owners want to know who'll be living in their home. This helps them make a confident decision when you reach out.
            </p>
          </div>

          <div>
            <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              min={16}
              max={100}
              value={form.age}
              onChange={(e) => handleAgeChange(e.target.value)}
              placeholder="e.g. 28"
              className="mt-1.5 min-h-[44px]"
            />
            {ageError && <p className="mt-1 text-sm text-destructive">{ageError}</p>}
          </div>

          <div>
            <Label>Gender <span className="text-destructive">*</span></Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(["male", "female", "other"] as const).map((g) => (
                <ToggleButton
                  key={g}
                  selected={form.gender === g}
                  label={g === "male" ? "Male" : g === "female" ? "Female" : "Other"}
                  onClick={() => update("gender", g)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Marital status</Label>
            <Select
              value={form.marital_status || undefined}
              onValueChange={(v) => update("marital_status", v as MaritalStatus)}
            >
              <SelectTrigger className="mt-1.5 min-h-[44px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="live_in">Live-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Occupation <span className="text-destructive">*</span></Label>
            <Select
              value={form.occupation || undefined}
              onValueChange={(v) => update("occupation", v as Occupation)}
            >
              <SelectTrigger className="mt-1.5 min-h-[44px]">
                <SelectValue placeholder="Select occupation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salaried">Salaried</SelectItem>
                <SelectItem value="self_employed">Self-employed</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showOccupationOther && (
            <div>
              <Label htmlFor="occupation_other">Please specify</Label>
              <Input
                id="occupation_other"
                value={form.occupation_other}
                onChange={(e) => update("occupation_other", e.target.value)}
                placeholder="e.g. Homemaker, Consultant"
                className="mt-1.5 min-h-[44px]"
              />
            </div>
          )}

          <div>
            <Label>Diet preference</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <ToggleButton
                selected={form.diet_preference === "veg"}
                label="Veg"
                onClick={() => update("diet_preference", "veg")}
              />
              <ToggleButton
                selected={form.diet_preference === "non_veg"}
                label="Non-veg"
                onClick={() => update("diet_preference", "non_veg")}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <Checkbox
              id="foreign_national"
              checked={form.is_foreign_citizen}
              onCheckedChange={(v) => update("is_foreign_citizen", v === true)}
              className="mt-0.5"
            />
            <label htmlFor="foreign_national" className="text-sm text-foreground cursor-pointer leading-relaxed">
              I am a foreign national
            </label>
          </div>
        </section>

        {/* ── Section 3 — Stay Details ── */}
        <section className="mt-6 rounded-xl border bg-card p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Stay Details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Helps owners plan for how long their property will be occupied.
            </p>
          </div>

          <div>
            <Label>Number of residents <span className="text-destructive">*</span></Label>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => update("number_of_occupants", Math.max(1, form.number_of_occupants - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                aria-label="Decrease residents"
              >
                <Minus className="h-4 w-4" />
              </button>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={form.number_of_occupants}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ""));
                  update("number_of_occupants", Math.max(1, Math.min(20, Number.isFinite(n) && n > 0 ? n : 1)));
                }}
                className="min-h-[44px] w-20 text-center"
              />
              <button
                type="button"
                onClick={() => update("number_of_occupants", Math.min(20, form.number_of_occupants + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                aria-label="Increase residents"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <Label>Expected duration of stay <span className="text-destructive">*</span></Label>
            <Select
              value={form.expected_stay_duration || undefined}
              onValueChange={(v) => update("expected_stay_duration", v as StayDuration)}
            >
              <SelectTrigger className="mt-1.5 min-h-[44px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {STAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="has_pets" className="cursor-pointer">Do you have pets?</Label>
            </div>
            <Switch
              id="has_pets"
              checked={form.has_pets}
              onCheckedChange={(v) => {
                update("has_pets", v);
                if (!v) update("pet_types", []);
              }}
            />
          </div>

          {form.has_pets && (
            <div className="pl-1 space-y-2">
              <Label>Pet types</Label>
              <div className="space-y-2">
                {(["dog", "cat", "other"] as const).map((p) => (
                  <label key={p} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={form.pet_types.includes(p)}
                      onCheckedChange={() => togglePet(p)}
                    />
                    <span className="text-sm text-foreground capitalize">
                      {p === "other" ? "Other" : p === "dog" ? "Dog" : "Cat"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <span className={cn(
            "text-sm",
            requiredComplete === 5 ? "text-foreground font-medium" : "text-muted-foreground",
          )}>
            {requiredComplete} of 5 required fields complete
          </span>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="min-h-[44px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save preferences"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

export default function TenantPreferences() {
  return (
    <VerificationGate returnTo="/tenant-dashboard/preferences">
      <Layout>
        <TenantPreferencesInner />
      </Layout>
    </VerificationGate>
  );
}
