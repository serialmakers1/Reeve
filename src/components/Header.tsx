import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
import { Menu, X, ChevronDown, User, ArrowRight } from "lucide-react";

// Do not keep adding detail-service rows to this dropdown.
// Future niche services should route through the appropriate hub unless
// the global navigation is deliberately redesigned.
// Current capacity: 2 hub destinations + 6 detail-service destinations.

const BANGALORE_SERVICES = [
  { label: "Reeve Managed",    helper: "Ongoing property management",  to: "/property-management-bangalore" },
  { label: "Reeve Watch",      helper: "Care for vacant properties",   to: "/vacant-property-care-bangalore" },
  { label: "Reeve Let",        helper: "One-time tenant placement",    to: "/find-tenant-bangalore" },
  { label: "Khata & Mutation", helper: "Property record transfers",    to: "/khata-transfer-bangalore" },
];

const NRI_SERVICES = [
  { label: "NRI Property Sale", helper: "Documents, tax & sale coordination", to: "/nri-property-sale-india" },
  { label: "NRI Rent & TDS",    helper: "Withholding on Indian rent",          to: "/nri-rent-tds-india" },
];

const SERVICE_PATHS = [
  "/property-services-bangalore",
  "/property-management-bangalore",
  "/vacant-property-care-bangalore",
  "/find-tenant-bangalore",
  "/khata-transfer-bangalore",
  "/nri-property-services-india",
  "/nri-property-sale-india",
  "/nri-rent-tds-india",
];

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
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-8">

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

            {/* Property Services — single unified trigger */}
            <div
              className="relative"
              onMouseEnter={handleServicesEnter}
              onMouseLeave={handleServicesLeave}
            >
              <DropdownMenu modal={false} open={servicesOpen} onOpenChange={handleServicesOpenChange}>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Property Services menu"
                    aria-haspopup="menu"
                    aria-expanded={servicesOpen}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors duration-150
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]
                      ${isServiceActive ? "text-[#0057F2]" : "text-gray-600 hover:text-[#0A1628]"}`}
                  >
                    Property Services
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none ${servicesOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </DropdownMenuTrigger>

                {/* Active underline spans full trigger width */}
                {isServiceActive && (
                  <span className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-[#0057F2] rounded-full" />
                )}

                <DropdownMenuContent
                  align="start"
                  sideOffset={10}
                  avoidCollisions
                  collisionPadding={16}
                  className="w-[680px] max-w-[calc(100vw-32px)] rounded-[13px] border border-[#E8E6E1] bg-[#FFFDFC] p-0
                             shadow-[0_14px_36px_rgba(10,22,40,0.14)] max-h-[80vh] overflow-y-auto
                             data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1
                             data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1
                             motion-reduce:animate-none"
                  onMouseEnter={handleServicesEnter}
                  onMouseLeave={handleServicesLeave}
                >
                  <div className="flex">

                    {/* Left column: IN BANGALORE */}
                    <div className="flex-1 p-3 flex flex-col gap-0.5">
                      <div className="px-3 pt-1 pb-3">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0A1628]">IN BANGALORE</p>
                        <p className="text-[12px] leading-[1.35] text-[#69758B] mt-[3px]">We come to the property</p>
                      </div>

                      {/* Bangalore hub */}
                      <DropdownMenuItem asChild>
                        <Link
                          to="/property-services-bangalore"
                          onClick={() => setServicesOpen(false)}
                          aria-current={location.pathname === "/property-services-bangalore" ? "page" : undefined}
                          className={`group flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 cursor-pointer select-none
                            border border-[#E8E6E1] transition-colors duration-150 focus-visible:outline-none
                            data-[highlighted]:bg-[#F7F9FC]
                            ${location.pathname === "/property-services-bangalore" ? "bg-[#F2F6FF]" : "bg-[#F7F9FC]"}`}
                        >
                          <span className="flex items-center justify-between gap-1">
                            <span className={`text-sm font-semibold leading-snug transition-colors duration-150
                              group-hover:text-[#0057F2] group-data-[highlighted]:text-[#0057F2]
                              ${location.pathname === "/property-services-bangalore" ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                              All Bangalore property services
                            </span>
                            <ArrowRight
                              className="h-3.5 w-3.5 text-[#0057F2] flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-[12px] text-[#69758B] leading-[1.35]">
                            Compare Managed, Watch, Let &amp; Khata
                          </span>
                        </Link>
                      </DropdownMenuItem>

                      <div className="h-px bg-[#E8E6E1] my-2" />

                      {/* Bangalore service rows */}
                      {BANGALORE_SERVICES.map(svc => (
                        <DropdownMenuItem key={svc.to} asChild>
                          <Link
                            to={svc.to}
                            onClick={() => setServicesOpen(false)}
                            aria-current={location.pathname === svc.to ? "page" : undefined}
                            className={`group flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 cursor-pointer select-none
                              transition-colors duration-150 focus-visible:outline-none
                              hover:bg-[#F7F9FC] data-[highlighted]:bg-[#F7F9FC]
                              ${location.pathname === svc.to ? "bg-[#F2F6FF]" : ""}`}
                          >
                            <span className={`text-sm font-semibold leading-snug transition-colors duration-150
                              group-hover:text-[#0057F2] group-data-[highlighted]:text-[#0057F2]
                              ${location.pathname === svc.to ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                              {svc.label}
                            </span>
                            <span className="text-[12px] text-[#69758B] leading-[1.35] mt-0.5">
                              {svc.helper}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>

                    {/* 1px vertical divider */}
                    <div className="w-px bg-[#E8E6E1] my-3 self-stretch flex-shrink-0" />

                    {/* Right column: ANYWHERE IN INDIA */}
                    <div className="flex-1 p-3 flex flex-col gap-0.5">
                      <div className="px-3 pt-1 pb-3">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0A1628]">ANYWHERE IN INDIA</p>
                        <p className="text-[12px] leading-[1.35] text-[#69758B] mt-[3px]">Coordinated remotely</p>
                      </div>

                      {/* NRI hub */}
                      <DropdownMenuItem asChild>
                        <Link
                          to="/nri-property-services-india"
                          onClick={() => setServicesOpen(false)}
                          aria-current={location.pathname === "/nri-property-services-india" ? "page" : undefined}
                          className={`group flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 cursor-pointer select-none
                            border border-[#E8E6E1] transition-colors duration-150 focus-visible:outline-none
                            data-[highlighted]:bg-[#F7F9FC]
                            ${location.pathname === "/nri-property-services-india" ? "bg-[#F2F6FF]" : "bg-[#F7F9FC]"}`}
                        >
                          <span className="flex items-center justify-between gap-1">
                            <span className={`text-sm font-semibold leading-snug transition-colors duration-150
                              group-hover:text-[#0057F2] group-data-[highlighted]:text-[#0057F2]
                              ${location.pathname === "/nri-property-services-india" ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                              All NRI property services
                            </span>
                            <ArrowRight
                              className="h-3.5 w-3.5 text-[#0057F2] flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-[12px] text-[#69758B] leading-[1.35]">
                            Help me find the right NRI route
                          </span>
                        </Link>
                      </DropdownMenuItem>

                      <div className="h-px bg-[#E8E6E1] my-2" />

                      {/* NRI service rows */}
                      {NRI_SERVICES.map(svc => (
                        <DropdownMenuItem key={svc.to} asChild>
                          <Link
                            to={svc.to}
                            onClick={() => setServicesOpen(false)}
                            aria-current={location.pathname === svc.to ? "page" : undefined}
                            className={`group flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 cursor-pointer select-none
                              transition-colors duration-150 focus-visible:outline-none
                              hover:bg-[#F7F9FC] data-[highlighted]:bg-[#F7F9FC]
                              ${location.pathname === svc.to ? "bg-[#F2F6FF]" : ""}`}
                          >
                            <span className={`text-sm font-semibold leading-snug transition-colors duration-150
                              group-hover:text-[#0057F2] group-data-[highlighted]:text-[#0057F2]
                              ${location.pathname === svc.to ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                              {svc.label}
                            </span>
                            <span className="text-[12px] text-[#69758B] leading-[1.35] mt-0.5">
                              {svc.helper}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>

                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </nav>

          {/* Desktop right side — auth aware */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-24 rounded-md" />
            ) : isAuthenticated && user ? (
              <>
                <Link
                  to="/list"
                  className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5"
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
                        <DropdownMenuItem onClick={() => { setAccountOpen(false); navigate("/admin/properties"); }}>
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

          {/* Browse Properties */}
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

          {/* Property Services — one accordion button, no navigation on tap */}
          <div className="border-b border-gray-50">
            <button
              onClick={() => setIsMobileServicesOpen(v => !v)}
              aria-expanded={isMobileServicesOpen}
              aria-controls="mobile-services-submenu"
              className={`w-full min-h-[44px] flex items-center justify-between py-3 text-sm font-medium transition-colors duration-150
                ${isServiceActive ? "text-[#0057F2]" : "text-gray-600 hover:text-[#0A1628]"}`}
            >
              Property Services
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${isMobileServicesOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {/* CSS grid animation: always mounted for smooth open+close */}
            <div
              id="mobile-services-submenu"
              aria-hidden={!isMobileServicesOpen}
              className={`grid transition-[grid-template-rows] duration-150 ease-out motion-reduce:transition-none
                ${isMobileServicesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              {/* Fade + vertical reveal */}
              <div className={`overflow-hidden transition-[opacity,transform] duration-150 ease-out
                motion-reduce:transition-none motion-reduce:transform-none
                ${isMobileServicesOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}>
                <div className="ml-4 border-l border-[#E8E6E1] pl-4 pb-3 pt-1">

                  {/* ── ANYWHERE IN INDIA first on mobile ── */}
                  <div className="pb-1">
                    <div className="pt-1 pb-2.5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0A1628]">ANYWHERE IN INDIA</p>
                      <p className="text-[12px] text-[#69758B] leading-[1.35] mt-[3px]">Coordinated remotely</p>
                    </div>

                    {/* NRI hub */}
                    <Link
                      to="/nri-property-services-india"
                      onClick={closeMobileMenu}
                      tabIndex={isMobileServicesOpen ? 0 : -1}
                      aria-current={location.pathname === "/nri-property-services-india" ? "page" : undefined}
                      className={`flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 mb-1 border border-[#E8E6E1]
                        transition-colors duration-150
                        ${location.pathname === "/nri-property-services-india" ? "bg-[#F2F6FF]" : "bg-[#F7F9FC]"}`}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-semibold leading-snug ${location.pathname === "/nri-property-services-india" ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                          All NRI property services
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#0057F2] flex-shrink-0" aria-hidden="true" />
                      </span>
                      <span className="text-[12px] text-[#69758B] leading-[1.35]">Help me find the right NRI route</span>
                    </Link>

                    {/* NRI services */}
                    {NRI_SERVICES.map(svc => (
                      <Link
                        key={svc.to}
                        to={svc.to}
                        onClick={closeMobileMenu}
                        tabIndex={isMobileServicesOpen ? 0 : -1}
                        aria-current={location.pathname === svc.to ? "page" : undefined}
                        className={`flex flex-col gap-0.5 py-2.5 min-h-[44px] transition-colors duration-150
                          ${location.pathname === svc.to ? "text-[#0057F2]" : "text-gray-700 hover:text-[#0A1628]"}`}
                      >
                        <span className="text-sm font-semibold leading-snug">{svc.label}</span>
                        <span className="text-[12px] text-[#69758B] leading-[1.35]">{svc.helper}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Divider between geographic groups */}
                  <div className="h-px bg-[#E8E6E1] my-3" />

                  {/* ── IN BANGALORE second on mobile ── */}
                  <div>
                    <div className="pt-1 pb-2.5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0A1628]">IN BANGALORE</p>
                      <p className="text-[12px] text-[#69758B] leading-[1.35] mt-[3px]">We come to the property</p>
                    </div>

                    {/* Bangalore hub */}
                    <Link
                      to="/property-services-bangalore"
                      onClick={closeMobileMenu}
                      tabIndex={isMobileServicesOpen ? 0 : -1}
                      aria-current={location.pathname === "/property-services-bangalore" ? "page" : undefined}
                      className={`flex flex-col gap-0.5 rounded-[9px] px-3 py-2.5 mb-1 border border-[#E8E6E1]
                        transition-colors duration-150
                        ${location.pathname === "/property-services-bangalore" ? "bg-[#F2F6FF]" : "bg-[#F7F9FC]"}`}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-semibold leading-snug ${location.pathname === "/property-services-bangalore" ? "text-[#0057F2]" : "text-[#0A1628]"}`}>
                          All Bangalore property services
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#0057F2] flex-shrink-0" aria-hidden="true" />
                      </span>
                      <span className="text-[12px] text-[#69758B] leading-[1.35]">Compare Managed, Watch, Let &amp; Khata</span>
                    </Link>

                    {/* Bangalore services */}
                    {BANGALORE_SERVICES.map(svc => (
                      <Link
                        key={svc.to}
                        to={svc.to}
                        onClick={closeMobileMenu}
                        tabIndex={isMobileServicesOpen ? 0 : -1}
                        aria-current={location.pathname === svc.to ? "page" : undefined}
                        className={`flex flex-col gap-0.5 py-2.5 min-h-[44px] transition-colors duration-150
                          ${location.pathname === svc.to ? "text-[#0057F2]" : "text-gray-700 hover:text-[#0A1628]"}`}
                      >
                        <span className="text-sm font-semibold leading-snug">{svc.label}</span>
                        <span className="text-[12px] text-[#69758B] leading-[1.35]">{svc.helper}</span>
                      </Link>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* List Your Property — single CTA */}
          <div className="py-3 border-b border-gray-50">
            <Link
              to="/list"
              onClick={() => {
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
                  to="/admin/properties"
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
