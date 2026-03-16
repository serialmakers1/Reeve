import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return; // not logged in — per-page guards handle this

      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userData && userData.onboarding_completed === false) {
        navigate('/onboarding', { replace: true });
      }
    };
    check();
  }, [navigate]);

  return <>{children}</>;
};
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import NotFound from "./pages/NotFound";
import TenantSavingsCalculator from "./pages/TenantSavingsCalculator";
import OwnerSavingsCalculator from "./pages/OwnerSavingsCalculator";
import Search from "./pages/Search";
import ReferProperty from "./pages/ReferProperty";
import Eligibility from "./pages/Eligibility";
import PropertyDetail from "./pages/PropertyDetail";
import DashboardFavourites from "./pages/DashboardFavourites";
import Login from "./pages/Login";
import NewApplication from "./pages/NewApplication";
import Dashboard from "./pages/Dashboard";
import ApplicationsList from "./pages/ApplicationsList";
import ApplicationDetail from "./pages/ApplicationDetail";
import VisitsList from "./pages/VisitsList";
import OwnerPipeline from "./pages/admin/OwnerPipeline";
import PropertyEdit from "./pages/admin/PropertyEdit";
import TenantPipeline from "./pages/admin/TenantPipeline";
import AdminApplicationDetail from "./pages/admin/ApplicationDetail";
import Onboarding from "./pages/Onboarding";
import MyProperties from "./pages/MyProperties";
import MyPropertyNew from "./pages/MyPropertyNew";
import MyPropertyDetail from "./pages/MyPropertyDetail";
import Profile from "./pages/Profile";
import OwnerApplicationDetail from "./pages/OwnerApplicationDetail";
import { Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function AppInner() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' && !session) {
          const protectedPaths = [
            '/dashboard', '/owner', '/admin',
            '/eligibility', '/refer-property'
          ];
          const isProtected = protectedPaths.some(p =>
            window.location.pathname.startsWith(p)
          );
          if (isProtected) {
            window.location.href = `/login?returnTo=${encodeURIComponent(
              window.location.pathname
            )}`;
          }
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/search" element={<Search />} />
      <Route path="/property/:id" element={<PropertyDetail />} />
      <Route path="/refer-property" element={<ReferProperty />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/refund" element={<Refund />} />
      <Route path="/savings/tenant" element={<TenantSavingsCalculator />} />
      <Route path="/savings/owner" element={<OwnerSavingsCalculator />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/eligibility" element={<OnboardingGuard><Eligibility /></OnboardingGuard>} />
      <Route path="/my-properties" element={<OnboardingGuard><MyProperties /></OnboardingGuard>} />
      <Route path="/my-properties/new" element={<OnboardingGuard><MyPropertyNew /></OnboardingGuard>} />
      <Route path="/my-properties/:id" element={<OnboardingGuard><MyPropertyDetail /></OnboardingGuard>} />
      <Route path="/my-properties/:propertyId/applications/:applicationId" element={<OnboardingGuard><OwnerApplicationDetail /></OnboardingGuard>} />
      <Route path="/profile" element={<OnboardingGuard><Profile /></OnboardingGuard>} />
      <Route path="/owner" element={<Navigate to="/my-properties" replace />} />
      <Route path="/owner/dashboard" element={<Navigate to="/my-properties" replace />} />
      <Route path="/owner/properties/new" element={<Navigate to="/my-properties/new" replace />} />
      <Route path="/owner/properties/:id" element={<Navigate to="/my-properties" replace />} />
      <Route path="/owner/applications/:id" element={<Navigate to="/dashboard/applications" replace />} />
      <Route path="/owner/onboarding" element={<Navigate to="/onboarding" replace />} />
      <Route path="/dashboard" element={<OnboardingGuard><Dashboard /></OnboardingGuard>} />
      <Route path="/dashboard/favourites" element={<OnboardingGuard><DashboardFavourites /></OnboardingGuard>} />
      <Route path="/dashboard/applications" element={<OnboardingGuard><ApplicationsList /></OnboardingGuard>} />
      <Route path="/dashboard/applications/new" element={<OnboardingGuard><NewApplication /></OnboardingGuard>} />
      <Route path="/dashboard/visits" element={<OnboardingGuard><VisitsList /></OnboardingGuard>} />
      <Route path="/dashboard/applications/:id" element={<OnboardingGuard><ApplicationDetail /></OnboardingGuard>} />
      <Route path="/admin" element={<Navigate to="/admin/owners" replace />} />
      <Route path="/admin/owners" element={<OnboardingGuard><OwnerPipeline /></OnboardingGuard>} />
      <Route path="/admin/properties/:id" element={<OnboardingGuard><PropertyEdit /></OnboardingGuard>} />
      <Route path="/admin/applications" element={<OnboardingGuard><TenantPipeline /></OnboardingGuard>} />
      <Route path="/admin/applications/:id" element={<OnboardingGuard><AdminApplicationDetail /></OnboardingGuard>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AppInner />
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
