import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2, Minus, Plus } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import Layout from "@/components/Layout";
import VerificationGate from "@/components/VerificationGate";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getSafeReturnTo } from "@/lib/authUtils";
import {
  PreferenceMode,
  BuyingPurpose,
  PurchaseTimeline,
  FundingStage,
  Gender,
  MaritalStatus,
  Occupation,
  Diet,
  StayDuration,
  PetType,
  PREFERENCE_MODE_OPTIONS,
  BUYING_PURPOSE_OPTIONS,
  PURCHASE_TIMELINE_OPTIONS,
  FUNDING_STAGE_OPTIONS,
  OCCUPATION_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  DIET_OPTIONS,
  STAY_OPTIONS,
  PET_TYPE_OPTIONS,
  isRentModeActive,
  isBuyModeActive,
  isRentComplete,
  isBuyComplete,
} from "@/lib/preferenceHelpers";

interface FormState {
  preference_mode: PreferenceMode;
  age: string;
  occupation: Occupation | "";
  occupation_other: string;
  is_foreign_citizen: boolean | null;
  gender: Gender | "";
  number_of_occupants: number;
  expected_stay_duration: StayDuration | "";
  buying_purpose: BuyingPurpose | "";
  purchase_timeline: PurchaseTimeline | "";
  funding_stage: FundingStage | "";
  move_in_by: Date | null;
  marital_status: MaritalStatus | "";
  diet_preference: Diet | "";
  has_pets: boolean;
  pet_types: PetType[];
}

const INITIAL_FORM: FormState = {
  preference_mode: "rent",
  age: "",
  occupation: "",
  occupation_other: "",
  is_foreign_citizen: null,
  gender: "",
  number_of_occupants: 1,
  expected_stay_duration: "",
  buying_purpose: "",
  purchase_timeline: "",
  funding_stage: "",
  move_in_by: null,
  marital_status: "",
  diet_preference: "",
  has_pets: false,
  pet_types: [],
};

