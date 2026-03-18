import { useState, useEffect } from "react";
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
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecEmail, setEcEmail] = useState('');
  const [ecRelationship, setEcRelationship] = useState('');
  const [ecOtherRelationship, setEcOtherRelationship] = useState('');
  const [ecSaving, setEcSaving] = useState(false);

  // Pre-fill once user is loaded
  if (user && !initialized) {
    setFullName(user.full_name ?? "");
    setPhone(user.phone?.replace(/^\+91/, "") ?? "");
    setInitialized(true);
  }

  // Fetch emergency contact from profiles table once user is initialized
  useEffect(() => {
    if (!initialized) return;

    const fetchProfile = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      const userId = s?.user?.id;
      if (!userId) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setEcName(profileData.emergency_contact_name ?? '');
        setEcPhone((profileData.emergency_contact_phone ?? '').replace(/^\+91/, ''));
        setEcEmail(profileData.emergency_contact_email ?? '');

        const rel = profileData.emergency_contact_relationship ?? '';
        if (rel.startsWith('Other: ')) {
          setEcRelationship('Other');
          setEcOtherRelationship(rel.replace('Other: ', ''));
        } else {
          setEcRelationship(rel);
        }
      }
    };

    fetchProfile();
  }, [initialized]);

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

  const handleSaveEmergencyContact = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const userId = s?.user?.id;
    if (!userId) return;

    setEcSaving(true);
    try {
      const finalRelationship = ecRelationship === 'Other'
        ? `Other: ${ecOtherRelationship.trim()}`
        : ecRelationship;

      const { error } = await supabase
        .from('profiles')
        .update({
          emergency_contact_name: ecName.trim() || null,
          emergency_contact_phone: ecPhone.trim() ? '+91' + ecPhone.trim() : null,
          emergency_contact_email: ecEmail.trim() || null,
          emergency_contact_relationship: finalRelationship || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Emergency contact save error:', error.message);
        toast({ title: 'Could not save. Please try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Emergency contact saved.' });
      }
    } catch (err) {
      console.error('Emergency contact save failed:', err);
      toast({ title: 'Could not save. Please try again.', variant: 'destructive' });
    } finally {
      setEcSaving(false);
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
        {/* Emergency Contact Section */}
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Emergency Contact</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Used only in case of emergency — never shared publicly.
            </p>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Full Name <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={ecName}
                onChange={e => setEcName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Phone Number <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="mt-1 flex rounded-lg border border-input overflow-hidden">
                <span className="px-3 flex items-center bg-muted text-sm text-muted-foreground border-r border-input">
                  +91
                </span>
                <input
                  type="tel"
                  value={ecPhone}
                  onChange={e => setEcPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="flex-1 px-3 py-2.5 text-sm bg-background min-h-[44px] outline-none"
                />
              </div>
            </div>

            {/* Relationship */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Relationship <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <select
                value={ecRelationship}
                onChange={e => {
                  setEcRelationship(e.target.value);
                  if (e.target.value !== 'Other') setEcOtherRelationship('');
                }}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[44px]"
              >
                <option value="">Select relationship</option>
                <option value="Parent">Parent</option>
                <option value="Spouse / Partner">Spouse / Partner</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Other">Other (specify)</option>
              </select>
              {ecRelationship === 'Other' && (
                <input
                  type="text"
                  value={ecOtherRelationship}
                  onChange={e => setEcOtherRelationship(e.target.value)}
                  placeholder="Please specify"
                  className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[44px]"
                />
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={ecEmail}
                onChange={e => setEcEmail(e.target.value)}
                placeholder="e.g. ramesh@email.com"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>
          </div>

          {/* Save button — completely separate from the main profile save */}
          <button
            onClick={handleSaveEmergencyContact}
            disabled={ecSaving}
            className="w-full min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {ecSaving ? 'Saving…' : 'Save Emergency Contact'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
