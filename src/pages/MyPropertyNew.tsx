import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";

export default function MyPropertyNew() {
  const navigate = useNavigate();
  const { session, loading } = useRequireAuth();

  const [locality, setLocality] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [legalOwnerName, setLegalOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userId = session?.user?.id;

  const canSubmit =
    !!userId &&
    !!locality.trim() &&
    !!buildingName.trim() &&
    !!address.trim() &&
    !!bhk &&
    !!furnishing &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !userId) return;
    setSubmitting(true);
    setError("");

    // Refresh session to ensure a valid token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error("Session refresh failed:", sessionError);
      setError("Session expired. Please log in again.");
      setSubmitting(false);
      return;
    }

    const payload = {
      owner_id: sessionData.session.user.id,
      city: "Bangalore",
      state: "Karnataka",
      locality: locality.trim(),
      building_name: buildingName.trim(),
      street_address: address.trim(),
      bhk: bhk as any,
      furnishing: furnishing as any,
      listed_rent: 0,
      is_active: false,
      draft_at: new Date().toISOString(),
    };

    console.log("[AddProperty] inserting into properties:", payload);

    const { error: insertError } = await supabase
      .from("properties")
      .insert(payload);

    setSubmitting(false);

    if (insertError) {
      console.error("[AddProperty] Supabase error:", insertError);
      setError(insertError.message || "Could not save. Please try again.");
      return;
    }

    console.log("[AddProperty] success — redirecting");
    toast.success("Property added");
    navigate("/my-properties", { replace: true });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 min-h-[44px]"
          onClick={() => navigate("/my-properties")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add a Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">
                City <span className="text-destructive">*</span>
              </Label>
              <Select value="bangalore" disabled>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bangalore">Bangalore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Locality <span className="text-destructive">*</span>
              </Label>
              <Input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Koramangala"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Building Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. Prestige Lakeside Habitat"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Property Address <span className="text-destructive">*</span>
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full street address"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                BHK <span className="text-destructive">*</span>
              </Label>
              <Select value={bhk} onValueChange={setBhk}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select BHK" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="1BHK">1 BHK</SelectItem>
                  <SelectItem value="2BHK">2 BHK</SelectItem>
                  <SelectItem value="3BHK">3 BHK</SelectItem>
                  <SelectItem value="4BHK">4 BHK</SelectItem>
                  <SelectItem value="5BHK_plus">5 BHK+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Furnishing <span className="text-destructive">*</span>
              </Label>
              <Select value={furnishing} onValueChange={setFurnishing}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select furnishing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unfurnished">Unfurnished</SelectItem>
                  <SelectItem value="semi_furnished">Semi-furnished</SelectItem>
                  <SelectItem value="fully_furnished">Fully furnished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full min-h-[44px]"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Property
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
