import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

export default function OwnerAddProperty() {
  const navigate = useNavigate();
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();

  const [locality, setLocality] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!authLoading && !isAuthenticated) {
    navigate("/login", { replace: true });
    return null;
  }

  const userId = session?.user?.id || "";

  const canSubmit =
    locality.trim() &&
    buildingName.trim() &&
    address.trim() &&
    bhk &&
    furnishing &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("properties").insert({
      owner_id: userId,
      city: "Bangalore",
      state: "Karnataka",
      locality: locality.trim(),
      building_name: buildingName.trim(),
      street_address: address.trim(),
      bhk: bhk as any,
      furnishing: furnishing as any,
      listed_rent: 0,
      status: "inspection_proposed" as any,
      is_active: false,
    });

    setSubmitting(false);

    if (insertError) {
      setError("Could not save. Please try again.");
      return;
    }

    navigate("/owner", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 min-h-[44px]"
          onClick={() => navigate(-1)}
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
              <Label htmlFor="city" className="text-sm">
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
              <Label htmlFor="locality" className="text-sm">
                Locality <span className="text-destructive">*</span>
              </Label>
              <Input
                id="locality"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Koramangala"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="buildingName" className="text-sm">
                Building Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="buildingName"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. Prestige Lakeside Habitat"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-sm">
                Property Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
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

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

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
