import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import OwnerProfileTab from "@/components/owner/OwnerProfileTab";
import OwnerInspectionTab from "@/components/owner/OwnerInspectionTab";
import OwnerPropertiesTab from "@/components/owner/OwnerPropertiesTab";
import OwnerApplicationsTab from "@/components/owner/OwnerApplicationsTab";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();

  const [userName, setUserName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

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
        }

        setLoadingProfile(false);
      })();
    }
  }, [authLoading, isAuthenticated, session, navigate]);

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
              <OwnerApplicationsTab userId={userId} />
            </TabsContent>

            <TabsContent value="profile">
              <OwnerProfileTab userId={userId} />
            </TabsContent>

            <TabsContent value="inspection">
              <OwnerInspectionTab userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
