import React, { Suspense, useEffect } from "react";
import * as Sentry from '@sentry/react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { APIProvider } from '@vis.gl/react-google-maps';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SuspenseFallback } from "@/components/SuspenseFallback";
import { useVisitsRealtime } from "@/hooks/useVisitsRealtime";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import { Navigate } from "react-router-dom";

// ── Eager imports (public cold-path — must load on first paint) ────────────────
import Index from "./pages/Index";
import PmsHome from "./pages/PmsHome";
import Login from "./pages/Login";
import OwnerLandingPage from "./pages/OwnerLandingPage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import MoveInAudit from "./pages/MoveInAudit";
import PropertyServicesBangalore from "./pages/PropertyServicesBangalore";
import PropertyManagementBangalore from "./pages/PropertyManagementBangalore";
import VacantPropertyCareBangalore from "./pages/VacantPropertyCareBangalore";
import FindTenantBangalore from "./pages/FindTenantBangalore";
import NriPropertyServicesIndia from "./pages/NriPropertyServicesIndia";
import NriPropertySaleIndia from "./pages/NriPropertySaleIndia";

// ── Lazy imports ───────────────────────────────────────────────────────────────
const PropertyDetail         = React.lazy(() => import("./pages/PropertyDetail"));
const ReferProperty          = React.lazy(() => import("./pages/ReferProperty"));
const Eligibility            = React.lazy(() => import("./pages/Eligibility"));
const TenantSavingsCalculator = React.lazy(() => import("./pages/TenantSavingsCalculator"));
const OwnerSavingsCalculator = React.lazy(() => import("./pages/OwnerSavingsCalculator"));
const SearchBrowsePage       = React.lazy(() => import("./features/search/SearchBrowsePage"));
const OwnerClarityGuide      = React.lazy(() => import("./pages/OwnerClarityGuide"));

// Owner
const MyProperties           = React.lazy(() => import("./pages/MyProperties"));
const MyPropertyNew          = React.lazy(() => import("./pages/MyPropertyNew"));
const ListProperty           = React.lazy(() => import("./pages/ListProperty"));
const OwnerDashboard         = React.lazy(() => import("./pages/OwnerDashboard"));
const OwnerPropertyManagement = React.lazy(() => import("./pages/OwnerPropertyManagement"));
const MyPropertyDetail       = React.lazy(() => import("./pages/MyPropertyDetail"));
const OwnerApplicationDetail = React.lazy(() => import("./pages/OwnerApplicationDetail"));
const Profile                = React.lazy(() => import("./pages/Profile"));
const Me                     = React.lazy(() => import("./pages/Me"));
const PublicProfile          = React.lazy(() => import("./pages/PublicProfile"));

// Tenant authenticated
const Dashboard              = React.lazy(() => import("./pages/Dashboard"));
const DashboardFavourites    = React.lazy(() => import("./pages/DashboardFavourites"));
const ApplicationsList       = React.lazy(() => import("./pages/ApplicationsList"));
const NewApplication         = React.lazy(() => import("./pages/NewApplication"));
const ApplicationDetail      = React.lazy(() => import("./pages/ApplicationDetail"));
const VisitsList             = React.lazy(() => import("./pages/VisitsList"));
const TenantPreferences      = React.lazy(() => import("./pages/TenantPreferences"));
const TenantDashboard        = React.lazy(() => import("./pages/TenantDashboard"));
const ContactRequestsPage    = React.lazy(() => import("./pages/ContactRequestsPage"));

// Admin
const OwnerPipeline          = React.lazy(() => import("./pages/admin/OwnerPipeline"));
const PropertyEdit           = React.lazy(() => import("./pages/admin/PropertyEdit"));
const AdminProperties        = React.lazy(() => import("./pages/admin/Properties"));
const ListingReviewQueue     = React.lazy(() => import("./pages/admin/ListingReviewQueue"));
const ListingReviewDetail    = React.lazy(() => import("./pages/admin/ListingReviewDetail"));
const TenantPipeline         = React.lazy(() => import("./pages/admin/TenantPipeline"));
const AdminApplicationDetail = React.lazy(() => import("./pages/admin/ApplicationDetail"));
const InspectionsList        = React.lazy(() => import("./pages/admin/Inspections"));
const InspectionForm         = React.lazy(() => import("./pages/admin/InspectionForm"));
const Leads                  = React.lazy(() => import("./pages/admin/Leads"));
const FieldCalendar          = React.lazy(() => import("./pages/admin/FieldCalendar"));
const VisitLogs              = React.lazy(() => import("./pages/admin/VisitLogs"));
const Callbacks              = React.lazy(() => import("./pages/admin/Callbacks"));
const CommentModeration      = React.lazy(() => import("./pages/admin/CommentModeration"));

// ── QueryClient ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

