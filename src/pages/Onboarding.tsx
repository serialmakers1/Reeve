import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const { user, session, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (user?.onboarding_completed) {
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate, redirectTo]);

  // Pre-fill name if already set
  useEffect(() => {
    if (user?.full_name && user.full_name.trim() !== "") {
      setFullName(user.full_name);
    }
  }, [user]);

  const handleSubmit = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.replace(/\D/g, "");

    if (trimmedName.length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (trimmedPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const userId = currentSession?.user?.id;
    if (!userId) {
      setError("Session expired. Please log in again.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          phone: "+91" + trimmedPhone,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Onboarding save error:', error.message, (error as any).code, (error as any).details, (error as any).hint);
        throw error;
      }

      const redirectTo = new URLSearchParams(window.location.search).get('redirectTo') ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      setError('Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
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
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-5">
              <div className="text-center">
                <h1 className="text-xl font-bold text-card-foreground">Complete Your Profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Just a few details to get you started
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground">
                    Full name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="mt-1 min-h-[44px]"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-card-foreground">
                    Phone number <span className="text-destructive">*</span>
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex h-[44px] items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground select-none">
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
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                onClick={handleSubmit}
                disabled={saving || fullName.trim().length < 2 || phone.replace(/\D/g, "").length !== 10}
                className="w-full min-h-[44px]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
