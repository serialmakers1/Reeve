import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import posthog from "posthog-js";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

type LoginStep = "phone" | "otp";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [resendUsed, setResendUsed] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyAttemptRef = useRef(0);
  const fallbackShownRef = useRef(false);

  useEffect(() => {
    if (step === "phone") phoneRef.current?.focus();
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  // Redirect if already authenticated — does not require user row to be loaded
  // since role-based routing was removed. Fires as soon as session is confirmed.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    navigate(returnTo || "/", { replace: true });
  }, [authLoading, isAuthenticated, navigate, returnTo]);

  // Fire sms_fallback_shown once when fallback becomes visible
  useEffect(() => {
    if (resendUsed && resendCooldown === 0 && !fallbackShownRef.current) {
      fallbackShownRef.current = true;
      posthog?.capture("sms_fallback_shown", { method: "phone_otp" });
    }
  }, [resendUsed, resendCooldown]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const isRateLimitError = (msg: string) =>
    /429|security purposes|rate.?limit/i.test(msg);

  const RATE_LIMIT_MSG =
    "Please wait a moment before requesting a new code. Try again in 60 seconds.";

  const startCooldown = () => {
    setResendCooldown(120);
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(val);
    setError(null);
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (phone.length !== 10) return;
    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: "+91" + phone,
    });

    setIsLoading(false);

    if (otpError) {
      if (isRateLimitError(otpError.message || "")) {
        setError(RATE_LIMIT_MSG);
        startCooldown();
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    setStep("otp");
    posthog?.capture("signup_initiated", { method: "phone_otp" });
    startCooldown();
  };

  // Step 2: Verify OTP — single submission only
  const handleVerifyOtp = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: "+91" + phone,
        token: otp,
        type: "sms",
      });

      if (verifyError) {
        verifyAttemptRef.current += 1;
        posthog?.capture("otp_verification_failed", {
          method: "phone_otp",
          attempt: verifyAttemptRef.current,
        });
        setError(verifyError.message || "Invalid or expired code. Please try again.");
        setOtp("");
        otpRef.current?.focus();
        return;
      }

      if (data?.user) {
        const isNewUser = !data.user?.user_metadata?.full_name;
        posthog?.capture(isNewUser ? "signup_completed" : "login_completed", {
          method: "phone_otp",
        });
        navigate(returnTo || "/", { replace: true });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    posthog?.capture("otp_resend_requested", { method: "phone_otp" });

    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone: "+91" + phone,
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
    setResendUsed(true);
    startCooldown();
  };

  // Google OAuth
  const handleGoogleAuth = async () => {
    posthog?.capture("google_oauth_initiated");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          window.location.origin +
          "/login?returnTo=" +
          encodeURIComponent(returnTo || "/"),
      },
    });
    if (oauthError) {
      posthog?.capture("google_oauth_failed");
      setError("Google sign-in failed. Please try again.");
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
    setError(null);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showFallback = resendUsed && resendCooldown === 0;

  return (
    <Layout>
      {/* Split-screen wrapper: flex-col on mobile (right panel stacks above), flex-row on desktop */}
      <div className="flex flex-1 flex-col md:flex-row">

        {/* ── RIGHT PANEL (appears first in DOM → stacks above card on mobile) ── */}
        <div className="order-1 md:order-2 md:w-[60%] bg-[#F7F7F5] flex flex-col justify-center px-6 py-10 md:px-14 md:py-16 gap-10">

          {/* Section 1 — headline */}
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              Bangalore's trust layer for rentals
            </span>
            <h2 className="text-3xl md:text-4xl font-serif leading-tight text-gray-900">
              Renting,{" "}
              <em className="text-blue-600 not-italic font-serif" style={{ fontStyle: "italic" }}>without</em>
              {" "}the chaos.
            </h2>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-lg">
              No broker. No spam calls. No drama. Just a verified property, a fair agreement, and someone to call when things go wrong.
            </p>
          </div>

          {/* Section 2 — two side-by-side feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* For Tenants */}
            <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-600">• For Tenants</p>
              <ul className="space-y-2">
                {[
                  "Zero brokerage, always",
                  "2-month deposit only",
                  "No calls unless you ask",
                  "Maintenance handled by us",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* For Owners */}
            <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-600">• For Owners</p>
              <ul className="space-y-2">
                {[
                  "Only verified tenants reach you",
                  "Free listing, tenant pays the fee",
                  "No spam calls on listing",
                  "Free Property Management Service",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 3 — social proof strip */}
          <div className="rounded-xl bg-gray-100/80 border border-gray-200 px-5 py-4 flex items-center gap-4">
            {/* Overlapping avatars */}
            <div className="flex -space-x-2 shrink-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white ring-2 ring-white">RK</span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-400 text-xs font-bold text-white ring-2 ring-white">AM</span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-400 text-xs font-bold text-white ring-2 ring-white">SP</span>
            </div>
            <p className="text-sm text-gray-700 leading-snug">
              <span className="font-semibold text-gray-900">12 families</span> moved in this month without paying a rupee of brokerage
            </p>
          </div>
        </div>

        {/* ── LEFT PANEL ── */}
        <div className="order-2 md:order-1 md:w-[40%] bg-white flex flex-col items-center justify-center px-6 py-8 md:py-12">
          <div className="w-full max-w-sm space-y-4">

            {/* Zero Spam block — above the card */}
            <div className="rounded-xl bg-green-900 px-4 py-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-300 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-green-100 tracking-wide">Zero Spam. Guaranteed.</span>
              </div>
              <p className="text-xs text-green-300 leading-relaxed pl-6">
                "You searched for a flat once. They're still calling. We won't."
              </p>
            </div>

            {/* Existing card — completely unchanged */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">

              {/* Step 1: Phone */}
              {step === "phone" && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="text-center">
                    <h1 className="text-xl font-bold text-card-foreground">Welcome to Reeve</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter your mobile number to continue
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex">
                      <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                        +91
                      </span>
                      <Input
                        ref={phoneRef}
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210"
                        maxLength={10}
                        value={phone}
                        onChange={handlePhoneChange}
                        onKeyDown={(e) => e.key === "Enter" && phone.length === 10 && handleSendOtp()}
                        className="min-h-[44px] rounded-l-none"
                      />
                    </div>
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
                    disabled={phone.length !== 10 || !termsAccepted || isLoading}
                    className="w-full min-h-[44px]"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 border-t border-border" />
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGoogleAuth}
                    className="w-full min-h-[44px] gap-2"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              )}

              {/* Step 2: OTP */}
              {step === "otp" && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="text-center">
                    <h1 className="text-xl font-bold text-card-foreground">Check your messages</h1>
                    <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to</p>
                    <p className="mt-0.5 text-sm font-semibold text-card-foreground">+91 {phone}</p>
                  </div>

                  <button
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError(null);
                      setResendUsed(false);
                      fallbackShownRef.current = false;
                      if (cooldownRef.current) clearInterval(cooldownRef.current);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" /> Wrong number? Go back
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

                  {/* SMS fallback: shown after resend has been used and cooldown completes */}
                  {showFallback && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <p className="text-center text-xs text-muted-foreground">
                        Still not receiving the code? Try signing in with Google instead
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleGoogleAuth}
                        className="w-full min-h-[44px] gap-2 border-primary text-primary hover:bg-primary/5"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
