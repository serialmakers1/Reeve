import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus, AlertTriangle, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import Layout from "@/components/Layout";
import VisitSchedulingModal from "@/components/VisitSchedulingModal";
import type { Session } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say';
type MaritalStatus = 'single' | 'married' | 'live_in';
type OccupationType = 'salaried' | 'self_employed' | 'freelancer' | 'student' | 'retired';
type DietType = 'vegetarian' | 'non_vegetarian';
type PetType = 'none' | 'dog' | 'cat' | 'bird' | 'other';
type StayDurationType = 'less_than_10_months' | '10_to_12_months' | '1_to_2_years' | '2_to_3_years' | '3_plus_years';
type EligibilityStatus = 'pending' | 'passed' | 'disqualified';

interface EligibilityFormData {
  full_name: string;
  age: number | '';
  gender: GenderType | '';
  marital_status: MaritalStatus | '';
  occupation: OccupationType | '';
  resident_count: number | '';
  has_pets: boolean;
  pet_type: PetType;
  pet_description: string;
  diet: DietType | '';
  expected_stay: StayDurationType | '';
  is_foreign_citizen: boolean;
}

interface RejectionRule {
  condition: boolean;
  reason: string;
  message: string;
  field_hint: string;
}

interface PropertyContext {
  id: string;
  building_name: string;
  bhk: string;
  listed_rent: number;
  locality: string | null;
}

type FormMode = 'create' | 'update';
type PageView = 'loading' | 'login' | 'form' | 'passed' | 'rejected';

interface StepErrors {
  [key: string]: string;
}

const INITIAL_FORM: EligibilityFormData = {
  full_name: '',
  age: '',
  gender: '',
  marital_status: '',
  occupation: '',
  resident_count: 1,
  has_pets: false,
  pet_type: 'none',
  pet_description: '',
  diet: '',
  expected_stay: '',
  is_foreign_citizen: false,
};

function bhkLabel(bhk: string): string {
  const map: Record<string, string> = { studio: "Studio", "1BHK": "1 BHK", "2BHK": "2 BHK", "3BHK": "3 BHK", "4BHK": "4 BHK", "5BHK_plus": "5 BHK+" };
  return map[bhk] ?? bhk;
}

