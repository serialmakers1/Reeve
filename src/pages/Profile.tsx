import { useState, useEffect, useRef } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import posthog from "posthog-js";

const PENDING_RETURN_TTL = 30 * 60 * 1000; // 30 minutes

export default function Profile() {
  const { user, session, loading, refreshUser } = useRequireAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);

  // ─── Section 1: Full Name ──────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // ─── Section 2: Phone Verification ────────────────────────────────────────
  const [phoneStep, setPhoneStep] = useState<"idle" | "enter" | "otp">("idle");
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);
  const phoneCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Section 3: Google Linking ────────────────────────────────────────────
  const [googleLinking, setGoogleLinking] = useState(false);
  const [identities, setIdentities] = useState<{ provider: string }[]>([]);

  // ─── Section 4: Emergency Contact ─────────────────────────────────────────
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecEmail, setEcEmail] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [ecOtherRelationship, setEcOtherRelationship] = useState("");
  const [ecSaving, setEcSaving] = useState(false);
  const [ecExpanded, setEcExpanded] = useState(false);
  const [ecSaved, setEcSaved] = useState(false);

  // Pre-fill once user is loaded
  if (user && !initialized) {
    setFullName(user.full_name ?? "");
    setInitialized(true);
  }

  // Load identities and emergency contact
  useEffect(() => {
    if (!initialized || !session?.user?.id) return;

    // Identities from session
    const rawIdentities = (session.user as any).identities ?? [];
    setIdentities(rawIdentities.map((i: any) => ({ provider: i.provider })));

    const fetchProfile = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_contact_relationship"
        )
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setEcName(profileData.emergency_contact_name ?? "");
        setEcPhone((profileData.emergency_contact_phone ?? "").replace(/^\+91/, ""));
        setEcEmail(profileData.emergency_contact_email ?? "");

        const rel = profileData.emergency_contact_relationship ?? "";
        if (rel.startsWith("Other: ")) {
          setEcRelationship("Other");
          setEcOtherRelationship(rel.replace("Other: ", ""));
        } else {
          setEcRelationship(rel);
        }

        if (
          profileData.emergency_contact_name ||
          profileData.emergency_contact_phone ||
          profileData.emergency_contact_relationship
        ) {
          setEcSaved(true);
          setEcExpanded(false);
        }
      }
    };

    fetchProfile();
  }, [initialized, session?.user?.id]);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (phoneCooldownRef.current) clearInterval(phoneCooldownRef.current);
    };
  }, []);

  // After Google OAuth return: write email_verified to public.users, refresh, consume pendingReturnTo
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // If the session now has a verified email (i.e. Google identity was linked),
        // write it back to public.users so our gate reads it correctly.
        const uid = authSession?.user?.id;
        const email = authSession?.user?.email;
        const hasEmailIdentity = (authSession?.user as any)?.identities?.some(
          (i: any) => i.provider === "google" || i.provider === "email"
        );
        if (uid && email && hasEmailIdentity) {
          await supabase
            .from("users")
            .update({
              email,
              email_verified: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", uid);
        }

        await refreshUser();

        const raw = localStorage.getItem("pendingReturnTo");
        if (raw) {
          try {
            const { url, ts } = JSON.parse(raw);
            localStorage.removeItem("pendingReturnTo");
            if (Date.now() - ts < PENDING_RETURN_TTL && url && url !== "/profile") {
              navigate(url, { replace: true });
            }
          } catch {
            localStorage.removeItem("pendingReturnTo");
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Handlers: Section 1 ──────────────────────────────────────────────────

  const handleSaveName = async () => {
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      toast({ title: "Full name must be at least 2 characters.", variant: "destructive" });
      return;
    }
    const userId = session?.user?.id;
    if (!userId) return;

    setNameSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ full_name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setNameSaving(false);

    if (error) {
      toast({ title: "Could not save. Please try again.", variant: "destructive" });
    } else {
      await refreshUser();
      toast({ title: "Name saved." });
    }
  };

  // ─── Handlers: Section 2 ──────────────────────────────────────────────────

  const startPhoneCooldown = () => {
    setPhoneResendCooldown(120);
    if (phoneCooldownRef.current) clearInterval(phoneCooldownRef.current);
    phoneCooldownRef.current = setInterval(() => {
      setPhoneResendCooldown((prev) => {
        if (prev <= 1) {
          if (phoneCooldownRef.current) clearInterval(phoneCooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendPhoneOtp = async () => {
    const digits = newPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setPhoneError("Please enter a valid 10-digit number.");
      return;
    }
    setPhoneSending(true);
    setPhoneError(null);

    const { error } = await supabase.auth.updateUser({ phone: "+91" + digits });
    setPhoneSending(false);

    if (error) {
      setPhoneError(error.message || "Could not send OTP. Please try again.");
      return;
    }

    setPhoneStep("otp");
    setPhoneOtp("");
    startPhoneCooldown();
  };

  const handleVerifyPhoneOtp = async () => {
    const digits = newPhone.replace(/\D/g, "");
    setPhoneVerifying(true);
    setPhoneError(null);

    const { error } = await supabase.auth.verifyOtp({
      phone: "+91" + digits,
      token: phoneOtp,
      type: "phone_change",
    });

    setPhoneVerifying(false);

    if (error) {
      setPhoneError(error.message || "Invalid or expired code. Please try again.");
      setPhoneOtp("");
      return;
    }

    // Update users table and mark phone_verified
    const userId = session?.user?.id;
    if (userId) {
      await supabase
        .from("users")
        .update({
          phone: "+91" + digits,
          phone_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    await refreshUser();
    setPhoneStep("idle");
    setNewPhone("");
    setPhoneOtp("");
    posthog?.capture("phone_verified", { method: "phone_change" });
    toast({ title: "Phone number verified." });
  };

  // ─── Handlers: Section 3 ──────────────────────────────────────────────────

  const handleLinkGoogle = async () => {
    setGoogleLinking(true);
    // Store return URL before navigating away
    localStorage.setItem(
      "pendingReturnTo",
      JSON.stringify({ url: "/profile", ts: Date.now() })
    );
    posthog?.capture("google_link_initiated");
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/profile",
      },
    });
    if (error) {
      setGoogleLinking(false);
      localStorage.removeItem("pendingReturnTo");
      toast({ title: "Could not link Google. Please try again.", variant: "destructive" });
    }
    // On success the browser navigates away — no further action needed here
  };

  // ─── Handlers: Section 4 ──────────────────────────────────────────────────

  const handleSaveEmergencyContact = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    setEcSaving(true);
    try {
      const finalRelationship =
        ecRelationship === "Other"
          ? `Other: ${ecOtherRelationship.trim()}`
          : ecRelationship;

      const { error } = await supabase
        .from("profiles")
        .update({
          emergency_contact_name: ecName.trim() || null,
          emergency_contact_phone: ecPhone.trim() ? "+91" + ecPhone.trim() : null,
          emergency_contact_email: ecEmail.trim() || null,
          emergency_contact_relationship: finalRelationship || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        toast({ title: "Could not save. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Emergency contact saved." });
        setEcSaved(true);
        setEcExpanded(false);
      }
    } catch (err) {
      toast({ title: "Could not save. Please try again.", variant: "destructive" });
    } finally {
      setEcSaving(false);
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────

  const phoneVerified = user?.phone_verified ?? false;
  const emailVerified = user?.email_verified ?? false;
  const hasGoogle = identities.some((i) => i.provider === "google");
  const currentPhone = user?.phone?.replace(/^\+91/, "") ?? "";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-lg space-y-4">

        {/* Verification status banner */}
        {(!phoneVerified || !emailVerified) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-medium text-amber-800">Complete your profile to apply or schedule visits</p>
            <ul className="mt-1.5 space-y-1">
              {!phoneVerified && (
                <li className="flex items-center gap-2 text-amber-700">
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                  Verify your phone number
                </li>
              )}
              {!emailVerified && (
                <li className="flex items-center gap-2 text-amber-700">
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                  Link your Google account to verify email
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ── Section 1: Full Name ── */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Full Name</h2>
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
          <Button
            onClick={handleSaveName}
            disabled={nameSaving}
            className="w-full min-h-[44px]"
          >
            {nameSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Name
          </Button>
        </div>

        {/* ── Section 2: Phone Verification ── */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Phone Number</h2>
            {phoneVerified ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <Circle className="h-3.5 w-3.5" /> Not verified
              </span>
            )}
          </div>

          {phoneStep === "idle" && (
            <>
              {currentPhone && (
                <p className="text-sm text-muted-foreground">+91 {currentPhone}</p>
              )}
              <Button
                variant="outline"
                onClick={() => { setPhoneStep("enter"); setPhoneError(null); }}
                className="w-full min-h-[44px]"
              >
                {phoneVerified ? "Change Phone Number" : "Verify Phone Number"}
              </Button>
            </>
          )}

          {phoneStep === "enter" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the mobile number to verify. We'll send a 6-digit OTP.
              </p>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                  +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setPhoneError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && newPhone.replace(/\D/g, "").length === 10 && handleSendPhoneOtp()}
                  className="min-h-[44px] rounded-l-none"
                />
              </div>
              {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={handleSendPhoneOtp}
                  disabled={phoneSending || newPhone.replace(/\D/g, "").length !== 10}
                  className="flex-1 min-h-[44px]"
                >
                  {phoneSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setPhoneStep("idle"); setNewPhone(""); setPhoneError(null); }}
                  className="min-h-[44px] px-4"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {phoneStep === "otp" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to +91 {newPhone}
              </p>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={phoneOtp}
                onChange={(e) => {
                  setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPhoneError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && phoneOtp.length === 6 && handleVerifyPhoneOtp()}
                disabled={phoneVerifying}
                className="min-h-[48px] text-center text-2xl font-bold tracking-[0.5em]"
              />
              {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
              <Button
                onClick={handleVerifyPhoneOtp}
                disabled={phoneOtp.length !== 6 || phoneVerifying}
                className="w-full min-h-[44px]"
              >
                {phoneVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
              <div className="text-center">
                {phoneResendCooldown > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend in {phoneResendCooldown}s</p>
                ) : (
                  <button
                    onClick={handleSendPhoneOtp}
                    disabled={phoneSending}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>
              <button
                onClick={() => { setPhoneStep("enter"); setPhoneOtp(""); setPhoneError(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
              >
                ← Wrong number? Go back
              </button>
            </div>
          )}
        </div>

        {/* ── Section 3: Google Account ── */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Google Account</h2>
            {hasGoogle ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <Circle className="h-3.5 w-3.5" /> Not linked
              </span>
            )}
          </div>

          {hasGoogle ? (
            <p className="text-sm text-muted-foreground">
              Your Google account is linked. You can sign in with Google or phone OTP.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Link your Google account to verify your email and unlock applying to properties.
              </p>
              <Button
                variant="outline"
                onClick={handleLinkGoogle}
                disabled={googleLinking}
                className="w-full min-h-[44px] gap-2"
              >
                {googleLinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Link Google Account
              </Button>
            </>
          )}
        </div>

        {/* ── Section 4: Emergency Contact ── */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Emergency Contact</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Used only in case of emergency — never shared publicly.
              </p>
            </div>
            {ecSaved && !ecExpanded && (
              <button
                onClick={() => setEcExpanded(true)}
                className="text-sm text-primary underline shrink-0 ml-4"
              >
                Edit
              </button>
            )}
          </div>

          {/* Saved summary */}
          {ecSaved && !ecExpanded && (
            <div className="space-y-1 text-sm">
              {ecName && <p className="text-foreground font-medium">{ecName}</p>}
              {ecPhone && <p className="text-muted-foreground">+91 {ecPhone}</p>}
              {ecRelationship && (
                <p className="text-muted-foreground">
                  {ecRelationship === "Other" ? `Other: ${ecOtherRelationship}` : ecRelationship}
                </p>
              )}
              {ecEmail && <p className="text-muted-foreground">{ecEmail}</p>}
            </div>
          )}

          {/* Not yet added */}
          {!ecSaved && !ecExpanded && (
            <button
              onClick={() => setEcExpanded(true)}
              className="w-full min-h-[44px] rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              + Add Emergency Contact
            </button>
          )}

          {/* Expanded form */}
          {ecExpanded && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Full Name <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={ecName}
                  onChange={(e) => setEcName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>

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
                    onChange={(e) => setEcPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="flex-1 px-3 py-2.5 text-sm bg-background min-h-[44px] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Relationship <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <select
                  value={ecRelationship}
                  onChange={(e) => {
                    setEcRelationship(e.target.value);
                    if (e.target.value !== "Other") setEcOtherRelationship("");
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
                {ecRelationship === "Other" && (
                  <input
                    type="text"
                    value={ecOtherRelationship}
                    onChange={(e) => setEcOtherRelationship(e.target.value)}
                    placeholder="Please specify"
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[44px]"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Email <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={ecEmail}
                  onChange={(e) => setEcEmail(e.target.value)}
                  placeholder="e.g. ramesh@email.com"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveEmergencyContact}
                  disabled={ecSaving}
                  className="flex-1 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {ecSaving ? "Saving…" : "Save Emergency Contact"}
                </button>
                <button
                  onClick={() => {
                    setEcExpanded(false);
                    if (!ecSaved) {
                      setEcName("");
                      setEcPhone("");
                      setEcEmail("");
                      setEcRelationship("");
                      setEcOtherRelationship("");
                    }
                  }}
                  className="px-4 min-h-[44px] rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