// Forces ListProperty to remount when :id changes so useListingSave refs reset (D-102).
function ListPropertyEditWrapper() {
  const { id } = useParams<{ id: string }>();
  return <ListProperty key={id ?? "edit"} />;
}

// ── Realtime subscription — only mounted when authenticated ───────────────────
function VisitsRealtimeMount() {
  useVisitsRealtime();
  return null;
}

function AuthGatedRealtimeMount() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <VisitsRealtimeMount />;
}

// ── Main app shell ─────────────────────────────────────────────────────────────
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
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/pms" element={<PmsHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/search" element={<SearchBrowsePage />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/refer-property" element={<ReferProperty />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/savings/tenant" element={<TenantSavingsCalculator />} />
        <Route path="/savings/owner" element={<OwnerSavingsCalculator />} />
        <Route path="/owner/how-it-works" element={<OwnerClarityGuide />} />
        <Route path="/owners" element={<OwnerLandingPage />} />
        <Route path="/move-in-audit" element={<MoveInAudit />} />
        <Route path="/property-services-bangalore" element={<PropertyServicesBangalore />} />
        <Route path="/property-management-bangalore" element={<PropertyManagementBangalore />} />
        <Route path="/vacant-property-care-bangalore" element={<VacantPropertyCareBangalore />} />
        <Route path="/find-tenant-bangalore" element={<FindTenantBangalore />} />
        <Route path="/nri-property-services-india" element={<NriPropertyServicesIndia />} />
        <Route path="/nri-property-sale-india" element={<NriPropertySaleIndia />} />
        <Route path="/eligibility" element={<Eligibility />} />
        <Route path="/my-properties" element={<Navigate to="/owner-dashboard" replace />} />
        <Route path="/owner-dashboard" element={<OwnerDashboard />} />
        <Route path="/owner-dashboard/property/:id" element={<OwnerPropertyManagement />} />
        <Route path="/my-properties/new" element={<Navigate to="/list" replace />} />
        <Route path="/list" element={<ListProperty key="new" />} />
        <Route path="/list/:id" element={<ListPropertyEditWrapper />} />
        <Route path="/my-properties/:id" element={<MyPropertyDetail />} />
        <Route path="/my-properties/:propertyId/applications/:applicationId" element={<OwnerApplicationDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/me" element={<Me />} />
        <Route path="/u/:userId" element={<PublicProfile />} />
        <Route path="/owner" element={<Navigate to="/my-properties" replace />} />
        <Route path="/owner/dashboard" element={<Navigate to="/my-properties" replace />} />
        <Route path="/owner/properties/new" element={<Navigate to="/my-properties/new" replace />} />
        <Route path="/owner/properties/:id" element={<Navigate to="/my-properties" replace />} />
        <Route path="/owner/applications/:id" element={<Navigate to="/dashboard/applications" replace />} />
        <Route path="/dashboard" element={<Navigate to="/tenant-dashboard" replace />} />
        <Route path="/dashboard/favourites" element={<DashboardFavourites />} />
        <Route path="/dashboard/applications" element={<ApplicationsList />} />
        <Route path="/dashboard/applications/new" element={<NewApplication />} />
        <Route path="/dashboard/visits" element={<VisitsList />} />
        <Route path="/dashboard/applications/:id" element={<ApplicationDetail />} />
        <Route path="/tenant-dashboard" element={<TenantDashboard />} />
        <Route path="/tenant-dashboard/preferences" element={<TenantPreferences />} />
        <Route path="/tenant-dashboard/contact-requests" element={<ContactRequestsPage />} />
        <Route path="/admin" element={<Navigate to="/admin/owners" replace />} />
        <Route path="/admin/tenants" element={<Navigate to="/admin/applications" replace />} />
        <Route path="/admin/owners" element={<OwnerPipeline />} />
        <Route path="/admin/leads" element={<Leads />} />
        <Route path="/admin/properties" element={<AdminProperties />} />
        <Route path="/admin/properties/:id" element={<PropertyEdit />} />
        <Route path="/admin/listing-reviews" element={<ListingReviewQueue />} />
        <Route path="/admin/listing-reviews/:type/:id" element={<ListingReviewDetail />} />
        <Route path="/admin/inspections" element={<InspectionsList />} />
        <Route path="/admin/inspections/:propertyId" element={<InspectionForm />} />
        <Route path="/admin/calendar" element={<FieldCalendar />} />
        <Route path="/admin/visits" element={<VisitLogs />} />
        <Route path="/admin/callbacks" element={<Callbacks />} />
        <Route path="/admin/comment-moderation" element={<CommentModeration />} />
        <Route path="/admin/applications" element={<TenantPipeline />} />
        <Route path="/admin/applications/:id" element={<AdminApplicationDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh the page.</p>}>
    <QueryClientProvider client={queryClient}>
      <APIProvider
        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''}
        libraries={['places']}
      >
        <AuthGatedRealtimeMount />
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
      </APIProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
