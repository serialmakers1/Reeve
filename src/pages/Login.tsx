import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSafeReturnTo, getDefaultRouteForRole } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";

type LoginStep = "email" | "otp" | "name";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "otp") otpRef.current?.focus();
    if (step === "name") nameRef.current?.focus();
  }, [step]);

  // Redirect if already authenticated with a name
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) return;
    if (!user.full_name || user.full_name.trim() === "") {
      setStep("name");
      return;
    }
    const safeReturn = getSafeReturnTo(returnTo);
    if (returnTo) {
      navigate(safeReturn, { replace: true });
    } else {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate, returnTo]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const redirectByRole = useCallback(
    (role: string | null | undefined) => {
      const safeReturn = getSafeReturnTo(returnTo);
      if (returnTo) {
        navigate(safeReturn, { replace: true });
        return;
      }
      navigate(getDefaultRouteForRole(role), { replace: true });
    },
    [navigate, returnTo]
  );

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: { shouldCreateUser: true },
    });

    if (otpError) {
      setIsLoading(false);
      setError("Something went wrong. Please try again.");
      return;
    }

    setIsLoading(false);
    setStep("otp");
    startCooldown();
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (otpValue?: string) => {
    const code = otpValue ?? otp;
    if (code.length !== 6) return;

    setIsLoading(true);
    setError(null);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });

    if (verifyError || !data.user) {
      setIsLoading(false);
      setError("Invalid or expired code. Please try again.");
      setOtp("");
      otpRef.current?.focus();
      return;
    }

    setIsLoading(false);
    // useAuth will detect sign-in and the redirect useEffect handles the rest
  };

  // Step 2: Resend
  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setIsLoading(false);
    if (resendError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    startCooldown();
  };

  // Step 3: Save name
  const handleSaveName = async () => {
    const name = fullName.trim();
    if (name.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!user) {
      setError("Session expired. Please start over.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({ full_name: name, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      setIsLoading(false);
      setError("Could not save your name. Please try again.");
      return;
    }

    setIsLoading(false);
    await refreshUser();
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
    setError(null);
    if (val.length === 6) handleVerifyOtp(val);
  };

  const isEmailValid = EMAIL_REGEX.test(email.trim());

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="text-3xl font-bold tracking-tight text-primary">
            REEVE
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {/* Step 1: Email */}
          {step === "email" && (
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
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="min-h-[44px]"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <label className="flex items-start gap-2.5">
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(v === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  By continuing, I agree to Reeve&apos;s{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
                    Terms of Service
                  </a>{" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
                    Privacy Policy
                  </a>
                </span>
              </label>

              <Button
                onClick={handleSendOtp}
                disabled={!isEmailValid || !termsAccepted || isLoading}
                className="w-full min-h-[44px]"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center">
                <h1 className="text-xl font-bold text-card-foreground">Check your inbox</h1>
                <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to</p>
                <p className="mt-0.5 text-sm font-semibold text-card-foreground">{email}</p>
              </div>

              <button
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
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
                  value={otp}
                  onChange={handleOtpChange}
                  className="min-h-[48px] text-center text-2xl font-bold tracking-[0.5em]"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button
                onClick={() => handleVerifyOtp()}
                disabled={otp.length !== 6 || isLoading}
                className="w-full min-h-[44px]"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend in {resendCooldown}s...</p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Name */}
          {step === "name" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center">
                <h1 className="text-xl font-bold text-card-foreground">What should we call you?</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your full name to get started</p>
              </div>

              <div className="space-y-3">
                <Input
                  ref={nameRef}
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className="min-h-[44px]"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button
                onClick={handleSaveName}
                disabled={fullName.trim().length < 2 || isLoading}
                className="w-full min-h-[44px]"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
