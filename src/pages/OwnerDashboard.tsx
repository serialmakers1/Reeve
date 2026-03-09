import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Phone, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TIME_SLOTS = [
  "9:00 AM – 12:00 PM",
  "12:00 PM – 3:00 PM",
  "3:00 PM – 6:00 PM",
  "6:00 PM – 9:00 PM",
  "Other (specify)",
];

const WHATSAPP_URL =
  "https://wa.me/917899874281?text=Hi%2C%20I%27m%20interested%20in%20listing%20my%20property%20with%20Reeve";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();

  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Callback state
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customSlot, setCustomSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!authLoading && session?.user?.id) {
      (async () => {
        const { data } = await supabase
          .from("users")
          .select("full_name, phone, role")
          .eq("id", session.user.id)
          .single();

        if (data) {
          if (!data.phone) {
            navigate("/owner/onboarding", { replace: true });
            return;
          }
          setUserName(data.full_name || "Owner");
          setUserPhone(data.phone || "");
        }
        setLoadingProfile(false);
      })();
    }
  }, [authLoading, isAuthenticated, session, navigate]);

  const handleCallbackSubmit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);

    const userId = session?.user?.id;
    if (!userId) {
      toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("callback_requests").insert({
      user_id: userId,
      phone: userPhone,
      preferred_slot: selectedSlot,
      custom_slot: selectedSlot === "Other (specify)" ? customSlot.trim() : null,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      return;
    }

    setCallbackSubmitted(true);
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displaySlot =
    selectedSlot === "Other (specify)" && customSlot.trim()
      ? customSlot.trim()
      : selectedSlot;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center px-4 py-3 sm:py-4">
          <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
            REEVE
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, {userName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We've received your property details. Our team will be in touch shortly to schedule an inspection.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* WhatsApp Card */}
            <Card className="border-2" style={{ borderColor: "#25D366" }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" style={{ color: "#25D366" }} />
                  <CardTitle className="text-base">Chat with Us on WhatsApp</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Prefer to talk it through? Message us directly and our team will guide you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] font-medium"
                  style={{ borderColor: "#25D366", color: "#25D366" }}
                  onClick={() => window.open(WHATSAPP_URL, "_blank")}
                >
                  Open WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Callback Card */}
            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <CardTitle className="text-base text-primary-foreground">Request a Callback</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!showCallbackForm && !callbackSubmitted && (
                  <Button
                    variant="secondary"
                    className="w-full min-h-[44px]"
                    onClick={() => setShowCallbackForm(true)}
                  >
                    Schedule a Callback
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expanded callback form */}
          {showCallbackForm && !callbackSubmitted && (
            <Card className="animate-in fade-in slide-in-from-top-2 duration-300">
              <CardContent className="pt-6 space-y-4">
                <label className="text-sm font-medium text-card-foreground">
                  Preferred Callback Time <span className="text-destructive">*</span>
                </label>

                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => { setSelectedSlot(slot); }}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                        selectedSlot === slot
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                {selectedSlot === "Other (specify)" && (
                  <Input
                    type="text"
                    placeholder="Enter your preferred time"
                    value={customSlot}
                    onChange={(e) => setCustomSlot(e.target.value)}
                    className="min-h-[44px]"
                  />
                )}

                <p className="text-xs text-muted-foreground">
                  We only call when you request it. No spam calls.
                </p>

                <Button
                  onClick={handleCallbackSubmit}
                  disabled={!selectedSlot || submitting || (selectedSlot === "Other (specify)" && !customSlot.trim())}
                  className="w-full min-h-[44px]"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Callback Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Callback success state */}
          {callbackSubmitted && (
            <Card className="animate-in fade-in duration-300">
              <CardContent className="pt-6 text-center space-y-3">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                <h3 className="text-lg font-bold text-card-foreground">We'll call you soon!</h3>
                <p className="text-sm text-muted-foreground">
                  Your callback request has been received. Our team will call you at{" "}
                  <span className="font-medium text-card-foreground">{userPhone}</span> between{" "}
                  <span className="font-medium text-card-foreground">{displaySlot}</span>.
                </p>
                <p className="text-xs text-muted-foreground">
                  In the meantime, feel free to chat with us on WhatsApp.
                </p>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  style={{ borderColor: "#25D366", color: "#25D366" }}
                  onClick={() => window.open(WHATSAPP_URL, "_blank")}
                >
                  Open WhatsApp
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
