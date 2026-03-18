import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyInfo {
  id: string;
  building_name: string;
  bhk: string;
  listed_rent: number;
  locality: string | null;
}

interface EligibilityData {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  marital_status: string;
  occupation: string;
  expected_stay: string;
  resident_count: number;
  has_pets: boolean;
  pet_type: string | null;
  diet: string | null;
  is_foreign_citizen: boolean;
}

interface Resident {
  id?: string;
  full_name: string;
  age: number | "";
  gender: string;
  occupation: string;
  marital_status: string;
  relationship: string;
}

interface AppNote {
  note_type: string;
  description: string;
  photo_url: string | null;
}

interface UploadedFile {
  name: string;
  size: number;
  url: string;
  document_type: string;
}

interface StepErrors {
  [key: string]: string;
}

type ApplicationStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bhkLabel(bhk: string): string {
  const map: Record<string, string> = {
    studio: "Studio", "1BHK": "1 BHK", "2BHK": "2 BHK",
    "3BHK": "3 BHK", "4BHK": "4 BHK", "5BHK_plus": "5 BHK+",
  };
  return map[bhk] ?? bhk;
}

function formatRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const OCCUPATION_OPTIONS = [
  { value: "salaried", label: "Salaried" },
  { value: "self_employed", label: "Self-employed" },
  { value: "freelancer", label: "Freelancer" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "live_in", label: "Live-in" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "Spouse / Partner", label: "Spouse / Partner" },
  { value: "Parent", label: "Parent" },
  { value: "Child", label: "Child" },
  { value: "Sibling", label: "Sibling" },
  { value: "other_specify", label: "Other (specify)" },
];

const STAY_LABELS: Record<string, string> = {
  "10_to_12_months": "10–12 months",
  "1_to_2_years": "1–2 years",
  "2_to_3_years": "2–3 years",
  "3_plus_years": "3+ years",
  less_than_10_months: "Less than 10 months",
};

