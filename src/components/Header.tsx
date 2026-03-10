import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAuthenticated, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/search");
  };

  const loginUrl = `/login?returnTo=${encodeURIComponent(location.pathname)}`;
  const displayName = user?.full_name?.split(" ")[0] || user?.email || "Account";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-between gap-2 px-4 py-3 sm:py-4">
        <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
          REEVE
        </Link>

        <p className="hidden flex-1 text-center text-xs text-muted-foreground sm:block sm:text-sm">
          Zero Brokerage. One Month Deposit. Hassle-Free Renting.
        </p>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-9 w-24 rounded-md" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 min-h-[40px]">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user.role === "admin" || user.role === "super_admin" ? (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    Dashboard
                  </DropdownMenuItem>
                ) : user.role === "owner" ? (
                  <DropdownMenuItem onClick={() => navigate("/owner")}>
                    Dashboard
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                size="sm"
                className="min-h-[40px]"
                onClick={() => navigate("/login?role=owner")}
              >
                List Your Property
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[40px]"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
