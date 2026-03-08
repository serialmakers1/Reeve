import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type BhkType = Database["public"]["Enums"]["bhk_type"];

interface LeadFormData {
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  property_address: string;
  building_name: string;
  flat_number: string;
  locality: string;
  city: string;
  expected_rent: string;
  bhk: BhkType | "";
}

interface FormErrors {
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  property_address?: string;
  building_name?: string;
  flat_number?: string;
  locality?: string;
  expected_rent?: string;
  bhk?: string;
}

const BHK_OPTIONS: { value: BhkType; label: string }[] = [
  { value: "studio", label: "Studio" },
  { value: "1BHK", label: "1 BHK" },
  { value: "2BHK", label: "2 BHK" },
  { value: "3BHK", label: "3 BHK" },
  { value: "4BHK", label: "4 BHK" },
  { value: "5BHK_plus", label: "5 BHK+" },
];

const initialFormData: LeadFormData = {
  owner_name: "",
  owner_phone: "",
  owner_email: "",
  property_address: "",
  building_name: "",
  flat_number: "",
  locality: "",
  city: "Bangalore",
  expected_rent: "",
  bhk: "",
};

export default function ReferProperty() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
        setAuthLoading(false);
      }
    );
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!formData.owner_name || formData.owner_name.trim().length < 3)
      e.owner_name = "Owner name must be at least 3 characters";
    if (!/^\d{10}$/.test(formData.owner_phone))
      e.owner_phone = "Enter a valid 10-digit phone number";
    if (formData.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email))
      e.owner_email = "Enter a valid email address";
    if (!formData.building_name.trim())
      e.building_name = "Building name is required";
    if (!formData.flat_number.trim())
      e.flat_number = "Flat number is required";
    if (!formData.property_address || formData.property_address.trim().length < 5)
      e.property_address = "Address must be at least 5 characters";
    if (!formData.locality.trim())
      e.locality = "Locality is required";
    if (!formData.expected_rent || Number(formData.expected_rent) <= 0)
      e.expected_rent = "Enter a valid rent amount";
    if (!formData.bhk) e.bhk = "Select a BHK type";
    return e;
  };

  const handleChange = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (!session?.user?.id) return;

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      referred_by_tenant_id: session.user.id,
      owner_name: formData.owner_name.trim(),
      owner_phone: formData.owner_phone.trim(),
      owner_email: formData.owner_email.trim() || null,
      property_address: formData.property_address.trim(),
      building_name: formData.building_name.trim() || null,
      flat_number: formData.flat_number.trim() || null,
      locality: formData.locality.trim() || null,
      city: formData.city.trim() || "Bangalore",
      expected_rent: formData.expected_rent ? Number(formData.expected_rent) : null,
      bhk: (formData.bhk || null) as BhkType | null,
      status: "new" as Database["public"]["Enums"]["lead_status"],
    });

    setSubmitting(false);
    if (error) {
      setSubmitError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
    setTimeout(() => navigate("/search"), 3000);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex flex-col items-center gap-1 px-4 py-4 sm:flex-row sm:justify-between sm:gap-0">
          <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
            REEVE
          </Link>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Zero Brokerage. One Month Deposit. Hassle-Free Renting.
          </p>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {/* Back button */}
        <Link
          to="/search"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Search
        </Link>

      {/* Login gate — temporarily commented out
      {!session ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-foreground">Log in to Refer a Property</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You need to be logged in to refer a property.
            </p>
            <Link to="/login">
              <Button className="mt-6">Log In</Button>
            </Link>
          </div>
        ) : */}
      {submitted ? (
          /* Success */
          <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-4 text-xl font-bold text-foreground">Thanks!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll reach out to the owner and notify you if the property gets listed.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">Redirecting to search…</p>
          </div>
        ) : (
          /* Form */
          <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-foreground">Refer a Property</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Give us the owner's details and we'll reach out to bring their property onto the 1-month deposit system. We'll notify you if it gets listed.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Owner Name */}
              <Field label="Owner Name" required error={errors.owner_name}>
                <Input
                  value={formData.owner_name}
                  onChange={(e) => handleChange("owner_name", e.target.value)}
                  placeholder="Full name of the owner"
                />
              </Field>

              {/* Owner Phone */}
              <Field label="Owner Phone Number" required error={errors.owner_phone}>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.owner_phone}
                  onChange={(e) => handleChange("owner_phone", e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit phone number"
                />
              </Field>

              {/* Owner Email */}
              <Field label="Owner Email" error={errors.owner_email} optional>
                <Input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => handleChange("owner_email", e.target.value)}
                  placeholder="owner@example.com"
                />
              </Field>

              {/* Building Name */}
              <Field label="Building Name" required error={errors.building_name}>
                <Input
                  value={formData.building_name}
                  onChange={(e) => handleChange("building_name", e.target.value)}
                  placeholder="e.g. Prestige Lakeside Habitat"
                />
              </Field>

              {/* Flat Number */}
              <Field label="Flat Number" required error={errors.flat_number}>
                <Input
                  value={formData.flat_number}
                  onChange={(e) => handleChange("flat_number", e.target.value)}
                  placeholder="e.g. A-402"
                />
              </Field>

              {/* Property Address */}
              <Field label="Property Address" required error={errors.property_address}>
                <Input
                  value={formData.property_address}
                  onChange={(e) => handleChange("property_address", e.target.value)}
                  placeholder="Full street address"
                />
              </Field>

              {/* Locality */}
              <Field label="Locality / Area" required error={errors.locality}>
                <Input
                  value={formData.locality}
                  onChange={(e) => handleChange("locality", e.target.value)}
                  placeholder="e.g. Koramangala"
                />
              </Field>

              {/* City */}
              <Field label="City" optional>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Bangalore"
                />
              </Field>

              {/* Expected Rent */}
              <Field label="Expected Monthly Rent" required error={errors.expected_rent}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="pl-7"
                    value={formData.expected_rent}
                    onChange={(e) => handleChange("expected_rent", e.target.value)}
                    placeholder="25000"
                  />
                </div>
              </Field>

              {/* BHK */}
              <Field label="BHK Type" required error={errors.bhk}>
                <Select
                  value={formData.bhk}
                  onValueChange={(val) => handleChange("bhk", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select BHK" />
                  </SelectTrigger>
                  <SelectContent>
                    {BHK_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {submitError && (
                <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {submitError}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Referral"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* Reusable field wrapper */
function Field({
  label,
  required,
  optional,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {optional && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
