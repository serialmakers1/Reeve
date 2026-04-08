import React, { useEffect } from "react";
import * as Sentry from '@sentry/react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Contact from "./pages/Contact";
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
import AdminProperties from "./pages/admin/Properties";
import TenantPipeline from "./pages/admin/TenantPipeline";
import AdminApplicationDetail from "./pages/admin/ApplicationDetail";
import MyProperties from "./pages/MyProperties";
import MyPropertyNew from "./pages/MyPropertyNew";
import MyPropertyDetail from "./pages/MyPropertyDetail";
import Profile from "./pages/Profile";
import OwnerApplicationDetail from "./pages/OwnerApplicationDetail";
import InspectionsList from "./pages/admin/Inspections";
import InspectionForm from "./pages/admin/InspectionForm";
import Leads from "./pages/admin/Leads";
import FieldCalendar from "./pages/admin/FieldCalendar";
import VisitLogs from "./pages/admin/VisitLogs";
import Callbacks from "./pages/admin/Callbacks";
import { Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";

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
      <Route path="/contact" element={<Contact />} />
      <Route path="/savings/tenant" element={<TenantSavingsCalculator />} />
      <Route path="/savings/owner" element={<OwnerSavingsCalculator />} />
      <Route path="/eligibility" element={<Eligibility />} />
      <Route path="/my-properties" element={<MyProperties />} />
      <Route path="/my-properties/new" element={<MyPropertyNew />} />
      <Route path="/my-properties/:id" element={<MyPropertyDetail />} />
      <Route path="/my-properties/:propertyId/applications/:applicationId" element={<OwnerApplicationDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/owner" element={<Navigate to="/my-properties" replace />} />
      <Route path="/owner/dashboard" element={<Navigate to="/my-properties" replace />} />
      <Route path="/owner/properties/new" element={<Navigate to="/my-properties/new" replace />} />
      <Route path="/owner/properties/:id" element={<Navigate to="/my-properties" replace />} />
      <Route path="/owner/applications/:id" element={<Navigate to="/dashboard/applications" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/favourites" element={<DashboardFavourites />} />
      <Route path="/dashboard/applications" element={<ApplicationsList />} />
      <Route path="/dashboard/applications/new" element={<NewApplication />} />
      <Route path="/dashboard/visits" element={<VisitsList />} />
      <Route path="/dashboard/applications/:id" element={<ApplicationDetail />} />
      <Route path="/admin" element={<Navigate to="/admin/owners" replace />} />
      <Route path="/admin/tenants" element={<Navigate to="/admin/applications" replace />} />
      <Route path="/admin/owners" element={<OwnerPipeline />} />
      <Route path="/admin/leads" element={<Leads />} />
      <Route path="/admin/properties" element={<AdminProperties />} />
      <Route path="/admin/properties/:id" element={<PropertyEdit />} />
      <Route path="/admin/inspections" element={<InspectionsList />} />
      <Route path="/admin/inspections/:propertyId" element={<InspectionForm />} />
      <Route path="/admin/calendar" element={<FieldCalendar />} />
      <Route path="/admin/visits" element={<VisitLogs />} />
      <Route path="/admin/callbacks" element={<Callbacks />} />
      <Route path="/admin/applications" element={<TenantPipeline />} />
      <Route path="/admin/applications/:id" element={<AdminApplicationDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh the page.</p>}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ErrorBoundary>
            <AppInner />
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
