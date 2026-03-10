import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import OwnerProfileTab from "@/components/owner/OwnerProfileTab";
import OwnerInspectionTab from "@/components/owner/OwnerInspectionTab";
import OwnerPropertiesTab from "@/components/owner/OwnerPropertiesTab";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();

  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Callback state (kept here so it persists across tab switches)
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customSlot, setCustomSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);
  const [existingSlot, setExistingSlot] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!authLoading && session?.user?.id) {
      (async () => {
        const userId = session.user.id;
        const { data } = await supabase
          .from("users")
          .select("full_name, phone, role")
          .eq("id", userId)
          .single();

        if (data) {
          if (!data.phone) {
            navigate("/owner/onboarding", { replace: true });
            return;
          }
          setUserName(data.full_name || "Owner");
          setUserPhone(data.phone || "");
        }

        const { data: existingCallback } = await supabase
          .from("callback_requests")
          .select("preferred_slot, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingCallback) {
          setExistingSlot(existingCallback.preferred_slot);
          setSelectedSlot(existingCallback.preferred_slot);
          setCallbackSubmitted(true);
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

    if (error) {
      setSubmitting(false);
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

  const userId = session?.user?.id || "";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Welcome, {userName}</h1>

          <Tabs defaultValue="properties">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="properties" className="text-xs sm:text-sm">Properties</TabsTrigger>
              <TabsTrigger value="applications" className="text-xs sm:text-sm">Applications</TabsTrigger>
              <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile</TabsTrigger>
              <TabsTrigger value="inspection" className="text-xs sm:text-sm">Inspection</TabsTrigger>
            </TabsList>

            <TabsContent value="properties">
              <OwnerPropertiesTab userId={userId} />
            </TabsContent>

            <TabsContent value="applications">
              <div className="py-8 text-center text-muted-foreground text-sm">
                No applications yet.
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <OwnerProfileTab userId={userId} />
            </TabsContent>

            <TabsContent value="inspection">
              <OwnerInspectionTab
                userId={userId}
                userPhone={userPhone}
                showCallbackForm={showCallbackForm}
                setShowCallbackForm={setShowCallbackForm}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                customSlot={customSlot}
                setCustomSlot={setCustomSlot}
                submitting={submitting}
                callbackSubmitted={callbackSubmitted}
                existingSlot={existingSlot}
                handleCallbackSubmit={handleCallbackSubmit}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
