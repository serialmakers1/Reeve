import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import posthog from "posthog-js";
import logo from "@/assets/Logo.svg";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, ChevronDown, User } from "lucide-react";

const PROPERTY_SERVICES = [
  { label: "All Property Services", helper: "Choose the right service for your property", to: "/property-services-bangalore" },
  { label: "Reeve Managed",         helper: "Ongoing property management",                to: "/property-management-bangalore" },
  { label: "Reeve Watch",           helper: "Care for vacant properties",                 to: "/vacant-property-care-bangalore" },
  { label: "Reeve Let",             helper: "One-time tenant placement",                  to: "/find-tenant-bangalore" },
];

const SERVICE_PATHS = PROPERTY_SERVICES.map(s => s.to);

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileServicesOpen, setIsMobileServicesOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const servicesTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const accountTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAuthenticated, signOut } = useAuth();

  useEffect(() => () => {
    clearTimeout(servicesTimerRef.current);
    clearTimeout(accountTimerRef.current);
  }, []);

  const isServiceActive = SERVICE_PATHS.includes(location.pathname);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileServicesOpen(false);
  };

  const toggleMobileMenu = () => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
    } else {
      setIsMobileServicesOpen(false);
      setIsMobileMenuOpen(true);
    }
  };

  // Mutual-exclusion handlers — work for hover, click, and keyboard
  const handleServicesOpenChange = (open: boolean) => {
    if (open) {
      clearTimeout(accountTimerRef.current);
      setAccountOpen(false);
    }
    setServicesOpen(open);
  };

  const handleAccountOpenChange = (open: boolean) => {
    if (open) {
      clearTimeout(servicesTimerRef.current);
      setServicesOpen(false);
    }
    setAccountOpen(open);
  };

  // Hover handlers with 100ms pointer bridge
  const handleServicesEnter = () => {
    clearTimeout(servicesTimerRef.current);
    handleServicesOpenChange(true);
  };
  const handleServicesLeave = () => {
    servicesTimerRef.current = setTimeout(() => setServicesOpen(false), 100);
  };

  const handleAccountEnter = () => {
    clearTimeout(accountTimerRef.current);
    handleAccountOpenChange(true);
  };
  const handleAccountLeave = () => {
    accountTimerRef.current = setTimeout(() => setAccountOpen(false), 100);
  };

  const handleLogout = async () => {
    closeMobileMenu();
    await signOut();
    navigate("/");
  };

  const displayName = user?.full_name?.split(" ")[0] || user?.email || "Account";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img src={logo} alt="Reeve" className="h-7 w-auto" width={28} height={28} />
          </Link>

          {/* Desktop nav — centre */}
          <div className="hidden md:flex items-center gap-8">

            {/* Browse Properties */}
            <Link
              to="/search"
              aria-current={location.pathname === "/search" ? "page" : undefined}
              className={`text-sm font-medium transition-colors duration-150 ${
                location.pathname === "/search"
                  ? "text-[#0057F2] underline decoration-2 underline-offset-4"
                  : "text-gray-600 hover:text-[#0A1628]"
              }`}
            >
              Browse Properties
            </Link>

            {/* Property Services — split Link + chevron */}
            <div
              className="relative flex items-center gap-0.5"
              onMouseEnter={handleServicesEnter}
              onMouseLeave={handleServicesLeave}
            >
              <Link
                to="/property-services-bangalore"
                onClick={() => setServicesOpen(false)}
                aria-current={location.pathname === "/property-services-bangalore" ? "page" : undefined}
                className={`text-sm font-medium transition-colors duration-150 ${
                  isServiceActive ? "text-[#0057F2]" : "text-gray-600 hover:text-[#0A1628]"
                }`}
              >
                Property Services
              </Link>

              {isServiceActive && (
                <span className="absolute -bottom-[18px] left-0 right-5 h-0.5 bg-[#0057F2] rounded-full" />
              )}

              <DropdownMenu modal={false} open={servicesOpen} onOpenChange={handleServicesOpenChange}>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Open Property Services menu"
                    aria-expanded={servicesOpen}
                    aria-haspopup="true"
                    className={`p-0.5 rounded transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2] ${
                      isServiceActive ? "text-[#0057F2]" : "text-gray-500 hover:text-[#0A1628]"
                    }`}
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none ${servicesOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-[320px] rounded-[13px] border border-[#E8E6E1] bg-[#FFFDFC] p-2 shadow-[0_14px_36px_rgba(10,22,40,0.14)]
                             data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1
                             data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1
                             motion-reduce:animate-none"
                  onMouseEnter={handleServicesEnter}
                  onMouseLeave={handleServicesLeave}
                >
                  {/* Hub — All Property Services */}
                  <DropdownMenuItem asChild>
                    <Link
                      to={PROPERTY_SERVICES[0].to}
                      onClick={() => setServicesOpen(false)}
                      className={`group flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 cursor-pointer select-none
                        hover:bg-[#F7F9FC] transition-colors duration-150 focus-visible:outline-none focus-visible:bg-[#F7F9FC]
                        ${location.pathname === PROPERTY_SERVICES[0].to ? "bg-[#F2F6FF]" : ""}`}
                    >
                      <span className={`text-sm font-semibold leading-snug transition-colors duration-150
                        group-hover:text-[#0057F2]
                        ${location.pathname === PROPERTY_SERVICES[0].to ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                        {PROPERTY_SERVICES[0].label}
                      </span>
                      <span className="text-[12px] font-normal leading-[1.35] text-[#69758B]">
                        {PROPERTY_SERVICES[0].helper}
                      </span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 h-px bg-[#E8E6E1]" />

                  {/* Managed · Watch · Let */}
                  {PROPERTY_SERVICES.slice(1).map(svc => (
                    <DropdownMenuItem key={svc.to} asChild>
                      <Link
                        to={svc.to}
                        onClick={() => setServicesOpen(false)}
                        className={`group flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 cursor-pointer select-none
                          hover:bg-[#F7F9FC] transition-colors duration-150 focus-visible:outline-none focus-visible:bg-[#F7F9FC]
                          ${location.pathname === svc.to ? "bg-[#F2F6FF]" : ""}`}
                      >
                        <span className={`text-sm font-semibold leading-snug transition-colors duration-150
                          group-hover:text-[#0057F2]
                          ${location.pathname === svc.to ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                          {svc.label}
                        </span>
                        <span className="text-[12px] font-normal leading-[1.35] text-[#69758B]">
                          {svc.helper}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>

          {/* Desktop right side — auth aware */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-24 rounded-md" />
            ) : isAuthenticated && user ? (
              <>
                <Link
                  to="/list"
                  className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5"
                  onClick={() => posthog?.capture("list_property_cta_clicked", { source_page: "header" })}
                >
                  List Your Property
                </Link>

                {/* Account dropdown — controlled with hover */}
                <div onMouseEnter={handleAccountEnter} onMouseLeave={handleAccountLeave}>
                  <DropdownMenu modal={false} open={accountOpen} onOpenChange={handleAccountOpenChange}>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#0A1628] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                        <User className="h-4 w-4" />
                        <span>{displayName}</span>
                        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform duration-150 motion-reduce:transition-none ${accountOpen ? "rotate-180" : ""}`} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="w-48 rounded-[13px] border border-[#E8E6E1] bg-[#FFFDFC] p-1.5 shadow-[0_14px_36px_rgba(10,22,40,0.14)]
                                 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1
                                 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1
                                 motion-reduce:animate-none"
                      onMouseEnter={handleAccountEnter}
                      onMouseLeave={handleAccountLeave}
                    >
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => { setAccountOpen(false); navigate("/admin/owners"); }}>
                          Admin Dashboard
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => { setAccountOpen(false); navigate("/tenant-dashboard"); }}>
                        My Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setAccountOpen(false); navigate("/owner-dashboard"); }}>
                        Manage My Properties
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setAccountOpen(false); navigate("/me"); }}>
                        My Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <>
                <Link
                  to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
                  className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors px-4 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/list"
                  className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5"
                  onClick={() => posthog?.capture("list_property_cta_clicked", { source_page: "header" })}
                >
                  List Your Property
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleMobileMenu}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#0A1628]"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div className={`md:hidden bg-white border-t border-gray-100 shadow-lg max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain ${isMobileMenuOpen ? "block" : "hidden"}`}>
        <div className="px-4 py-4 space-y-1">

          {/* Public nav — shared for all auth states */}
          <Link
            to="/search"
            aria-current={location.pathname === "/search" ? "page" : undefined}
            className={`block text-sm font-medium transition-colors py-3 border-b border-gray-50 ${
              location.pathname === "/search" ? "text-[#0057F2]" : "text-gray-600 hover:text-[#0A1628]"
            }`}
            onClick={closeMobileMenu}
          >
            Browse Properties
          </Link>

          {/* Property Services — separate link + expand button */}
          <div className="border-b border-gray-50">
            <div className="flex items-center justify-between">
              <Link
                to="/property-services-bangalore"
                onClick={closeMobileMenu}
                className={`text-sm font-medium py-3 transition-colors ${isServiceActive ? "text-[#0057F2]" : "text-gray-600 hover:text-[#0A1628]"}`}
              >
                Property Services
              </Link>
              <button
                onClick={() => setIsMobileServicesOpen(v => !v)}
                aria-expanded={isMobileServicesOpen}
                aria-controls="mobile-services-submenu"
                aria-label={isMobileServicesOpen ? "Collapse Property Services" : "Expand Property Services"}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 rounded"
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${isMobileServicesOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {isMobileServicesOpen && (
              <div
                id="mobile-services-submenu"
                className="ml-4 pl-4 border-l border-gray-200 pb-2 pt-0.5 space-y-0.5
                           animate-in fade-in-0 slide-in-from-top-1 duration-150 motion-reduce:animate-none"
              >
                {PROPERTY_SERVICES.map(svc => (
                  <Link
                    key={svc.to}
                    to={svc.to}
                    onClick={closeMobileMenu}
                    className={`block py-2 min-h-[44px] ${location.pathname === svc.to ? "text-[#0057F2]" : "text-gray-700 hover:text-[#0A1628]"}`}
                  >
                    <span className="block text-sm font-semibold leading-snug">{svc.label}</span>
                    <span className="block text-xs text-[#69758B] leading-[1.35] mt-0.5">{svc.helper}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* List Your Property — single CTA */}
          <div className="py-3 border-b border-gray-50">
            <Link
              to="/list"
              onClick={() => {
                posthog?.capture("list_property_cta_clicked", { source_page: "header" });
                closeMobileMenu();
              }}
              className="block w-full text-center bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold rounded-[9px] py-3 min-h-[44px] transition-colors duration-150"
            >
              List Your Property
            </Link>
          </div>

          {/* Auth-specific section */}
          {isAuthenticated && user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin/owners"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={closeMobileMenu}
                >
                  Admin Dashboard
                </Link>
              )}
              <Link
                to="/tenant-dashboard"
                className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                onClick={closeMobileMenu}
              >
                My Dashboard
              </Link>
              <Link
                to="/owner-dashboard"
                className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                onClick={closeMobileMenu}
              >
                Manage My Properties
              </Link>
              <Link
                to="/me"
                className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                onClick={closeMobileMenu}
              >
                My Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2">
              <Link
                to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
                className="block w-full text-center text-sm text-gray-600 border border-gray-300 rounded-lg py-3"
                onClick={closeMobileMenu}
              >
                Log In
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};

export default Header;
