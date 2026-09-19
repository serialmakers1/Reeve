import React, { Suspense, useEffect } from "react";
import * as Sentry from '@sentry/react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SuspenseFallback } from "@/components/SuspenseFallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import { Navigate } from "react-router-dom";

// ── Eager imports (public cold-path — must load on first paint) ────────────────
import Index from "./pages/Index";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import PropertyServicesBangalore from "./pages/PropertyServicesBangalore";
import PropertyManagementBangalore from "./pages/PropertyManagementBangalore";
import VacantPropertyCareBangalore from "./pages/VacantPropertyCareBangalore";
import FindTenantBangalore from "./pages/FindTenantBangalore";
import NriPropertyServicesIndia from "./pages/NriPropertyServicesIndia";
import NriPropertySaleIndia from "./pages/NriPropertySaleIndia";
import NriRentTdsIndia from "./pages/NriRentTdsIndia";
import KhataTransferBangalore from "./pages/KhataTransferBangalore";

// ── Lazy imports ───────────────────────────────────────────────────────────────
const PropertyDetail         = React.lazy(() => import("./pages/PropertyDetail"));
const SearchBrowsePage       = React.lazy(() => import("./features/search/SearchBrowsePage"));

// Owner
const ListProperty           = React.lazy(() => import("./pages/ListProperty"));
const OwnerDashboard         = React.lazy(() => import("./pages/OwnerDashboard"));
const OwnerPropertyManagement = React.lazy(() => import("./pages/OwnerPropertyManagement"));
const Profile                = React.lazy(() => import("./pages/Profile"));
const Me                     = React.lazy(() => import("./pages/Me"));
const PublicProfile          = React.lazy(() => import("./pages/PublicProfile"));

// Tenant authenticated
const DashboardFavourites    = React.lazy(() => import("./pages/DashboardFavourites"));
const TenantPreferences      = React.lazy(() => import("./pages/TenantPreferences"));
const TenantDashboard        = React.lazy(() => import("./pages/TenantDashboard"));
const ContactRequestsPage    = React.lazy(() => import("./pages/ContactRequestsPage"));

// Google Maps provider — lazy so vis.gl code stays out of public-route initial bundles
const GoogleMapsProvider     = React.lazy(() => import("./components/GoogleMapsProvider"));

// Admin
const PropertyEdit           = React.lazy(() => import("./pages/admin/PropertyEdit"));
const AdminProperties        = React.lazy(() => import("./pages/admin/Properties"));
const ListingReviewQueue     = React.lazy(() => import("./pages/admin/ListingReviewQueue"));
const ListingReviewDetail    = React.lazy(() => import("./pages/admin/ListingReviewDetail"));
const Callbacks              = React.lazy(() => import("./pages/admin/Callbacks"));
const CommentModeration      = React.lazy(() => import("./pages/admin/CommentModeration"));
const InspectionsList        = React.lazy(() => import("./pages/admin/Inspections"));
const InspectionForm         = React.lazy(() => import("./pages/admin/InspectionForm"));

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

// ── Main app shell ─────────────────────────────────────────────────────────────
function AppInner() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' && !session) {
          const protectedPaths = [
            '/dashboard', '/owner', '/admin',
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
        <Route path="/login" element={<Login />} />
        <Route path="/search" element={<SearchBrowsePage />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/property-services-bangalore" element={<PropertyServicesBangalore />} />
        <Route path="/property-management-bangalore" element={<PropertyManagementBangalore />} />
        <Route path="/vacant-property-care-bangalore" element={<VacantPropertyCareBangalore />} />
        <Route path="/find-tenant-bangalore" element={<FindTenantBangalore />} />
        <Route path="/nri-property-services-india" element={<NriPropertyServicesIndia />} />
        <Route path="/nri-property-sale-india" element={<NriPropertySaleIndia />} />
        <Route path="/nri-rent-tds-india" element={<NriRentTdsIndia />} />
        <Route path="/khata-transfer-bangalore" element={<KhataTransferBangalore />} />
        <Route path="/owner-dashboard" element={<OwnerDashboard />} />
        <Route path="/owner-dashboard/property/:id" element={<OwnerPropertyManagement />} />
        {/* Google Maps provider — scoped to routes that need it */}
        <Route element={<GoogleMapsProvider />}>
          <Route path="/list" element={<ListProperty key="new" />} />
          <Route path="/list/:id" element={<ListPropertyEditWrapper />} />
          <Route path="/admin/properties/:id" element={<PropertyEdit />} />
        </Route>
        <Route path="/profile" element={<Profile />} />
        <Route path="/me" element={<Me />} />
        <Route path="/u/:userId" element={<PublicProfile />} />
        <Route path="/dashboard/favourites" element={<DashboardFavourites />} />
        <Route path="/tenant-dashboard" element={<TenantDashboard />} />
        <Route path="/tenant-dashboard/preferences" element={<TenantPreferences />} />
        <Route path="/tenant-dashboard/contact-requests" element={<ContactRequestsPage />} />
        <Route path="/admin" element={<Navigate to="/admin/properties" replace />} />
        <Route path="/admin/properties" element={<AdminProperties />} />
        <Route path="/admin/listing-reviews" element={<ListingReviewQueue />} />
        <Route path="/admin/listing-reviews/:type/:id" element={<ListingReviewDetail />} />
        <Route path="/admin/callbacks" element={<Callbacks />} />
        <Route path="/admin/comment-moderation" element={<CommentModeration />} />
        <Route path="/admin/inspections" element={<InspectionsList />} />
        <Route path="/admin/inspections/:inspectionId" element={<InspectionForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
            <AuthProvider>
              <AppInner />
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
