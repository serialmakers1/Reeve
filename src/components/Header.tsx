import { useState } from "react";
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
import { Menu, X, ChevronDown, User } from "lucide-react";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAuthenticated, signOut } = useAuth();

  const handleLogout = async () => {
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
            <img src={logo} alt="Reeve" className="h-7 w-auto" />
          </Link>

          {/* Desktop nav links — centre */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/savings/tenant"
              className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors font-medium"
            >
              For Tenants
            </Link>
            <Link
              to="/savings/owner"
              className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors font-medium"
            >
              For Owners
            </Link>
            <Link
              to="/search"
              className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors font-medium"
            >
              Search Properties
            </Link>
            <Link
              to="/contact"
              className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors font-medium"
            >
              Contact
            </Link>
          </div>

          {/* Desktop right side — auth aware */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-24 rounded-md" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#0A1628] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                    <User className="h-4 w-4" />
                    <span>{displayName}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isAdmin ? (
                    <DropdownMenuItem onClick={() => navigate("/admin/owners")}>
                      Admin Dashboard
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        Rent Properties
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-properties")}>
                        List Properties
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        My Profile
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
                  className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors px-4 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/my-properties/new"
                  className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5"
                >
                  List Your Property
                </Link>
              </>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#0A1628]"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {isAuthenticated && user && !isAdmin ? (
              <>
                <Link
                  to="/dashboard"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Rent Properties
                </Link>
                <Link
                  to="/savings/tenant"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  For Tenants
                </Link>
                <Link
                  to="/savings/owner"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  For Owners
                </Link>
                <Link
                  to="/contact"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                <Link
                  to="/profile"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/savings/tenant"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  For Tenants
                </Link>
                <Link
                  to="/savings/owner"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  For Owners
                </Link>
                <Link
                  to="/search"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Search Properties
                </Link>
                <Link
                  to="/contact"
                  className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-3 border-b border-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </Link>

                {!isAuthenticated && (
                  <div className="pt-4 space-y-3">
                    <Link
                      to="/login"
                      className="block w-full text-center text-sm text-gray-600 border border-gray-300 rounded-lg py-3"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/my-properties/new"
                      className="block w-full text-center bg-[#2563EB] text-white text-sm font-medium rounded-lg py-3"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      List Your Property
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
