// ─────────────────────────────────────────────
// AUTH METHOD: Email OTP via Supabase (temporary)
// To switch to Phone OTP when DLT/MSG91 is ready:
//   1. Change input label → "Phone number", type → "tel"
//   2. Add +91 prefix, strip non-digits
//   3. signInWithOtp({ phone }) instead of signInWithOtp({ email })
//   4. verifyOtp type: 'sms' instead of type: 'email'
//   5. Remove email-specific copy
// OTP screen, name screen, T&C — all stay identical
// ─────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type LoginStep = "email" | "otp" | "name";

interface LoginState {
  email: string;
  otp: string;
  fullName: string;
  step: LoginStep;
  isNewUser: boolean;
  isLoading: boolean;
  error: string | null;
  resendCooldown: number;
  termsAccepted: boolean;
}

type UserRole = "tenant" | "owner" | "admin" | "super_admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [state, setState] = useState<LoginState>({
    email: "",
    otp: "",
    fullName: "",
    step: "email",
    isNewUser: false,
    isLoading: false,
    error: null,
    resendCooldown: 0,
    termsAccepted: true,
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-focus on step change
  useEffect(() => {
    if (state.step === "email") emailRef.current?.focus();
    if (state.step === "otp") otpRef.current?.focus();
    if (state.step === "name") nameRef.current?.focus();
  }, [state.step]);

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectByRoleFromSession(session.user.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup cooldown
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const update = (partial: Partial<LoginState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  const startCooldown = () => {
    update({ resendCooldown: 30 });
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.resendCooldown <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return { ...prev, resendCooldown: 0 };
        }
        return { ...prev, resendCooldown: prev.resendCooldown - 1 };
      });
    }, 1000);
  };

  const redirectByRole = useCallback(
    (role: string | null | undefined) => {
      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }
      switch (role) {
        case "owner":
          navigate("/owner", { replace: true });
          break;
        case "admin":
        case "super_admin":
          navigate("/admin", { replace: true });
          break;
        default:
          navigate("/dashboard", { replace: true });
      }
    },
    [navigate, returnTo]
  );

  const redirectByRoleFromSession = useCallback(
    async (userId: string) => {
      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();
      redirectByRole(user?.role);
    },
    [redirectByRole]
  );

  // ─── Step 1: Send OTP ─────────────────────────────────────────────
  const handleSendOtp = async () => {
    const email = state.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      update({ error: "Please enter a valid email address." });
      return;
    }
    if (!state.termsAccepted) {
      update({ error: "Please accept the Terms of Service and Privacy Policy." });
      return;
    }

    update({ isLoading: true, error: null });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      update({ isLoading: false, error: "Something went wrong. Please try again." });
      return;
    }

    update({ isLoading: false, step: "otp", email });
    startCooldown();
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────────
  const handleVerifyOtp = async (otpValue?: string) => {
    const code = otpValue ?? state.otp;
    if (code.length !== 6) return;

    update({ isLoading: true, error: null });

    const { data, error } = await supabase.auth.verifyOtp({
      email: state.email.trim().toLowerCase(),
      token: code,
      type: "email",
    });

    if (error || !data.user) {
      update({
        isLoading: false,
        error: "Invalid or expired code. Please try again.",
        otp: "",
      });
      otpRef.current?.focus();
      return;
    }

    // Check if user has a name in the users table
    const { data: userRow } = await supabase
      .from("users")
      .select("full_name, role")
      .eq("id", data.user.id)
      .single();

    if (!userRow?.full_name || userRow.full_name.trim() === "") {
      update({ isLoading: false, step: "name", isNewUser: true });
    } else {
      update({ isLoading: false });
      redirectByRole(userRow.role);
    }
  };

  // ─── Step 2: Resend OTP ───────────────────────────────────────────
  const handleResend = async () => {
    update({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithOtp({
      email: state.email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    update({ isLoading: false });
    if (error) {
      update({ error: "Something went wrong. Please try again." });
      return;
    }
    toast({ title: "Code resent successfully" });
    startCooldown();
  };

  // ─── Step 3: Save Name ────────────────────────────────────────────
  const handleSaveName = async () => {
    const name = state.fullName.trim();
    if (name.length < 2) {
      update({ error: "Name must be at least 2 characters." });
      return;
    }

    update({ isLoading: true, error: null });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      update({ isLoading: false, error: "Session expired. Please start over." });
      return;
    }

    await supabase
      .from("users")
      .update({ full_name: name })
      .eq("id", session.user.id);

    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    update({ isLoading: false });
    redirectByRole(userRow?.role);
  };

  // ─── OTP input handler ────────────────────────────────────────────
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    update({ otp: val, error: null });
    if (val.length === 6) {
      handleVerifyOtp(val);
    }
  };

  const isEmailValid = EMAIL_REGEX.test(state.email.trim());

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="text-3xl font-bold tracking-tight text-primary">
            REEVE
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {/* ─── STEP 1: Email ─── */}
          {state.step === "email" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center">
                <h1 className="text-xl font-bold text-card-foreground">Welcome to Reeve</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email address to continue
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  ref={emailRef}
                  type="email"
                  placeholder="you@example.com"
                  value={state.email}
                  onChange={(e) => update({ email: e.target.value, error: null })}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="min-h-[44px]"
                />
                {state.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}
              </div>

              <label className="flex items-start gap-2.5">
                <Checkbox
                  checked={state.termsAccepted}
                  onCheckedChange={(v) => update({ termsAccepted: v === true })}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  By continuing, I agree to Reeve&apos;s{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>

              <Button
                onClick={handleSendOtp}
                disabled={!isEmailValid || !state.termsAccepted || state.isLoading}
                className="w-full min-h-[44px]"
              >
                {state.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Continue →
              </Button>
            </div>
          )}

          {/* ─── STEP 2: OTP ─── */}
          {state.step === "otp" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center">
                <h1 className="text-xl font-bold text-card-foreground">Check your inbox</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a 6-digit code to
                </p>
                <p className="mt-0.5 text-sm font-semibold text-card-foreground">
                  {state.email}
                </p>
              </div>

              <button
                onClick={() => {
                  update({ step: "email", otp: "", error: null });
                  if (cooldownRef.current) clearInterval(cooldownRef.current);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Wrong email? Go back
              </button>

              <div className="space-y-3">
                <Input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={state.otp}
                  onChange={handleOtpChange}
                  className="min-h-[48px] text-center text-2xl font-bold tracking-[0.5em]"
                />
                {state.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}
              </div>

              <Button
                onClick={() => handleVerifyOtp()}
                disabled={state.otp.length !== 6 || state.isLoading}
                className="w-full min-h-[44px]"
              >
                {state.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify
              </Button>

              <div className="text-center">
                {state.resendCooldown > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Resend in {state.resendCooldown}s...
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={state.isLoading}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 3: Name ─── */}
          {state.step === "name" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center">
                <h1 className="text-xl font-bold text-card-foreground">One last thing</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  What should we call you?
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  ref={nameRef}
                  type="text"
                  placeholder="Your full name"
                  value={state.fullName}
                  onChange={(e) => update({ fullName: e.target.value, error: null })}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className="min-h-[44px]"
                />
                {state.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}
              </div>

              <Button
                onClick={handleSaveName}
                disabled={state.fullName.trim().length < 2 || state.isLoading}
                className="w-full min-h-[44px]"
              >
                {state.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Get Started →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
