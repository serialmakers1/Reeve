import { useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, session, loading, refreshUser } = useRequireAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill once user is loaded
  if (user && !initialized) {
    setFullName(user.full_name ?? "");
    setPhone(user.phone?.replace(/^\+91/, "") ?? "");
    setInitialized(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.replace(/\D/g, "");

    if (trimmedName.length < 2) {
      toast({ title: "Full name must be at least 2 characters.", variant: "destructive" });
      return;
    }
    if (trimmedPhone.length !== 10) {
      toast({ title: "Please enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }

    const userId = session?.user?.id;
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({
        full_name: trimmedName,
        phone: "+91" + trimmedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      toast({ title: "Could not save. Please try again.", variant: "destructive" });
    } else {
      await refreshUser();
      toast({ title: "Profile updated." });
    }
  };

  const roleLabel: Record<string, string> = {
    user: "User",
    tenant: "Tenant",
    owner: "Owner",
    admin: "Admin",
    super_admin: "Super Admin",
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input value={user?.email ?? ""} disabled className="min-h-[44px] bg-muted" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Role</Label>
              <Input value={roleLabel[user?.role ?? ""] ?? user?.role ?? ""} disabled className="min-h-[44px] bg-muted" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Phone number <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="flex h-[44px] items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                  +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full min-h-[44px]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
