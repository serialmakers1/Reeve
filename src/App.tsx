import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/dashboard/favourites" element={<DashboardFavourites />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
