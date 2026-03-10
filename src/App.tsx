import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import OwnerOnboarding from "./pages/OwnerOnboarding";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerPropertyDetail from "./pages/OwnerPropertyDetail";
import OwnerAddProperty from "./pages/OwnerAddProperty";
import VisitsList from "./pages/VisitsList";

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
      <Route path="/eligibility" element={<Eligibility />} />
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/onboarding" element={<OwnerOnboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/favourites" element={<DashboardFavourites />} />
      <Route path="/dashboard/applications" element={<ApplicationsList />} />
      <Route path="/dashboard/applications/new" element={<NewApplication />} />
      <Route path="/dashboard/visits" element={<VisitsList />} />
      <Route path="/dashboard/applications/:id" element={<ApplicationDetail />} />
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
        <AppInner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