const MAX_MOVE_IN_DAYS = 90;

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
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useRequireAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const existingRowRef = useRef<boolean>(false);
  const modeParamAppliedRef = useRef<boolean>(false);

  // Fallback "" preserves the existing "no navigation on invalid value" semantics.
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"), "");

  useEffect(() => {
    if (authLoading || !user?.id) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("rental_preferences")
        .select("preference_mode, age, occupation, occupation_other, is_foreign_citizen, gender, number_of_occupants, expected_stay_duration, buying_purpose, purchase_timeline, funding_stage, move_in_by, marital_status, diet_preference, has_pets, pet_types")
        .eq("user_id", user.id)
        .maybeSingle();

      const modeParam = searchParams.get("mode");
      const validModeParam: PreferenceMode | null =
        modeParam === "rent" || modeParam === "buy" ? modeParam : null;

      if (data) {
        existingRowRef.current = true;
        const savedMode: PreferenceMode = (data.preference_mode as PreferenceMode) ?? "rent";

        let localMode = savedMode;
        if (!modeParamAppliedRef.current && validModeParam) {
          modeParamAppliedRef.current = true;
          if (savedMode === "rent" && validModeParam === "buy") localMode = "both";
          else if (savedMode === "buy" && validModeParam === "rent") localMode = "both";
          // both stays both, matching mode is no-op
        }

        setForm({
          preference_mode: localMode,
          age: data.age != null ? String(data.age) : "",
          occupation: (data.occupation as Occupation) ?? "",
          occupation_other: data.occupation_other ?? "",
          is_foreign_citizen: data.is_foreign_citizen !== undefined ? data.is_foreign_citizen : null,
          gender: (data.gender as Gender) ?? "",
          number_of_occupants: data.number_of_occupants ?? 1,
          expected_stay_duration: (data.expected_stay_duration as StayDuration) ?? "",
          buying_purpose: (data.buying_purpose as BuyingPurpose) ?? "",
          purchase_timeline: (data.purchase_timeline as PurchaseTimeline) ?? "",
          funding_stage: (data.funding_stage as FundingStage) ?? "",
          move_in_by: data.move_in_by ? new Date(data.move_in_by) : null,
          marital_status: (data.marital_status as MaritalStatus) ?? "",
          diet_preference: (data.diet_preference as Diet) ?? "",
          has_pets: !!data.has_pets,
          pet_types: (data.pet_types ?? []) as PetType[],
        });
      } else {
        // No row — apply contextual mode once
        if (!modeParamAppliedRef.current && validModeParam) {
          modeParamAppliedRef.current = true;
          setForm((prev) => ({ ...prev, preference_mode: validModeParam }));
        }
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const ageNum = form.age === "" ? null : Number(form.age);
  const ageValid = ageNum !== null && ageNum >= 16 && ageNum <= 100;

  const rentActive = isRentModeActive(form.preference_mode);
  const buyActive = isBuyModeActive(form.preference_mode);

  const requiredTotal = form.preference_mode === "both" ? 9 : 6;

  const requiredComplete = useMemo(() => {
    let n = 0;
    // Shared (3)
    if (ageValid) n++;
    if (form.occupation) n++;
    if (form.is_foreign_citizen !== null) n++;
    // Rent (3)
    if (rentActive) {
      if (form.gender) n++;
      if (form.number_of_occupants >= 1) n++;
      if (form.expected_stay_duration) n++;
    }
    // Buy (3)
    if (buyActive) {
      if (form.buying_purpose) n++;
      if (form.purchase_timeline) n++;
      if (form.funding_stage) n++;
    }
    return n;
  }, [
    ageValid,
    form.occupation,
    form.is_foreign_citizen,
    form.gender,
    form.number_of_occupants,
    form.expected_stay_duration,
    form.buying_purpose,
    form.purchase_timeline,
    form.funding_stage,
    rentActive,
    buyActive,
  ]);

  const canSave = requiredComplete === requiredTotal && !saving;

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

    const sharedFields = {
      preference_mode: form.preference_mode,
      age: ageNum,
      occupation: form.occupation || null,
      occupation_other: form.occupation === "other" ? form.occupation_other.trim() || null : null,
      is_foreign_citizen: form.is_foreign_citizen,
    };

    const rentFields = {
      gender: form.gender || null,
      number_of_occupants: form.number_of_occupants,
      expected_stay_duration: form.expected_stay_duration || null,
      move_in_by: form.move_in_by ? format(form.move_in_by, "yyyy-MM-dd") : null,
      marital_status: form.marital_status || null,
      diet_preference: form.diet_preference || null,
      has_pets: form.has_pets,
      pet_types: form.has_pets && form.pet_types.length > 0 ? form.pet_types : null,
    };

    const buyFields = {
      buying_purpose: form.buying_purpose || null,
      purchase_timeline: form.purchase_timeline || null,
      funding_stage: form.funding_stage || null,
    };

    let error: { message: string } | null = null;

    if (!existingRowRef.current) {
      // New row — insert with mode-scoped fields
      const payload: Record<string, unknown> = { user_id: user.id, ...sharedFields };
      if (rentActive) Object.assign(payload, rentFields);
      if (buyActive) Object.assign(payload, buyFields);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase as any).from("rental_preferences").insert(payload);
      error = res.error;
      if (!error) existingRowRef.current = true;
    } else {
      // Existing row — update only mode-scoped fields (never touch opposing mode)
      const payload: Record<string, unknown> = { ...sharedFields };
      if (rentActive) Object.assign(payload, rentFields);
      if (buyActive) Object.assign(payload, buyFields);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase as any)
        .from("rental_preferences")
        .update(payload)
        .eq("user_id", user.id);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      console.error("rental_preferences save failed:", error);
      sonnerToast("Failed to save. Please try again.");
      return;
    }

    sonnerToast("Preferences saved");

    if (returnTo) {
      navigate(returnTo);
    }
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
          <ArrowLeft className="h-4 w-4" /> My Dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-foreground">My Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your preferences are shared with the lister when you send a contact request.
        </p>

        {/* ── Section 1 — What are you looking for ── */}
        <section className="mt-8 rounded-xl border bg-card p-5 space-y-5">
          <div>
            <Label>What are you looking for? <span className="text-destructive">*</span></Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {PREFERENCE_MODE_OPTIONS.map((opt) => (
                <ToggleButton
                  key={opt.value}
                  selected={form.preference_mode === opt.value}
                  label={opt.label}
                  onClick={() => update("preference_mode", opt.value)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 2 — Shared required fields ── */}
        <section className="mt-6 rounded-xl border bg-card p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">About You</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Listers want to know who'll be moving in. This helps them make a confident decision.
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
            <Label>Occupation <span className="text-destructive">*</span></Label>
            <Select
              value={form.occupation || undefined}
              onValueChange={(v) => update("occupation", v as Occupation)}
            >
              <SelectTrigger className="mt-1.5 min-h-[44px]">
                <SelectValue placeholder="Select occupation" />
              </SelectTrigger>
              <SelectContent>
                {OCCUPATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
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
            <Label>Are you a foreign national? <span className="text-destructive">*</span></Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <ToggleButton
                selected={form.is_foreign_citizen === true}
                label="Yes"
                onClick={() => update("is_foreign_citizen", true)}
              />
              <ToggleButton
                selected={form.is_foreign_citizen === false}
                label="No"
                onClick={() => update("is_foreign_citizen", false)}
              />
            </div>
          </div>
        </section>

        {/* ── Section 3 — Rent required fields ── */}
        {rentActive && (
          <section className="mt-6 rounded-xl border bg-card p-5 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Rental Details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Helps owners plan for who'll be living in their home and for how long.
              </p>
            </div>

            <div>
              <Label>Gender <span className="text-destructive">*</span></Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <ToggleButton
                    key={g.value}
                    selected={form.gender === g.value}
                    label={g.label}
                    onClick={() => update("gender", g.value)}
                  />
                ))}
              </div>
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
          </section>
        )}

        {/* ── Section 4 — Buy required fields ── */}
        {buyActive && (
          <section className="mt-6 rounded-xl border bg-card p-5 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Buying Details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Helps listers understand your buying intent and timeline.
              </p>
            </div>

            <div>
              <Label>What's the purpose of buying? <span className="text-destructive">*</span></Label>
              <Select
                value={form.buying_purpose || undefined}
                onValueChange={(v) => update("buying_purpose", v as BuyingPurpose)}
              >
                <SelectTrigger className="mt-1.5 min-h-[44px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {BUYING_PURPOSE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Purchase timeline <span className="text-destructive">*</span></Label>
              <Select
                value={form.purchase_timeline || undefined}
                onValueChange={(v) => update("purchase_timeline", v as PurchaseTimeline)}
              >
                <SelectTrigger className="mt-1.5 min-h-[44px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_TIMELINE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Funding stage <span className="text-destructive">*</span></Label>
              <Select
                value={form.funding_stage || undefined}
                onValueChange={(v) => update("funding_stage", v as FundingStage)}
              >
                <SelectTrigger className="mt-1.5 min-h-[44px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_STAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        )}

        {/* ── Section 5 — Optional rental details ── */}
        {rentActive && (
          <section className="mt-6 rounded-xl border bg-card p-5 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">More details (optional)</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Helps owners find the right fit for their property and community.
              </p>
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
                  {MARITAL_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Diet preference</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {DIET_OPTIONS.map((d) => (
                  <ToggleButton
                    key={d.value}
                    selected={form.diet_preference === d.value}
                    label={d.label}
                    onClick={() => update("diet_preference", d.value)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <Label htmlFor="has_pets" className="cursor-pointer">Do you have pets?</Label>
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
                  {PET_TYPE_OPTIONS.map((p) => (
                    <label key={p.value} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={form.pet_types.includes(p.value)}
                        onCheckedChange={() => togglePet(p.value)}
                      />
                      <span className="text-sm text-foreground">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <span className={cn(
            "text-sm",
            requiredComplete === requiredTotal ? "text-foreground font-medium" : "text-muted-foreground",
          )}>
            {requiredComplete} of {requiredTotal} required fields complete
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
      <Layout hideBottomNav>
        <TenantPreferencesInner />
      </Layout>
    </VerificationGate>
  );
}