function formatIndianRupee(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EligibilityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const propertyIdParam = searchParams.get('property_id');

  const [session, setSession] = useState<Session | null>(null);
  const [pageView, setPageView] = useState<PageView>('loading');
  const [mode, setMode] = useState<FormMode>('create');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EligibilityFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<StepErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [existingReason, setExistingReason] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');

  // Property context for visit scheduling
  const [propertyContext, setPropertyContext] = useState<PropertyContext | null>(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [existingVisit, setExistingVisit] = useState<{ id: string; scheduled_at: string; status: string } | null>(null);

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) {
        setPageView('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load property context when property_id is present
  useEffect(() => {
    if (!propertyIdParam) return;
    const fetchProperty = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, building_name, bhk, listed_rent, locality')
        .eq('id', propertyIdParam)
        .maybeSingle();
      if (data) {
        setPropertyContext(data as PropertyContext);
      }
    };
    fetchProperty();
  }, [propertyIdParam]);

  // Load existing eligibility
  const loadExisting = useCallback(async (userId: string) => {
    setPageView('loading');
    const { data, error } = await supabase
      .from('eligibility')
      .select('status, disqualification_reason, full_name, age, gender, marital_status, occupation, resident_count, has_pets, pet_type, pet_description, diet, expected_stay, is_foreign_citizen')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      setPageView('form');
      setMode('create');
      return;
    }

    if (!data) {
      setPageView('form');
      setMode('create');
      return;
    }

    const status = data.status as EligibilityStatus;

    // Pre-fill form
    setFormData({
      full_name: data.full_name || '',
      age: data.age || '',
      gender: (data.gender as GenderType) || '',
      marital_status: (data.marital_status as MaritalStatus) || '',
      occupation: (data.occupation as OccupationType) || '',
      resident_count: data.resident_count || 1,
      has_pets: data.has_pets || false,
      pet_type: (data.pet_type as PetType) || 'none',
      pet_description: data.pet_description || '',
      diet: (data.diet as DietType) || '',
      expected_stay: (data.expected_stay as StayDurationType) || '',
      is_foreign_citizen: data.is_foreign_citizen || false,
    });

    if (status === 'passed') {
      setPageView('passed');
      setMode('update');
    } else if (status === 'pending') {
      // Pending is treated as passed for display (auto-approved)
      setPageView('passed');
      setMode('update');
    } else if (status === 'disqualified') {
      setExistingReason(data.disqualification_reason || null);
      setRejectionMessage(data.disqualification_reason || 'You are currently ineligible.');
      setPageView('rejected');
      setMode('update');
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadExisting(session.user.id);
    }
  }, [session, loadExisting]);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateStep = (s: number): boolean => {
    const errs: StepErrors = {};

    if (s === 1) {
      if (!formData.full_name || formData.full_name.trim().length < 2)
        errs.full_name = 'Full name must be at least 2 characters.';
      if (formData.age === '' || Number(formData.age) < 1)
        errs.age = 'Please enter your age.';
      else if (Number(formData.age) < 21 || Number(formData.age) > 100)
        errs.age = 'Age must be between 21 and 100.';
      if (!formData.gender) errs.gender = 'Please select your gender.';
      if (!formData.marital_status) errs.marital_status = 'Please select your marital status.';
    }

    if (s === 2) {
      if (!formData.occupation) errs.occupation = 'Please select your occupation.';
      if (formData.resident_count === '' || Number(formData.resident_count) < 1)
        errs.resident_count = 'At least 1 resident is required.';
      if (!formData.diet) errs.diet = 'Please select your diet preference.';
    }

    if (s === 3) {
      if (!formData.expected_stay) errs.expected_stay = 'Please select expected stay duration.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setAnimDir('forward');
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setAnimDir('back');
    setStep((s) => Math.max(s - 1, 1));
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    if (!session?.user?.id) return;

    setSubmitting(true);

    // Foreign citizen check — immediate disqualification
    if (formData.is_foreign_citizen) {
      const foreignPayload = {
        user_id: session.user.id,
        full_name: formData.full_name.trim(),
        age: Number(formData.age),
        gender: formData.gender as GenderType,
        marital_status: formData.marital_status as MaritalStatus,
        occupation: formData.occupation as OccupationType,
        resident_count: Number(formData.resident_count),
        has_pets: formData.has_pets,
        pet_type: formData.has_pets ? (formData.pet_type as PetType) : ('none' as PetType),
        pet_description: formData.has_pets ? formData.pet_description || null : null,
        diet: formData.diet as DietType,
        expected_stay: formData.expected_stay as StayDurationType,
        is_foreign_citizen: true,
        status: 'disqualified' as EligibilityStatus,
        disqualification_reason: 'Foreign citizens are not eligible to rent through Reeve at this time.',
        reviewed_at: new Date().toISOString(),
      };

      let dbError = false;
      if (mode === 'create') {
        const { error } = await supabase.from('eligibility').insert(foreignPayload);
        if (error) dbError = true;
      } else {
        const { error } = await supabase.from('eligibility').update(foreignPayload).eq('user_id', session.user.id);
        if (error) dbError = true;
      }

      await supabase.from('profiles').upsert({
        user_id: session.user.id,
        occupation: formData.occupation as OccupationType,
        marital_status: formData.marital_status as MaritalStatus,
        diet: formData.diet as DietType,
        has_pets: formData.has_pets,
        is_foreign_citizen: true,
        pet_details: formData.has_pets ? formData.pet_description || null : null,
      }, { onConflict: 'user_id' });

      setSubmitting(false);

      if (dbError) {
        toast({ title: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }

      posthog.capture("eligibility_completed", {
        result: "disqualified",
        disqualification_reason: "foreign_citizen",
      });
      setRejectionMessage('Foreign citizens are not eligible to rent through Reeve at this time.');
      setMode('update');
      setPageView('rejected');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Run rejection rules
    const rejectionRules: RejectionRule[] = [
      {
        condition: Number(formData.age) < 21,
        reason: 'Applicant is under 21 years of age.',
        message: 'We require all primary applicants to be at least 21 years old. If your age details were entered incorrectly, you can update them below.',
        field_hint: 'age',
      },
      {
        condition: formData.occupation === 'student',
        reason: 'Students are not eligible as primary applicants.',
        message: 'We are currently unable to accept student applicants as the primary tenant. A working co-applicant may be considered in future. You can update your occupation details below if entered incorrectly.',
        field_hint: 'occupation',
      },
      {
        condition: formData.expected_stay === 'less_than_10_months',
        reason: 'Expected stay is less than the minimum tenancy of 10 months.',
        message: 'Unfortunately, we require a minimum stay of 10 months. We\'d love to have you when your plans align!',
        field_hint: 'expected_stay',
      },
    ];

    const rejection = rejectionRules.find((r) => r.condition);

    const status: EligibilityStatus = rejection ? 'disqualified' : 'passed';
    const disqualification_reason = rejection ? rejection.reason : null;
    const reviewed_at = new Date().toISOString();

    const payload = {
      user_id: session.user.id,
      full_name: formData.full_name.trim(),
      age: Number(formData.age),
      gender: formData.gender as GenderType,
      marital_status: formData.marital_status as MaritalStatus,
      occupation: formData.occupation as OccupationType,
      resident_count: Number(formData.resident_count),
      has_pets: formData.has_pets,
      pet_type: formData.has_pets ? (formData.pet_type as PetType) : ('none' as PetType),
      pet_description: formData.has_pets ? formData.pet_description || null : null,
      diet: formData.diet as DietType,
      expected_stay: formData.expected_stay as StayDurationType,
      is_foreign_citizen: formData.is_foreign_citizen,
      status,
      disqualification_reason,
      reviewed_at,
    };

    let dbError = false;

    if (mode === 'create') {
      const { error } = await supabase.from('eligibility').insert(payload);
      if (error) dbError = true;
    } else {
      const { error } = await supabase.from('eligibility').update(payload).eq('user_id', session.user.id);
      if (error) dbError = true;
    }

    if (dbError) {
      setSubmitting(false);
      toast({ title: 'Something went wrong. Please try again.', variant: 'destructive' });
      return;
    }

    // Sync to profiles
    await supabase.from('profiles').upsert({
      user_id: session.user.id,
      occupation: formData.occupation as OccupationType,
      marital_status: formData.marital_status as MaritalStatus,
      diet: formData.diet as DietType,
      has_pets: formData.has_pets,
      is_foreign_citizen: formData.is_foreign_citizen,
      pet_details: formData.has_pets ? formData.pet_description || null : null,
    }, { onConflict: 'user_id' });

    setSubmitting(false);

    if (rejection) {
      setRejectionMessage(rejection.message);
      setMode('update');
      setPageView('rejected');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      posthog.capture("eligibility_completed", {
        result: "passed",
        occupation: formData.occupation,
        expected_stay: formData.expected_stay,
        resident_count: formData.resident_count,
      });
      setPageView('passed');
      setMode('update');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const startEditing = () => {
    setPageView('form');
    setRejectionMessage(null);
    setStep(1);
  };

  // ─── Update helper ─────────────────────────────────────────────────────────

  const updateField = <K extends keyof EligibilityFormData>(key: K, value: EligibilityFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const RadioCard = ({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
        selected
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-border bg-background text-foreground hover:border-muted-foreground/40'
      }`}
    >
      {label}
    </button>
  );

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="mt-1 text-sm text-destructive">{errors[field]}</p> : null;

  // ─── Page views ────────────────────────────────────────────────────────────

  if (pageView === 'loading') {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (pageView === 'login') {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-bold text-foreground">Eligibility Check</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You need to be logged in to complete eligibility.
          </p>
          <Link to={`/login?returnTo=${encodeURIComponent('/eligibility' + (returnTo ? `?returnTo=${returnTo}` : '') + (propertyIdParam ? `${returnTo ? '&' : '?'}property_id=${propertyIdParam}` : ''))}`}>
            <Button className="mt-6 min-h-[44px]">Log In</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // ─── Rejected View ─────────────────────────────────────────────────────────

  if (pageView === 'rejected') {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            You don't qualify at this time
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {rejectionMessage || 'Based on your responses, you don\'t meet the eligibility criteria for our platform at this time.'}
          </p>

          <button
            onClick={startEditing}
            className="mt-5 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Think something's wrong? Edit your answers →
          </button>

          <div className="mt-8">
            <Link to="/search">
              <Button className="min-h-[44px] w-full">Back to Browse</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Passed View ───────────────────────────────────────────────────────────

  if (pageView === 'passed') {
    const criteria = [
      '✓ Stay duration',
      '✓ Resident count',
      '✓ Citizenship',
      '✓ Occupation',
    ];

    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-12">
          {/* Passed badge */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-green-600 animate-in fade-in duration-500">
              Passed ✓
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Great news! You meet the basic eligibility criteria for Reeve.
            </p>
          </div>

          {/* Criteria pills */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {criteria.map((c) => (
              <Badge
                key={c}
                variant="secondary"
                className="bg-green-50 text-green-700 border-green-200 text-xs px-3 py-1"
              >
                {c}
              </Badge>
            ))}
          </div>

          {/* Property context card */}
          {propertyContext && (
            <Card className="mt-8 border-border">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  You were checking eligibility for
                </p>
                <p className="text-sm font-semibold text-card-foreground">
                  {bhkLabel(propertyContext.bhk)} in {propertyContext.building_name}
                  {propertyContext.locality && `, ${propertyContext.locality}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Rent: {formatIndianRupee(propertyContext.listed_rent)}/month
                </p>
              </CardContent>
            </Card>
          )}

          {/* CTAs */}
          <div className="mt-8 space-y-3">
            {propertyContext ? (
              <>
                <Button
                  className="min-h-[44px] w-full"
                  onClick={() => setVisitModalOpen(true)}
                >
                  Schedule a Visit
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full"
                  onClick={() => navigate(`/dashboard/applications/new?property_id=${propertyContext.id}`)}
                >
                  Apply Now
                </Button>
                <button
                  onClick={() => navigate('/search')}
                  className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                >
                  Browse other properties
                </button>
              </>
            ) : (
              <>
                <Button
                  className="min-h-[44px] w-full"
                  onClick={() => navigate('/search')}
                >
                  Browse Properties
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </>
            )}
          </div>

          {/* Edit link */}
          <button
            onClick={startEditing}
            className="mt-6 block w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Need to update your answers? Edit eligibility →
          </button>
        </div>

        {/* Visit scheduling modal */}
        {propertyContext && session?.user?.id && (
          <VisitSchedulingModal
            open={visitModalOpen}
            onOpenChange={setVisitModalOpen}
            propertyId={propertyContext.id}
            userId={session.user.id}
            buildingName={propertyContext.building_name}
            bhk={propertyContext.bhk}
            existingVisit={existingVisit}
            onVisitChanged={() => {
              // Refresh existing visit state
              if (session?.user?.id && propertyContext) {
                supabase
                  .from('visits')
                  .select('id, scheduled_at, status')
                  .eq('property_id', propertyContext.id)
                  .eq('tenant_id', session.user.id)
                  .in('status', ['scheduled', 'confirmed'])
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                  .then(({ data }) => {
                    setExistingVisit(data ?? null);
                  });
              }
            }}
          />
        )}
      </Layout>
    );
  }

  // ─── Form view ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="mx-auto max-w-lg px-4 py-6 pb-12">
        {/* Back to search */}
        <Link
          to="/search"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Search
        </Link>

        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground">Eligibility Check</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete this quick questionnaire to start shortlisting properties.
        </p>

        {/* Editing banner */}
        {mode === 'update' && !rejectionMessage && (
          <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            You are editing your existing eligibility submission.
          </div>
        )}

        {/* Rejection banner */}
        {rejectionMessage && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">{rejectionMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mt-6 mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Step {step} of 3</span>
          <span className="text-xs text-muted-foreground">{Math.round((step / 3) * 100)}%</span>
        </div>
        <Progress value={(step / 3) * 100} className="h-2" />

        {/* Form card */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-card-foreground">Tell us about yourself</h2>

              {/* Full Name */}
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1.5"
                />
                <FieldError field="full_name" />
              </div>

              {/* Age */}
              <div>
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  value={formData.age}
                  onChange={(e) => updateField('age', e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 25"
                  className="mt-1.5"
                  min={21}
                  max={100}
                />
                <FieldError field="age" />
              </div>

              {/* Gender */}
              <div>
                <Label>Gender *</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {([
                    { v: 'male' as GenderType, l: 'Male' },
                    { v: 'female' as GenderType, l: 'Female' },
                    { v: 'other' as GenderType, l: 'Other' },
                  ] as const).map((o) => (
                    <RadioCard
                      key={o.v}
                      selected={formData.gender === o.v}
                      label={o.l}
                      onClick={() => updateField('gender', o.v)}
                    />
                  ))}
                </div>
                <FieldError field="gender" />
              </div>

              {/* Marital Status */}
              <div>
                <Label>Marital Status *</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {([
                    { v: 'single' as MaritalStatus, l: 'Single' },
                    { v: 'married' as MaritalStatus, l: 'Married' },
                    { v: 'live_in' as MaritalStatus, l: 'Live-in' },
                  ] as const).map((o) => (
                    <RadioCard
                      key={o.v}
                      selected={formData.marital_status === o.v}
                      label={o.l}
                      onClick={() => updateField('marital_status', o.v)}
                    />
                  ))}
                </div>
                <FieldError field="marital_status" />
              </div>
            </div>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-card-foreground">Who will be living in the apartment?</h2>

              {/* Occupation */}
              <div>
                <Label>Occupation *</Label>
                <Select
                  value={formData.occupation || undefined}
                  onValueChange={(v) => updateField('occupation', v as OccupationType)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select occupation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaried">Salaried</SelectItem>
                    <SelectItem value="self_employed">Self-employed</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError field="occupation" />
              </div>

              {/* Resident count stepper */}
              <div>
                <Label>Number of Residents *</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const curr = Number(formData.resident_count) || 1;
                      if (curr > 1) updateField('resident_count', curr - 1);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2rem] text-center text-lg font-semibold text-foreground">
                    {formData.resident_count || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const curr = Number(formData.resident_count) || 1;
                      updateField('resident_count', curr + 1);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <FieldError field="resident_count" />
              </div>

              {/* Pets */}
              <div>
                <Label>Do you have pets? *</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <RadioCard
                    selected={formData.has_pets === true}
                    label="Yes"
                    onClick={() => updateField('has_pets', true)}
                  />
                  <RadioCard
                    selected={formData.has_pets === false}
                    label="No"
                    onClick={() => {
                      updateField('has_pets', false);
                      updateField('pet_type', 'none');
                      updateField('pet_description', '');
                    }}
                  />
                </div>
              </div>

              {/* Pet Type — conditional */}
              {formData.has_pets && (
                <>
                  <div>
                    <Label>Pet Type <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select
                      value={formData.pet_type === 'none' ? undefined : formData.pet_type}
                      onValueChange={(v) => updateField('pet_type', v as PetType)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select pet type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dog">Dog</SelectItem>
                        <SelectItem value="cat">Cat</SelectItem>
                        <SelectItem value="bird">Bird</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pet_desc">Pet Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      id="pet_desc"
                      value={formData.pet_description}
                      onChange={(e) => updateField('pet_description', e.target.value)}
                      placeholder='e.g. "Labrador, vaccinated"'
                      className="mt-1.5"
                    />
                  </div>
                </>
              )}

              {/* Diet */}
              <div>
                <Label>Diet Preference *</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <RadioCard
                    selected={formData.diet === 'vegetarian'}
                    label="Vegetarian"
                    onClick={() => updateField('diet', 'vegetarian')}
                  />
                  <RadioCard
                    selected={formData.diet === 'non_vegetarian'}
                    label="Non-Vegetarian"
                    onClick={() => updateField('diet', 'non_vegetarian')}
                  />
                </div>
                <FieldError field="diet" />
              </div>
            </div>
          )}

          {/* ─── STEP 3 ─── */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-card-foreground">How long are you planning to stay?</h2>

              {/* Expected Stay */}
              <div>
                <Label>Expected Stay Duration *</Label>
                <div className="mt-1.5 grid grid-cols-1 gap-2">
                  {([
                    { v: 'less_than_10_months' as StayDurationType, l: 'Less than 10 months' },
                    { v: '10_to_12_months' as StayDurationType, l: '10–12 months' },
                    { v: '1_to_2_years' as StayDurationType, l: '1–2 years' },
                    { v: '2_to_3_years' as StayDurationType, l: '2–3 years' },
                    { v: '3_plus_years' as StayDurationType, l: '3+ years' },
                  ] as const).map((o) => (
                    <RadioCard
                      key={o.v}
                      selected={formData.expected_stay === o.v}
                      label={o.l}
                      onClick={() => updateField('expected_stay', o.v)}
                    />
                  ))}
                </div>
                <FieldError field="expected_stay" />
              </div>

              {/* Foreign Citizen */}
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <Checkbox
                  id="foreign_citizen"
                  checked={formData.is_foreign_citizen}
                  onCheckedChange={(checked) => updateField('is_foreign_citizen', checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="foreign_citizen" className="text-sm text-foreground cursor-pointer leading-relaxed">
                  I am a Foreign Citizen
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="outline" onClick={goBack} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button onClick={goNext} className="gap-1.5">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                'Submit'
              )}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
