import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRouteForRole } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";
import Mailcheck from "mailcheck";

type LoginStep = "email" | "otp";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) return;
    redirectByRole(user.role, user.onboarding_completed);
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const REGULAR_USER_ROLES = new Set(['user', 'tenant', 'owner']);

  const redirectByRole = useCallback((role: string | null | undefined, onboardingCompleted: boolean) => {
    const safeRole = role || "user";
    // Non-regular roles (admin, super_admin) bypass onboarding entirely
    if (!REGULAR_USER_ROLES.has(safeRole)) {
      navigate(returnTo || getDefaultRouteForRole(safeRole), { replace: true });
      return;
    }
    // Regular users: check onboarding first
    if (!onboardingCompleted) {
      const dest = returnTo ? `/onboarding?redirectTo=${encodeURIComponent(returnTo)}` : '/onboarding';
      navigate(dest, { replace: true });
      return;
    }
    navigate(returnTo || getDefaultRouteForRole(safeRole), { replace: true });
  }, [navigate, returnTo]);

  const isRateLimitError = (msg: string) =>
    /429|security purposes|rate.?limit/i.test(msg);

  const RATE_LIMIT_MSG =
    "Please wait a moment before requesting a new code. Try again in 60 seconds.";

  const startCooldown = () => {
    setResendCooldown(60);
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

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    if (!suggestionDismissed) {
      let hasSuggestion = false;
      Mailcheck.run({
        email: trimmedEmail,
        suggested: (suggestion: { full: string }) => {
          setEmailSuggestion(suggestion.full);
          hasSuggestion = true;
        },
        empty: () => setEmailSuggestion(null),
      });
      if (hasSuggestion) return;
    }

    setIsLoading(true);
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: { shouldCreateUser: true },
    });

    if (otpError) {
      setIsLoading(false);
      if (isRateLimitError(otpError.message || "")) {
        setError(RATE_LIMIT_MSG);
        startCooldown();
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    setIsLoading(false);
    setStep("otp");
    startCooldown();
  };

  // Step 2: Verify OTP — single submission only
  const handleVerifyOtp = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: "email",
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid or expired code. Please try again.");
        setOtp("");
        otpRef.current?.focus();
        return;
      }

      if (data?.user) {
        // Ensure user row exists in public.users
        const { error: rpcError } = await supabase.rpc('ensure_user_exists');
        if (rpcError) console.error('ensure_user_exists failed:', rpcError);

        // Fetch user record
        const { data: userData } = await supabase
          .from('users')
          .select('role, onboarding_completed')
          .eq('id', data.user.id)
          .maybeSingle();

        navigate('/', { replace: true });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setIsLoading(false);
    if (resendError) {
      if (isRateLimitError(resendError.message || "")) {
        setError(RATE_LIMIT_MSG);
        startCooldown();
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }
    setOtp("");
    startCooldown();
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
    setError(null);
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center px-4 py-3 sm:py-4">
          <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
            REEVE
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

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
                  onChange={(e) => { setEmail(e.target.value); setError(null); setEmailError(null); setEmailSuggestion(null); setSuggestionDismissed(false); }}
                  onBlur={() => {
                    if (!email.trim()) return;
                    Mailcheck.run({
                      email: email.trim(),
                      suggested: (suggestion: { full: string }) => {
                        setEmailSuggestion(suggestion.full);
                      },
                      empty: () => {
                        setEmailSuggestion(null);
                      },
                    });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="min-h-[44px]"
                />
                {emailSuggestion && (
                  <p className="text-sm text-amber-600 mt-1">
                    Did you mean{' '}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => {
                        setEmail(emailSuggestion);
                        setEmailSuggestion(null);
                        setSuggestionDismissed(false);
                      }}
                    >
                      {emailSuggestion}
                    </button>
                    ?{' '}
                    <button
                      type="button"
                      className="text-gray-400 underline text-xs ml-2"
                      onClick={() => {
                        setEmailSuggestion(null);
                        setSuggestionDismissed(true);
                      }}
                    >
                      No, this is correct
                    </button>
                  </p>
                )}
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
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
                  onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && handleVerifyOtp()}
                  disabled={isVerifying}
                  className="min-h-[48px] text-center text-2xl font-bold tracking-[0.5em]"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || isVerifying}
                className="w-full min-h-[44px]"
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-muted-foreground">Resend code in {resendCooldown}s</p>
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
        </div>
      </div>
      </div>
    </div>
  );
}
