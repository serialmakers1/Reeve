import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import type { Database } from "@/integrations/supabase/types";

type BhkType = Database["public"]["Enums"]["bhk_type"];

interface LeadFormData {
  referrer_name: string;
  referrer_phone: string;
  owner_name: string;
  owner_phone: string;
  building_name: string;
  locality: string;
  city: string;
  bhk: BhkType | "";
  expected_rent: string;
}

interface FormErrors {
  referrer_name?: string;
  referrer_phone?: string;
  owner_name?: string;
  owner_phone?: string;
  building_name?: string;
  locality?: string;
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
  referrer_name: "",
  referrer_phone: "",
  owner_name: "",
  owner_phone: "",
  building_name: "",
  locality: "",
  city: "Bangalore",
  bhk: "",
  expected_rent: "",
};

export default function ReferProperty() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!formData.referrer_name || formData.referrer_name.trim().length < 3)
      e.referrer_name = "Your name must be at least 3 characters";
    if (!/^\d{10}$/.test(formData.referrer_phone))
      e.referrer_phone = "Your phone number must be 10 digits";
    if (!/^\d{10}$/.test(formData.owner_phone))
      e.owner_phone = "Enter the owner's 10-digit phone number";
    if (!formData.building_name.trim())
      e.building_name = "Building name is required";
    if (!formData.locality.trim())
      e.locality = "Locality is required";
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

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      referrer_name: formData.referrer_name.trim(),
      referrer_phone: formData.referrer_phone.trim(),
      referred_by_tenant_id: user?.id ?? null,
      owner_name: formData.owner_name.trim() || null,
      owner_phone: formData.owner_phone.trim(),
      building_name: formData.building_name.trim(),
      locality: formData.locality.trim(),
      city: formData.city.trim() || "Bangalore",
      bhk: (formData.bhk || null) as BhkType | null,
      expected_rent: formData.expected_rent ? Number(formData.expected_rent) : null,
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
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <Link
            to="/search"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Search
          </Link>

          {submitted ? (
            <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="mt-4 text-xl font-bold text-foreground">Thanks for the referral!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We'll reach out to the owner. We'll let you know if they list with Reeve.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">Redirecting to search…</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
              <h1 className="text-2xl font-bold text-foreground">
                Found a flat you like? Refer the owner to Reeve.
              </h1>

              {/* Incentive callout — must appear before first form field in DOM */}
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-sm text-foreground">
                  If the owner lists with Reeve, your Reeve fee drops from{" "}
                  <span className="font-semibold">7% to 6%</span> — for the full tenancy.
                  No brokerage. Lower fee. Structured renting.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {/* 1. Your Name */}
                <Field
                  id="referrer_name"
                  label="Your Name"
                  required
                  error={errors.referrer_name}
                >
                  <Input
                    id="referrer_name"
                    value={formData.referrer_name}
                    onChange={(e) => handleChange("referrer_name", e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </Field>

                {/* 2. Your Phone Number */}
                <Field
                  id="referrer_phone"
                  label="Your Phone Number"
                  required
                  error={errors.referrer_phone}
                >
                  <Input
                    id="referrer_phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.referrer_phone}
                    onChange={(e) =>
                      handleChange("referrer_phone", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10-digit phone number"
                    autoComplete="tel"
                  />
                </Field>

                {/* 3. Owner's Phone */}
                <Field
                  id="owner_phone"
                  label="Property Owner's Phone Number"
                  required
                  error={errors.owner_phone}
                >
                  <Input
                    id="owner_phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.owner_phone}
                    onChange={(e) =>
                      handleChange("owner_phone", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Owner's 10-digit phone number"
                  />
                </Field>

                {/* 4. Building Name */}
                <Field
                  id="building_name"
                  label="Building Name"
                  required
                  error={errors.building_name}
                >
                  <Input
                    id="building_name"
                    value={formData.building_name}
                    onChange={(e) => handleChange("building_name", e.target.value)}
                    placeholder="e.g. Prestige Lakeside Habitat"
                  />
                </Field>

                {/* 5. Locality */}
                <Field
                  id="locality"
                  label="Locality / Area"
                  required
                  error={errors.locality}
                >
                  <Input
                    id="locality"
                    value={formData.locality}
                    onChange={(e) => handleChange("locality", e.target.value)}
                    placeholder="e.g. Koramangala"
                  />
                </Field>

                {/* 6. City — pre-filled, disabled */}
                <Field id="city" label="City" optional>
                  <Input
                    id="city"
                    value={formData.city}
                    disabled
                    readOnly
                    className="cursor-not-allowed opacity-60"
                  />
                </Field>

                {/* 7. Owner's Name (optional) */}
                <Field
                  id="owner_name"
                  label="Property Owner's Name"
                  optional
                  error={errors.owner_name}
                >
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => handleChange("owner_name", e.target.value)}
                    placeholder="Owner's full name (if known)"
                  />
                </Field>

                {/* 8. BHK (optional) */}
                <Field id="bhk" label="BHK Type" optional>
                  <Select
                    value={formData.bhk}
                    onValueChange={(val) => handleChange("bhk", val)}
                  >
                    <SelectTrigger id="bhk">
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

                {/* 9. Expected Rent (optional) */}
                <Field id="expected_rent" label="Expected Monthly Rent" optional>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="expected_rent"
                      type="number"
                      min={0}
                      className="pl-7"
                      value={formData.expected_rent}
                      onChange={(e) => handleChange("expected_rent", e.target.value)}
                      placeholder="25000"
                    />
                  </div>
                </Field>

                {submitError && (
                  <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {submitError}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  We'll reach out to the owner directly. We won't share your name without
                  your permission.
                </p>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg min-h-[44px]"
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
    </Layout>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {optional && (
          <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
        )}
      </Label>
      {children}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
