import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const BHK_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1BHK", label: "1 BHK" },
  { value: "2BHK", label: "2 BHK" },
  { value: "3BHK", label: "3 BHK" },
  { value: "4BHK", label: "4 BHK" },
  { value: "5BHK_plus", label: "5 BHK+" },
] as const;

const FURNISHING_OPTIONS = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi-furnished" },
  { value: "fully_furnished", label: "Fully furnished" },
] as const;

export default function OwnerOnboarding() {
  const navigate = useNavigate();
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isNRI, setIsNRI] = useState(false);

  // Step 2
  const [locality, setLocality] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const userEmail = session?.user?.email ?? user?.email ?? "";

  const handleStep1 = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim().replace(/\D/g, "");
    if (trimmedName.length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (trimmedPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSaving(true);
    setError(null);

    const userId = session?.user?.id;
    if (!userId) {
      setError("Session expired. Please log in again.");
      setSaving(false);
      return;
    }

    const { error: userErr } = await supabase
      .from("users")
      .update({
        full_name: trimmedName,
        phone: "+91" + trimmedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (userErr) {
      setSaving(false);
      setError("Could not save. Please try again.");
      return;
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ is_foreign_citizen: isNRI, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (profileErr) {
      setSaving(false);
      setError("Could not save. Please try again.");
      return;
    }

    setSaving(false);
    setStep(2);
  };

  const handleStep2 = async () => {
    if (!locality.trim() || !buildingName.trim() || !address.trim() || !bhk || !furnishing) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError(null);

    const userId = session?.user?.id;
    if (!userId) {
      setError("Session expired. Please log in again.");
      setSaving(false);
      return;
    }

    const { error: propErr } = await supabase.from("properties").insert({
      owner_id: userId,
      city: "Bangalore",
      state: "Karnataka",
      locality: locality.trim(),
      building_name: buildingName.trim(),
      street_address: address.trim(),
      bhk: bhk as any,
      furnishing: furnishing as any,
      listed_rent: 0,
      status: "draft" as any,
      is_active: false,
      draft_at: new Date().toISOString(),
    });

    if (propErr) {
      setSaving(false);
      setError("Could not save property. Please try again.");
      return;
    }

    setSaving(false);
    navigate("/my-properties", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center px-4 py-3 sm:py-4">
          <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
            REEVE
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {/* Email strip */}
            <div className="mb-4 rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium text-card-foreground truncate">{userEmail}</p>
            </div>

            {/* Step indicator */}
            <p className="mb-5 text-xs font-medium text-muted-foreground text-center">
              Step {step} of 2
            </p>

            {/* Step 1 — About You */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="text-center">
                  <h1 className="text-xl font-bold text-card-foreground">About You</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Tell us a bit about yourself</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      Full name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setError(null); }}
                      className="mt-1 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      Phone number <span className="text-destructive">*</span>
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="flex h-[44px] items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                        +91
                      </span>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                          setError(null);
                        }}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 pt-1">
                    <Checkbox
                      checked={isNRI}
                      onCheckedChange={(v) => setIsNRI(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-muted-foreground">
                      I am a foreign citizen or NRI
                    </span>
                  </label>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  onClick={handleStep1}
                  disabled={saving}
                  className="w-full min-h-[44px]"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2 — Your Property */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="text-center">
                  <h1 className="text-xl font-bold text-card-foreground">Your Property</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Add your property details</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      City <span className="text-destructive">*</span>
                    </label>
                    <Select defaultValue="bangalore" disabled>
                      <SelectTrigger className="mt-1 min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bangalore">Bangalore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      Locality <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Koramangala, HSR Layout"
                      value={locality}
                      onChange={(e) => { setLocality(e.target.value); setError(null); }}
                      className="mt-1 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      Building name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Building or apartment name"
                      value={buildingName}
                      onChange={(e) => { setBuildingName(e.target.value); setError(null); }}
                      className="mt-1 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      Property address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Full street address"
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); setError(null); }}
                      className="mt-1 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      BHK <span className="text-destructive">*</span>
                    </label>
                    <Select value={bhk} onValueChange={(v) => { setBhk(v); setError(null); }}>
                      <SelectTrigger className="mt-1 min-h-[44px]">
                        <SelectValue placeholder="Select BHK" />
                      </SelectTrigger>
                      <SelectContent>
                        {BHK_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">
                      Furnishing <span className="text-destructive">*</span>
                    </label>
                    <Select value={furnishing} onValueChange={(v) => { setFurnishing(v); setError(null); }}>
                      <SelectTrigger className="mt-1 min-h-[44px]">
                        <SelectValue placeholder="Select furnishing" />
                      </SelectTrigger>
                      <SelectContent>
                        {FURNISHING_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  onClick={handleStep2}
                  disabled={saving}
                  className="w-full min-h-[44px]"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