const CIBIL_OPTIONS = [
  { value: "below_550", label: "Below 550", note: null },
  { value: "550_to_649", label: "550 – 649", note: null },
  { value: "650_to_749", label: "650 – 749", note: null },
  { value: "750_to_900", label: "750 – 900", note: "Excellent" },
  { value: "no_credit_history", label: "No credit history", note: "Common for first-time borrowers" },
  { value: "not_sure", label: "Not sure", note: "That's okay, you can check at CIBIL.com" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewApplicationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get("property_id");
  const resumeId = searchParams.get("resume");
  const { session, user, loading: authLoading } = useRequireAuth();

  // Core state
  const [pageLoading, setPageLoading] = useState(true);
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  // Set only when the tenant is resuming a pre-existing draft (not for fresh or reapplication)
  const [existingApplicationId, setExistingApplicationId] = useState<string | null>(null);
  const [step, setStep] = useState<ApplicationStep>(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(false);
  const [alreadySubmittedBlock, setAlreadySubmittedBlock] = useState(false);

  // Step 2 — Residents
  const [residents, setResidents] = useState<Resident[]>([]);

  // Step 3 — Employment
  const [employerName, setEmployerName] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState<number | "">("");
  const [salarySlips, setSalarySlips] = useState<UploadedFile[]>([]);
  const [itrFile, setItrFile] = useState<UploadedFile | null>(null);
  const [bankStatement, setBankStatement] = useState<UploadedFile | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<UploadedFile | null>(null);
  const [panFile, setPanFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Step 4 — CIBIL
  const [cibilRange, setCibilRange] = useState("");

  // Step 5 — Background
  const [crimeAttest, setCrimeAttest] = useState(false);

  // Step 6 — Rent
  const [rentChoice, setRentChoice] = useState<"accept" | "counter">("accept");
  const [proposedRent, setProposedRent] = useState<number | "">("");

  // Step 7 — Notes & Move-in
  const [noteAdd, setNoteAdd] = useState("");
  const [noteRemove, setNoteRemove] = useState("");
  const [noteIssue, setNoteIssue] = useState("");
  const [moveInAsap, setMoveInAsap] = useState<boolean | null>(null);
  const [preferredMoveInDate, setPreferredMoveInDate] = useState<string>("");

  // Step 8 — Terms
  const [feeTermsAccepted, setFeeTermsAccepted] = useState(false);
  const [dpdpaAccepted, setDpdpaAccepted] = useState(false);

  // ─── Init: fetch property, eligibility, draft ──────────────────────────────

  useEffect(() => {
    if (authLoading || !user) return;
    if (!propertyId && !resumeId) {
      navigate("/search");
      return;
    }
    initPage();
  }, [authLoading, user, propertyId, resumeId]);

  const initPage = useCallback(async () => {
    if (!user) return;
    setPageLoading(true);

    if (resumeId) {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) { setPageLoading(false); return; }

      const { data: draft } = await supabase
        .from("applications")
        .select("*")
        .eq("id", resumeId)
        .eq("tenant_id", userId)
        .eq("status", "draft")
        .maybeSingle();

      if (!draft) {
        toast({ title: "Draft not found", variant: "destructive" });
        navigate("/dashboard/applications");
        setPageLoading(false);
        return;
      }

      const { data: resumeProp } = await supabase
        .from("properties")
        .select("id, building_name, bhk, listed_rent, locality")
        .eq("id", draft.property_id)
        .maybeSingle();

      if (!resumeProp) {
        toast({ title: "Property not found", variant: "destructive" });
        navigate("/search");
        setPageLoading(false);
        return;
      }
      setProperty(resumeProp as PropertyInfo);

      const { data: resumeElig } = await supabase
        .from("eligibility")
        .select("id, full_name, age, gender, marital_status, occupation, expected_stay, resident_count, has_pets, pet_type, diet, is_foreign_citizen")
        .eq("user_id", userId)
        .eq("status", "passed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!resumeElig) {
        toast({ title: "Please complete eligibility first", variant: "destructive" });
        navigate(`/eligibility?property_id=${draft.property_id}`);
        return;
      }
      setEligibility(resumeElig as EligibilityData);

      setApplicationId(draft.id);
      setExistingApplicationId(draft.id);
      loadDraft(draft as unknown as Record<string, unknown>, resumeProp as PropertyInfo);
      setResumeBanner(true);
      setPageLoading(false);
      return;
    }

    if (!propertyId) {
      navigate("/search");
      setPageLoading(false);
      return;
    }

    // Fetch property
    const { data: prop } = await supabase
      .from("properties")
      .select("id, building_name, bhk, listed_rent, locality")
      .eq("id", propertyId)
      .maybeSingle();

    if (!prop) {
      toast({ title: "Property not found", variant: "destructive" });
      navigate("/search");
      return;
    }
    setProperty(prop as PropertyInfo);

    // Fetch eligibility
    const { data: elig } = await supabase
      .from("eligibility")
      .select("id, full_name, age, gender, marital_status, occupation, expected_stay, resident_count, has_pets, pet_type, diet, is_foreign_citizen")
      .eq("user_id", user.id)
      .eq("status", "passed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!elig) {
      toast({ title: "Please complete eligibility first", variant: "destructive" });
      navigate(`/eligibility?property_id=${propertyId}`);
      return;
    }
    setEligibility(elig as EligibilityData);

    // Check for ANY existing application (not just drafts)
    const { data: existing } = await supabase
      .from("applications")
      .select("*, application_residents(id)")
      .eq("property_id", propertyId)
      .eq("tenant_id", user.id)
      .maybeSingle();

    const NON_DRAFT_STATUSES = [
      "submitted", "platform_review", "sent_to_owner",
      "owner_accepted", "owner_countered", "payment_pending",
      "kyc_pending", "kyc_passed", "agreement_pending", "lease_active",
    ];

    if (existing && existing.status === "draft") {
      // Genuine draft — resume it
      setApplicationId(existing.id);
      setExistingApplicationId(existing.id);
      loadDraft(existing as Record<string, unknown>, prop as PropertyInfo);
      setResumeBanner(true);
    } else if (existing && NON_DRAFT_STATUSES.includes(existing.status)) {
      // Active in-flight application — block
      setProperty(prop as PropertyInfo);
      setAlreadySubmittedBlock(true);
      setPageLoading(false);
      return;
    } else {
      // Fresh start OR reapplication after withdrawal/rejection — always INSERT a new draft
      // (existingApplicationId intentionally left null so submit uses INSERT path)
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const userId = freshSession?.user?.id;
      if (!userId) { setPageLoading(false); return; }

      // Second guard: check if a draft already exists (race condition safety)
      const { data: existingDraft } = await supabase
        .from('applications')
        .select('id')
        .eq('property_id', propertyId)
        .eq('tenant_id', userId)
        .eq('status', 'draft')
        .maybeSingle();

      if (existingDraft) {
        // Draft already exists — resume it, don't create another
        setApplicationId(existingDraft.id);
        setExistingApplicationId(existingDraft.id);
        const { data: fullDraft } = await supabase
          .from('applications')
          .select('*, application_residents(*)')
          .eq('id', existingDraft.id)
          .maybeSingle();
        if (fullDraft) loadDraft(fullDraft as Record<string, unknown>, prop as PropertyInfo);
        setResumeBanner(true);
        setPageLoading(false);
        return;
      }

      const { data: newApp, error } = await supabase
        .from("applications")
        .insert({
          property_id: propertyId,
          tenant_id: user.id,
          status: "draft",
          proposed_rent: (prop as PropertyInfo).listed_rent,
          eligibility_id: elig.id,
        })
        .select("id")
        .maybeSingle();

      if (error || !newApp) {
        toast({ title: "Could not start application", variant: "destructive" });
        navigate(`/property/${propertyId}`);
        return;
      }
      setApplicationId(newApp.id);
      setExistingApplicationId(newApp.id);
      setProposedRent((prop as PropertyInfo).listed_rent);
    }

    setPageLoading(false);
  }, [user, propertyId, resumeId, navigate]);

  const loadDraft = async (draft: Record<string, unknown>, prop: PropertyInfo) => {
    // Pre-fill from draft
    if (draft.employer_name) setEmployerName(draft.employer_name as string);
    if (draft.monthly_income) setMonthlyIncome(draft.monthly_income as number);
    if (draft.cibil_range) setCibilRange(draft.cibil_range as string);
    if (draft.crime_record_self_attest) setCrimeAttest(true);
    if (draft.proposed_rent) {
      const pr = draft.proposed_rent as number;
      setProposedRent(pr);
      setRentChoice(pr === prop.listed_rent ? "accept" : "counter");
    } else {
      setProposedRent(prop.listed_rent);
    }
    if (draft.service_fee_terms_confirmed) setFeeTermsAccepted(true);
    if (draft.move_in_asap === true) { setMoveInAsap(true); setPreferredMoveInDate(""); }
    else if (draft.move_in_asap === false) { setMoveInAsap(false); if (draft.preferred_move_in_date) setPreferredMoveInDate(draft.preferred_move_in_date as string); }

    // Load residents
    const { data: resData } = await supabase
      .from("application_residents")
      .select("id, full_name, age, gender, occupation, marital_status, relationship")
      .eq("application_id", draft.id as string);
    if (resData && resData.length > 0) {
      // Filter out primary applicant row (relationship = 'self')
      setResidents(
        resData
          .filter((r) => r.relationship !== "self")
          .map((r) => ({
            id: r.id,
            full_name: r.full_name,
            age: r.age,
            gender: r.gender || "",
            occupation: r.occupation || "",
            marital_status: r.marital_status || "",
            relationship: r.relationship,
          }))
      );
    }

    // Load uploaded documents
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_name, file_size_bytes, file_url, document_type")
      .eq("application_id", draft.id as string)
      .eq("category", "tenant_kyc");
    if (docs) {
      const slips: UploadedFile[] = [];
      docs.forEach((d) => {
        const f: UploadedFile = {
          name: d.file_name,
          size: d.file_size_bytes || 0,
          url: d.file_url,
          document_type: d.document_type,
        };
        if (d.document_type === "salary_slip") slips.push(f);
        else if (d.document_type === "itr") setItrFile(f);
        else if (d.document_type === "bank_statement") setBankStatement(f);
        else if (d.document_type === "aadhaar") setAadhaarFile(f);
        else if (d.document_type === "pan") setPanFile(f);
      });
      if (slips.length) setSalarySlips(slips);
    }

    // Load notes
    const { data: notes } = await supabase
      .from("application_notes")
      .select("note_type, description")
      .eq("application_id", draft.id as string);
    if (notes) {
      notes.forEach((n) => {
        if (n.note_type === "request_add") setNoteAdd(n.description);
        if (n.note_type === "request_remove") setNoteRemove(n.description);
        if (n.note_type === "report_issue") setNoteIssue(n.description);
      });
    }

    // Determine furthest step — resume to next uncompleted step
    let furthest: ApplicationStep = 1;
    if (resData && resData.length > 0) furthest = 2;
    if (draft.employer_name) furthest = 3;
    if (draft.cibil_range) furthest = 4;
    if (draft.crime_record_self_attest) furthest = 5;
    if (draft.proposed_rent && (draft.proposed_rent as number) !== prop.listed_rent) furthest = 6;
    if (draft.property_notes_text) furthest = 7;
    // Go to the next step after the furthest completed
    setStep(Math.min(furthest + 1, 8) as ApplicationStep);
  };

  // ─── Save helpers ──────────────────────────────────────────────────────────

  const saveApplicationField = async (fields: Record<string, unknown>) => {
    if (!applicationId) return false;
    const { error } = await supabase
      .from("applications")
      .update(fields)
      .eq("id", applicationId);
    return !error;
  };

  // ─── File Upload ───────────────────────────────────────────────────────────

  const uploadFile = async (
    file: File,
    documentType: string
  ): Promise<UploadedFile | null> => {
    if (!user || !applicationId) return null;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large. Maximum 10MB.", variant: "destructive" });
      return null;
    }

    setUploading(documentType);
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${user.id}/${applicationId}/${documentType}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("tenant-documents")
      .upload(path, file);

    if (uploadError) {
      toast({ title: "Upload failed. Please try again.", variant: "destructive" });
      setUploading(null);
      return null;
    }

    // Since bucket is private, store the path — access via signed URL
    const fileUrl = path;

    // Insert into documents table
    type DocType = "aadhaar" | "pan" | "salary_slip" | "employment_letter" | "itr" | "bank_statement" | "passport" | "visa" | "frro_registration" | "sale_deed" | "property_papers" | "society_noc" | "condition_report" | "agreement" | "receipt" | "inspection_report" | "other";
    type DocCategory = "tenant_kyc" | "owner_kyc" | "agreement" | "inspection" | "condition_report" | "payment_receipt" | "maintenance" | "lead";

    await supabase.from("documents").insert({
      owner_user_id: user.id,
      uploaded_by: user.id,
      application_id: applicationId,
      document_type: documentType as DocType,
      category: "tenant_kyc" as DocCategory,
      file_name: file.name,
      file_size_bytes: file.size,
      file_url: fileUrl,
      mime_type: file.type,
    });

    setUploading(null);
    return { name: file.name, size: file.size, url: fileUrl, document_type: documentType };
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (s: ApplicationStep): boolean => {
    const errs: StepErrors = {};

    if (s === 2) {
      // resident_count from eligibility includes the primary applicant
      // so required co-residents = resident_count - 1
      const requiredCoResidents = (eligibility?.resident_count ?? 1) - 1;
      if (residents.length < requiredCoResidents) {
        errs['residents_count'] = `You indicated ${eligibility?.resident_count} residents. Please add ${requiredCoResidents - residents.length} more co-resident${requiredCoResidents - residents.length > 1 ? 's' : ''}.`;
      }
      residents.forEach((r, i) => {
        if (!r.full_name.trim()) errs[`res_${i}_name`] = "Name required";
        if (r.age === "" || Number(r.age) < 0 || Number(r.age) > 100) errs[`res_${i}_age`] = "Please enter a valid age between 0 and 100";
        if (!r.gender) errs[`res_${i}_gender`] = "Gender required";
        if (!r.occupation) errs[`res_${i}_occ`] = "Occupation required";
        if (!r.marital_status) errs[`res_${i}_marital`] = "Marital status required";
        if (!r.relationship.trim()) errs[`res_${i}_rel`] = "Relationship required";
        if (r.relationship === "other_specify") errs[`res_${i}_rel`] = "Please specify the relationship";
      });
    }

    if (s === 3) {
      if (!employerName.trim()) errs.employer_name = "Employer name is required";
      if (monthlyIncome === "" || Number(monthlyIncome) <= 0)
        errs.monthly_income = "Please enter your monthly income";
      if (!aadhaarFile) errs.aadhaar = "Please upload your Aadhaar card";
      if (!panFile) errs.pan = "Please upload your PAN card";
      if (salarySlips.length === 0) errs.salary_slips = "Please upload at least one salary slip";
    }

    if (s === 4) {
      if (!cibilRange) errs.cibil_range = "Please select your credit score range";
    }

    if (s === 5) {
      if (!crimeAttest) errs.crime_attest = "Please confirm your background declaration to proceed";
    }

    if (s === 6) {
      if (rentChoice === "counter" && (proposedRent === "" || Number(proposedRent) <= 0))
        errs.proposed_rent = "Please enter your proposed rent";
    }

    if (s === 7) {
      if (moveInAsap === null) errs.move_in = "Please select your preferred move-in date";
      if (moveInAsap === false && !preferredMoveInDate) errs.move_in = "Please select your preferred move-in date";
    }

    if (s === 8) {
      if (!feeTermsAccepted) errs.fee_terms = "Please accept the service fee terms";
      if (!dpdpaAccepted) errs.dpdpa = "Please provide DPDPA consent";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Step Navigation ───────────────────────────────────────────────────────

  const goNext = async () => {
    if (!validate(step)) return;
    setSaving(true);

    let success = true;

    if (step === 2) {
      // Save residents
      if (applicationId) {
        await supabase.from("application_residents").delete().eq("application_id", applicationId);
        // Insert primary applicant
        if (eligibility) {
          await supabase.from("application_residents").insert({
            application_id: applicationId,
            full_name: eligibility.full_name,
            age: eligibility.age,
            gender: eligibility.gender as "male" | "female" | "other" | "prefer_not_to_say",
            occupation: eligibility.occupation as "salaried" | "self_employed" | "freelancer" | "student" | "retired",
            relationship: "self",
          });
        }
        // Insert additional residents
        if (residents.length > 0) {
          const rows = residents.map((r) => ({
            application_id: applicationId,
            full_name: r.full_name.trim(),
            age: Number(r.age),
            gender: (r.gender || null) as "male" | "female" | "other" | "prefer_not_to_say" | null,
            occupation: (r.occupation || null) as "salaried" | "self_employed" | "freelancer" | "student" | "retired" | null,
            marital_status: (r.marital_status || null) as "single" | "married" | "live_in" | null,
            relationship: r.relationship.trim(),
          }));
          await supabase.from("application_residents").insert(rows);
        }
      }
    }

    if (step === 3) {
      success = await saveApplicationField({
        employer_name: employerName.trim(),
        monthly_income: Number(monthlyIncome),
      });
    }

    if (step === 4) {
      success = await saveApplicationField({
        cibil_range: cibilRange,
      });
    }

    if (step === 5) {
      success = await saveApplicationField({
        crime_record_self_attest: true,
      });
    }

    if (step === 6) {
      const rent = rentChoice === "accept" ? property!.listed_rent : Number(proposedRent);
      success = await saveApplicationField({ proposed_rent: rent });
    }

    if (step === 7) {
      // Save move-in preference
      await saveApplicationField({
        move_in_asap: moveInAsap ?? false,
        preferred_move_in_date: moveInAsap ? null : (preferredMoveInDate || null),
      });
      // Save notes
      if (applicationId) {
        await supabase.from("application_notes").delete().eq("application_id", applicationId);
        const notes: { application_id: string; note_type: string; description: string }[] = [];
        if (noteAdd.trim()) notes.push({ application_id: applicationId, note_type: "request_add", description: noteAdd.trim() });
        if (noteRemove.trim()) notes.push({ application_id: applicationId, note_type: "request_remove", description: noteRemove.trim() });
        if (noteIssue.trim()) notes.push({ application_id: applicationId, note_type: "report_issue", description: noteIssue.trim() });
        if (notes.length > 0) {
          await supabase.from("application_notes").insert(notes);
        }
        // Save a summary to property_notes_text for quick reference
        await saveApplicationField({ property_notes_text: [noteAdd, noteRemove, noteIssue].filter(Boolean).join(" | ") || null });
      }
    }

    setSaving(false);
    if (!success) {
      toast({ title: "Could not save. Please try again.", variant: "destructive" });
      return;
    }

    if (step < 8) {
      setStep((step + 1) as ApplicationStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((step - 1) as ApplicationStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ─── Final Submit ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate(8)) return;
    setSaving(true);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const userId = currentSession?.user?.id;

    const rent = rentChoice === "accept" ? property!.listed_rent : Number(proposedRent);
    const now = new Date().toISOString();

    try {
      if (existingApplicationId) {
        // Resuming a saved draft — UPDATE that row only if it is still a draft
        const { error } = await supabase
          .from("applications")
          .update({
            service_fee_terms_confirmed: true,
            status: "submitted",
            submitted_at: now,
            updated_at: now,
            tds_applicable: rent > 50000,
          })
          .eq("id", existingApplicationId)
          .eq("status", "draft"); // safety: only update if still a draft
        if (error) throw error;
      } else {
        // Fresh submission or reapplication — INSERT a new submitted row
        // DO NOT set previous_application_id or attempt_number — DB trigger handles them
        const { error } = await supabase
          .from("applications")
          .insert([{
            property_id: propertyId,
            tenant_id: userId,
            eligibility_id: eligibility?.id,
            employer_name: employerName.trim() || null,
            monthly_income: monthlyIncome !== "" ? Number(monthlyIncome) : null,
            cibil_range: (cibilRange || null) as "550_to_649" | "650_to_749" | "750_to_900" | "below_550" | "no_credit_history" | "not_sure" | null,
            crime_record_self_attest: crimeAttest || null,
            proposed_rent: rent,
            property_notes_text: [noteAdd, noteRemove, noteIssue].filter(Boolean).join(" | ") || null,
            service_fee_terms_confirmed: true,
            status: "submitted",
            submitted_at: now,
            created_at: now,
            updated_at: now,
            tds_applicable: rent > 50000,
          }]);
        if (error) throw error;
      }

      setSaving(false);
      toast({ title: "Application submitted successfully." });
      navigate("/dashboard/applications");
    } catch (error: any) {
      setSaving(false);
      console.error("Application submit error:", error);
      const msg = error?.message ?? "";
      if (msg.includes("Maximum applications")) {
        toast({ title: "You have reached the maximum applications for this property.", variant: "destructive" });
      } else if (msg.includes("Reapplication not allowed until")) {
        const date = msg.split("until ")[1];
        toast({ title: `You can reapply after ${date ? new Date(date).toLocaleDateString("en-IN") : "the cooldown period"}.`, variant: "destructive" });
      } else {
        toast({ title: "Submission failed. Please try again.", variant: "destructive" });
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!applicationId) return;
    setSaving(true);
    const rent = rentChoice === "accept" ? property!.listed_rent : (proposedRent !== "" ? Number(proposedRent) : property!.listed_rent);
    const success = await saveApplicationField({
      employer_name: employerName.trim() || null,
      monthly_income: monthlyIncome !== "" ? Number(monthlyIncome) : null,
      cibil_range: cibilRange || null,
      crime_record_self_attest: crimeAttest ? true : null,
      proposed_rent: rent,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!success) {
      toast({ title: "Could not save draft. Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Draft saved. You can continue from My Applications." });
    navigate("/dashboard/applications");
  };

  // ─── Resident helpers ──────────────────────────────────────────────────────

  const addResident = () => {
    setResidents([...residents, { full_name: "", age: "", gender: "", occupation: "", marital_status: "", relationship: "" }]);
  };

  const updateResident = (idx: number, field: keyof Resident, value: string | number) => {
    setResidents((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`res_${idx}_${field === "full_name" ? "name" : field === "relationship" ? "rel" : field === "occupation" ? "occ" : field}`];
      return next;
    });
  };

  const removeResident = (idx: number) => {
    setResidents((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (authLoading || pageLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!property || !eligibility) {
    // Show already-submitted block if applicable
    if (alreadySubmittedBlock && property) {
      return (
        <Layout>
          <div className="mx-auto max-w-md px-4 py-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-10 w-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Application Already Submitted</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              You have already submitted an application for this property.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button className="min-h-[44px] w-full" onClick={() => navigate("/dashboard/applications")}>
                View My Applications
              </Button>
              <Button variant="outline" className="min-h-[44px] w-full" onClick={() => navigate(-1)}>
                ← Go Back
              </Button>
            </div>
          </div>
        </Layout>
      );
    }
    return null;
  }

  // ─── Success Screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in zoom-in-50 duration-500">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Application Submitted!</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Your application for {bhkLabel(property.bhk)} in {property.building_name} has been submitted.
            We'll review it and get back to you within 24–48 hours.
          </p>

          {/* Timeline */}
          <div className="mt-8 text-left max-w-xs mx-auto space-y-4">
            <p className="text-sm font-semibold text-foreground">What happens next</p>
            {[
              "Reeve reviews your application",
              "Your application is sent to the owner",
              "Owner accepts, rejects, or makes a counter offer",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button className="min-h-[44px] w-full" onClick={() => navigate("/dashboard/applications")}>
              View My Applications
            </Button>
            <Button variant="outline" className="min-h-[44px] w-full" onClick={() => navigate("/search")}>
              Browse More Properties
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Property Summary Strip ────────────────────────────────────────────────

  const PropertyStrip = () => (
    <div className="rounded-lg border border-border bg-card px-4 py-2.5 flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">
        {bhkLabel(property.bhk)} in {property.building_name}
      </span>
      <span className="text-sm font-semibold text-primary">
        {formatRupee(property.listed_rent)}/mo
      </span>
    </div>
  );

  const progressPct = (step / 8) * 100;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="mt-1 text-sm text-destructive">{errors[field]}</p> : null;

  // ─── Step Renders ──────────────────────────────────────────────────────────

  const renderStep1 = () => {
    const items = [
      { label: "Full name", value: eligibility.full_name },
      { label: "Age", value: String(eligibility.age) },
      { label: "Gender", value: eligibility.gender?.replace(/_/g, " ") },
      { label: "Marital status", value: eligibility.marital_status?.replace(/_/g, " ") },
      { label: "Occupation", value: eligibility.occupation?.replace(/_/g, " ") },
      { label: "Expected stay", value: STAY_LABELS[eligibility.expected_stay] || eligibility.expected_stay },
      { label: "Residents", value: String(eligibility.resident_count) },
      { label: "Pets", value: eligibility.has_pets ? `Yes — ${eligibility.pet_type}` : "No" },
      { label: "Diet", value: eligibility.diet?.replace(/_/g, " ") || "Not specified" },
      { label: "Citizenship", value: eligibility.is_foreign_citizen ? "Foreign citizen" : "Indian" },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Your Eligibility Profile</h2>
          <p className="text-sm text-muted-foreground">
            This information will be shared with the property owner as part of your application
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground capitalize">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          This information is pre-filled from your eligibility questionnaire. To make changes,{" "}
          <Link to="/eligibility" className="text-primary underline underline-offset-2">
            update your eligibility profile
          </Link>.
        </p>
      </div>
    );
  };

  const renderStep2 = () => {
    const maxResidents = eligibility.resident_count;
    const totalResidents = 1 + residents.length; // primary + additional
    const canAdd = totalResidents < maxResidents;

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Who will be living in the apartment?</h2>
          <p className="text-sm text-muted-foreground">Add details for all residents including yourself</p>
        </div>

        {/* Primary applicant */}
        <Card className="border-primary/30 bg-accent/30">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground text-xs">Primary Applicant</Badge>
            </div>
            <p className="text-sm font-medium text-foreground">{eligibility.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {eligibility.age} yrs • {eligibility.gender?.replace(/_/g, " ")} • {eligibility.occupation?.replace(/_/g, " ")}
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          You indicated <span className="font-semibold">{maxResidents}</span> resident{maxResidents > 1 ? "s" : ""} in your eligibility profile
        </p>

        {/* Additional residents */}
        {residents.map((r, idx) => (
          <Card key={idx} className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Resident {idx + 2}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeResident(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Full name *</Label>
                  <Input
                    value={r.full_name}
                    onChange={(e) => updateResident(idx, "full_name", e.target.value)}
                    placeholder="Full name"
                    className="mt-1"
                  />
                  <FieldError field={`res_${idx}_name`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Age *</Label>
                    <Input
                      type="number"
                      value={r.age}
                      onChange={(e) => updateResident(idx, "age", e.target.value ? Number(e.target.value) : "")}
                      placeholder="Age"
                      className="mt-1"
                      min={0}
                      max={100}
                    />
                    <FieldError field={`res_${idx}_age`} />
                  </div>
                  <div>
                    <Label className="text-xs">Gender *</Label>
                    <Select value={r.gender} onValueChange={(v) => updateResident(idx, "gender", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError field={`res_${idx}_gender`} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Occupation *</Label>
                  <Select value={r.occupation} onValueChange={(v) => updateResident(idx, "occupation", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {OCCUPATION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError field={`res_${idx}_occ`} />
                </div>
                <div>
                  <Label className="text-xs">Marital status *</Label>
                  <Select value={r.marital_status} onValueChange={(v) => { updateResident(idx, "marital_status", v); setErrors((p) => { const n = { ...p }; delete n[`res_${idx}_marital`]; return n; }); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError field={`res_${idx}_marital`} />
                </div>
                <div>
                  <Label className="text-xs">Relationship to you *</Label>
                  <Select
                    value={r.relationship.startsWith("Other: ") ? "other_specify" : RELATIONSHIP_OPTIONS.some(o => o.value === r.relationship) ? r.relationship : r.relationship ? "other_specify" : ""}
                    onValueChange={(v) => {
                      if (v === "other_specify") {
                        updateResident(idx, "relationship", "other_specify");
                      } else {
                        updateResident(idx, "relationship", v);
                      }
                      setErrors((p) => { const n = { ...p }; delete n[`res_${idx}_rel`]; return n; });
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(r.relationship === "other_specify" || (r.relationship.startsWith("Other: "))) && (
                    <div className="mt-2">
                      <Label className="text-xs">Please specify *</Label>
                      <Input
                        value={r.relationship.startsWith("Other: ") ? r.relationship.replace("Other: ", "") : ""}
                        onChange={(e) => updateResident(idx, "relationship", e.target.value ? `Other: ${e.target.value}` : "other_specify")}
                        placeholder="e.g. Cousin, Friend"
                        className="mt-1"
                      />
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mt-1">
                        ⚠ Additional documents for KYC and income verification will be required for this co-resident.
                      </p>
                    </div>
                  )}
                  <FieldError field={`res_${idx}_rel`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {canAdd ? (
          <Button variant="outline" className="min-h-[44px] w-full" onClick={addResident}>
            <Plus className="mr-2 h-4 w-4" /> Add Resident
          </Button>
        ) : (
          <p className="text-xs text-center text-muted-foreground">Maximum residents added</p>
        )}
        <FieldError field="residents_count" />
      </div>
    );
  };

  const renderStep3 = () => {
    const minIncome = property.listed_rent * 2.5;
    const incomeOk = monthlyIncome !== "" && Number(monthlyIncome) >= minIncome;
    const incomeLow = monthlyIncome !== "" && Number(monthlyIncome) > 0 && Number(monthlyIncome) < minIncome;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
      const files = e.target.files;
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        const result = await uploadFile(files[i], docType);
        if (result) {
          if (docType === "salary_slip") {
            setSalarySlips((prev) => [...prev, result]);
          } else if (docType === "itr") {
            setItrFile(result);
          } else if (docType === "bank_statement") {
            setBankStatement(result);
          } else if (docType === "aadhaar") {
            setAadhaarFile(result);
          } else if (docType === "pan") {
            setPanFile(result);
          }
        }
      }
      e.target.value = "";
    };

    const handleRemoveFile = async (docType: string, file: UploadedFile, fileIndex?: number) => {
      setRemoving(`${docType}_${fileIndex ?? 0}`);
      try {
        // Delete from storage
        const { error: storageErr } = await supabase.storage
          .from("tenant-documents")
          .remove([file.url]);

        // Delete from documents table
        const { error: dbErr } = await supabase
          .from("documents")
          .delete()
          .eq("application_id", applicationId!)
          .eq("document_type", docType as "aadhaar" | "pan" | "salary_slip" | "employment_letter" | "itr" | "bank_statement" | "passport" | "visa" | "frro_registration" | "sale_deed" | "property_papers" | "society_noc" | "condition_report" | "agreement" | "receipt" | "inspection_report" | "other")
          .eq("file_name", file.name);

        if (storageErr || dbErr) {
          toast({ title: "Could not remove file. Please try again.", variant: "destructive" });
          setRemoving(null);
          return;
        }

        // Reset state
        if (docType === "salary_slip") {
          setSalarySlips((prev) => prev.filter((_, i) => i !== fileIndex));
        } else if (docType === "itr") {
          setItrFile(null);
        } else if (docType === "bank_statement") {
          setBankStatement(null);
        } else if (docType === "aadhaar") {
          setAadhaarFile(null);
        } else if (docType === "pan") {
          setPanFile(null);
        }
      } catch {
        toast({ title: "Could not remove file. Please try again.", variant: "destructive" });
      }
      setRemoving(null);
    };

    const FileUploadField = ({
      label,
      required,
      docType,
      files,
      multiple,
      maxFiles,
      acceptPdfOnly,
      helperText,
      errorField,
    }: {
      label: string;
      required?: boolean;
      docType: string;
      files: UploadedFile[];
      multiple?: boolean;
      maxFiles?: number;
      acceptPdfOnly?: boolean;
      helperText?: string;
      errorField?: string;
    }) => {
      const inputRef = useRef<HTMLInputElement>(null);
      const canUpload = !maxFiles || files.length < maxFiles;

      return (
        <div className="space-y-2">
          <Label className="text-sm">
            {label} {required ? "*" : <span className="text-muted-foreground">(optional)</span>}
          </Label>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <FileText className="h-4 w-4 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
              </div>
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                disabled={removing === `${docType}_${i}`}
                onClick={() => handleRemoveFile(docType, f, i)}
              >
                {removing === `${docType}_${i}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <X className="mr-1 h-3 w-3" /> Remove
                  </>
                )}
              </Button>
            </div>
          ))}
          {canUpload && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={acceptPdfOnly ? ".pdf" : ".pdf,.jpg,.jpeg,.png"}
                multiple={multiple}
                className="hidden"
                onChange={(e) => handleFileUpload(e, docType)}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] w-full"
                disabled={uploading === docType}
                onClick={() => inputRef.current?.click()}
              >
                {uploading === docType ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Upload</>
                )}
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground">{helperText || "PDF, JPG, PNG — max 10MB"}</p>
          {errorField && <FieldError field={errorField} />}
        </div>
      );
    };

    return (
      <div className="space-y-5">
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
          <span className="text-blue-500 text-base mt-0.5">🔒</span>
          <p className="text-sm text-blue-700">
            Your documents are collected for identity and income verification only. 
            They will never be shared with property owners or any third party.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground">Employment & Income Details</h2>
          <p className="text-sm text-muted-foreground">This helps the owner assess your financial profile</p>
        </div>

        <div>
          <Label className="text-sm">Employer / Business name *</Label>
          <Input
            value={employerName}
            onChange={(e) => { setEmployerName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.employer_name; return n; }); }}
            placeholder="Company or business name"
            className="mt-1"
          />
          <FieldError field="employer_name" />
        </div>

        <div>
          <Label className="text-sm">Monthly income *</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              value={monthlyIncome}
              onChange={(e) => { setMonthlyIncome(e.target.value ? Number(e.target.value) : ""); setErrors((p) => { const n = { ...p }; delete n.monthly_income; return n; }); }}
              placeholder="0"
              className="pl-7"
              min={0}
            />
          </div>
          <FieldError field="monthly_income" />
          {incomeOk && (
            <p className="mt-1 flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> Meets income requirement
            </p>
          )}
          {incomeLow && (
            <p className="mt-1 flex items-center gap-1 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Note: Our minimum income requirement is {formatRupee(minIncome)}/month (2.5× the rent). Applications below this threshold may not be forwarded to the owner.
            </p>
          )}
        </div>

        <div className="space-y-4 pt-2">
          <FileUploadField
            label="Aadhaar Card"
            required
            docType="aadhaar"
            files={aadhaarFile ? [aadhaarFile] : []}
            maxFiles={1}
            acceptPdfOnly
            helperText="PDF — max 10MB"
            errorField="aadhaar"
          />
          <FileUploadField
            label="PAN Card"
            required
            docType="pan"
            files={panFile ? [panFile] : []}
            maxFiles={1}
            acceptPdfOnly
            helperText="PDF — max 10MB"
            errorField="pan"
          />
          <FileUploadField
            label="Income Proof (Salary slips (last 3 months) / Latest ITR)"
            required
            docType="salary_slip"
            files={salarySlips}
            multiple
            maxFiles={3}
            errorField="salary_slips"
          />
          <FileUploadField
            label="ITR (Income Tax Return)"
            docType="itr"
            files={itrFile ? [itrFile] : []}
            maxFiles={1}
          />
          <FileUploadField
            label="Bank statement (last 3 months)"
            docType="bank_statement"
            files={bankStatement ? [bankStatement] : []}
            maxFiles={1}
          />
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Your Credit Score</h2>
        <p className="text-sm text-muted-foreground">Self-declared credit score range</p>
      </div>
      <div className="space-y-3">
        {CIBIL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setCibilRange(opt.value); setErrors((p) => { const n = { ...p }; delete n.cibil_range; return n; }); }}
            className={`w-full min-h-[44px] rounded-lg border-2 px-4 py-3 text-left transition-all ${
              cibilRange === opt.value
                ? "border-primary bg-accent"
                : "border-border bg-card hover:border-muted-foreground/40"
            }`}
          >
            <span className="text-sm font-medium text-foreground">{opt.label}</span>
            {opt.value === "750_to_900" && cibilRange === opt.value && (
              <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">Excellent</Badge>
            )}
            {opt.note && (
              <p className="text-xs text-muted-foreground mt-0.5">{opt.note}</p>
            )}
          </button>
        ))}
      </div>
      <FieldError field="cibil_range" />
      <p className="text-xs text-muted-foreground">
        Your self-declared score is shared with the owner. Misrepresentation may result in application cancellation without refund.
      </p>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Background Declaration</h2>
        <p className="text-sm text-muted-foreground">A self-declaration required for all applicants</p>
      </div>
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={crimeAttest}
              onCheckedChange={(c) => { setCrimeAttest(!!c); setErrors((p) => { const n = { ...p }; delete n.crime_attest; return n; }); }}
              className="mt-0.5"
            />
            <p className="text-sm text-foreground leading-relaxed">
              I confirm that I have no criminal record and have not been convicted of any offence under Indian law.
              I understand that any misrepresentation will result in immediate termination of the lease agreement.
            </p>
          </div>
          <FieldError field="crime_attest" />
        </CardContent>
      </Card>
    </div>
  );

  const renderStep6 = () => {
    const listedRent = property.listed_rent;
    const serviceFee = Math.round(listedRent * 0.07);
    const effectiveRent = rentChoice === "counter" && proposedRent !== "" ? Number(proposedRent) : listedRent;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Rent Offer</h2>
          <p className="text-sm text-muted-foreground">You can accept the listed rent or make a counter offer</p>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Listed Rent</span>
            <span className="text-sm font-semibold text-foreground">{formatRupee(listedRent)}/month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Service fee (7% + GST)</span>
            <span className="text-sm text-foreground">{formatRupee(serviceFee)}/month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Security Deposit</span>
            <span className="text-sm text-foreground">{formatRupee(listedRent)} — held by Reeve</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => { setRentChoice("accept"); setProposedRent(listedRent); }}
            className={`w-full min-h-[44px] rounded-lg border-2 px-4 py-3 text-left transition-all ${
              rentChoice === "accept" ? "border-primary bg-accent" : "border-border bg-card hover:border-muted-foreground/40"
            }`}
          >
            <p className="text-sm font-medium text-foreground">Accept Listed Rent</p>
            <p className="text-xs text-muted-foreground">{formatRupee(listedRent)}/month</p>
          </button>

          <button
            type="button"
            onClick={() => setRentChoice("counter")}
            className={`w-full min-h-[44px] rounded-lg border-2 px-4 py-3 text-left transition-all ${
              rentChoice === "counter" ? "border-primary bg-accent" : "border-border bg-card hover:border-muted-foreground/40"
            }`}
          >
            <p className="text-sm font-medium text-foreground">Make a Counter Offer</p>
          </button>
        </div>

        {rentChoice === "counter" && (
          <div>
            <Label className="text-sm">Your proposed rent *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                value={proposedRent}
                onChange={(e) => { setProposedRent(e.target.value ? Number(e.target.value) : ""); setErrors((p) => { const n = { ...p }; delete n.proposed_rent; return n; }); }}
                placeholder="0"
                className="pl-7"
                min={0}
              />
            </div>
            <FieldError field="proposed_rent" />
            {proposedRent !== "" && Number(proposedRent) > listedRent && (
              <p className="mt-1 text-xs text-green-600">Your offer is above listed rent — the owner will appreciate this</p>
            )}
            {proposedRent !== "" && Number(proposedRent) > 0 && Number(proposedRent) < listedRent && (
              <p className="mt-1 text-xs text-amber-600">Counter offers below listed rent may be rejected by the owner</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              You get one round of negotiation. Choose carefully.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderStep7 = () => {
    const todayStr = new Date().toISOString().split("T")[0];

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Notes & Requests for this Property</h2>
          <p className="text-sm text-muted-foreground">Let the owner know about any additions, removals, or issues you noticed</p>
        </div>

        {/* Move-in date */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">When are you looking to move in? *</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setMoveInAsap(true); setPreferredMoveInDate(""); setErrors((p) => { const n = { ...p }; delete n.move_in; return n; }); }}
              className={`min-h-[44px] rounded-lg border-2 px-4 py-3 text-center transition-all ${
                moveInAsap === true
                  ? "border-primary bg-accent"
                  : "border-border bg-card hover:border-muted-foreground/40"
              }`}
            >
              <p className="text-sm font-medium text-foreground">As soon as possible</p>
            </button>
            <button
              type="button"
              onClick={() => { setMoveInAsap(false); setErrors((p) => { const n = { ...p }; delete n.move_in; return n; }); }}
              className={`min-h-[44px] rounded-lg border-2 px-4 py-3 text-center transition-all ${
                moveInAsap === false
                  ? "border-primary bg-accent"
                  : "border-border bg-card hover:border-muted-foreground/40"
              }`}
            >
              <p className="text-sm font-medium text-foreground">Pick a date</p>
            </button>
          </div>
          {moveInAsap === false && (
            <div className="mt-2">
              <Label className="text-xs">Preferred move-in date *</Label>
              <Input
                type="date"
                value={preferredMoveInDate}
                onChange={(e) => { setPreferredMoveInDate(e.target.value); setErrors((p) => { const n = { ...p }; delete n.move_in; return n; }); }}
                min={todayStr}
                className="mt-1"
              />
            </div>
          )}
          <FieldError field="move_in" />
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm">Request to Add <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={noteAdd}
              onChange={(e) => setNoteAdd(e.target.value)}
              placeholder="I'd like to request the following additions..."
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-sm">Request to Remove <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={noteRemove}
              onChange={(e) => setNoteRemove(e.target.value)}
              placeholder="I'd like the following items removed..."
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-sm">Report an Issue <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={noteIssue}
              onChange={(e) => setNoteIssue(e.target.value)}
              placeholder="I noticed the following issues during my visit..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStep8 = () => {
    const rent = rentChoice === "accept" ? property.listed_rent : Number(proposedRent) || property.listed_rent;
    const serviceFee = Math.round(rent * 0.07);
    const showTds = rent > 50000;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Review & Submit</h2>
          <p className="text-sm text-muted-foreground">Please review the terms before submitting</p>
        </div>

        <Card className="border-border">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Property</span>
              <span className="text-sm font-medium text-foreground">{bhkLabel(property.bhk)} in {property.building_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Proposed rent</span>
              <span className="text-sm font-medium text-foreground">{formatRupee(rent)}/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Service fee</span>
              <span className="text-sm text-foreground">{formatRupee(serviceFee)}/month + GST</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Security deposit</span>
              <span className="text-sm text-foreground">{formatRupee(rent)} — held by Reeve</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Residents</span>
              <span className="text-sm text-foreground">{1 + residents.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Expected stay</span>
              <span className="text-sm text-foreground capitalize">{STAY_LABELS[eligibility.expected_stay] || eligibility.expected_stay}</span>
            </div>
          </CardContent>
        </Card>

        {showTds && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <p className="flex items-start gap-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                As per Section 194IB, you are required to deduct 2% TDS on rent above ₹50,000/month.
                Service fee is calculated on flat rent before TDS.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={feeTermsAccepted}
              onCheckedChange={(c) => { setFeeTermsAccepted(!!c); setErrors((p) => { const n = { ...p }; delete n.fee_terms; return n; }); }}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm text-foreground leading-relaxed">
                I understand and agree to the service fee of 7% of monthly rent for the first 11-month term,
                reducing to 4% on renewal. The service fee is calculated on the flat rent amount.
                KYC failure will result in forfeiture of the service charge + GST. *
              </p>
              <FieldError field="fee_terms" />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              checked={dpdpaAccepted}
              onCheckedChange={(c) => { setDpdpaAccepted(!!c); setErrors((p) => { const n = { ...p }; delete n.dpdpa; return n; }); }}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm text-foreground leading-relaxed">
                I consent to my personal data (identity, employment, financial, and KYC documents) being processed
                by Reeve for the purpose of tenant verification and property management, as required under the
                Digital Personal Data Protection Act, 2023. *
              </p>
              <FieldError field="dpdpa" />
            </div>
          </div>
        </div>

        <Button
          className="min-h-[44px] w-full"
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Application"}
        </Button>
        <Button
          variant="ghost"
          className="min-h-[44px] w-full text-muted-foreground"
          disabled={saving}
          onClick={handleSaveDraft}
        >
          Save as Draft
        </Button>
      </div>
    );
  };

  const STEP_TITLES = [
    "Eligibility Summary",
    "Residents",
    "Employment & Income",
    "Credit Score",
    "Background Check",
    "Rent Offer",
    "Property Notes",
    "Review & Submit",
  ];

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg px-4 py-6 pb-20">
        {/* Resume banner */}
        {resumeBanner && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-accent/50 px-4 py-3">
            <p className="text-sm text-accent-foreground">
              You have an unfinished application for this property. Resuming from where you left off.
            </p>
            <button onClick={() => setResumeBanner(false)} className="mt-1 text-xs text-primary underline">Dismiss</button>
          </div>
        )}

        {/* Property strip */}
        <PropertyStrip />

        {/* Progress */}
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Step {step} of 8</span>
            <span className="text-xs font-medium text-foreground">{STEP_TITLES[step - 1]}</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        {/* Step content */}
        <div className="mt-6">{renderCurrentStep()}</div>

        {/* Navigation buttons (not on step 8 which has its own submit) */}
        {step !== 8 && (
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <Button variant="outline" className="min-h-[44px] flex-1" onClick={goBack}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
            <Button
              className={`min-h-[44px] ${step === 1 ? "w-full" : "flex-1"}`}
              disabled={saving || (step === 4 && !cibilRange) || (step === 3 && (!aadhaarFile || !panFile || salarySlips.length === 0))}
              onClick={goNext}
            >
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </div>
        )}

        {/* Back button on step 8 */}
        {step === 8 && (
          <div className="mt-4">
            <Button variant="ghost" className="min-h-[44px]" onClick={goBack}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Step 7
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
