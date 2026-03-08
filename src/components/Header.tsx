import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
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
import { useState, useEffect } from "react";

type UserRole = "tenant" | "owner" | "admin" | "super_admin";

interface UserInfo {
  fullName: string;
  role: UserRole;
}

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuthSession();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setUserInfo(null);
      return;
    }

    setProfileLoading(true);
    supabase
      .from("users")
      .select("full_name, role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserInfo({
            fullName: data.full_name || "",
            role: data.role as UserRole,
          });
        }
        setProfileLoading(false);
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const loginUrl = `/login?returnTo=${encodeURIComponent(location.pathname)}`;
  const firstName = userInfo?.fullName?.split(" ")[0] || "Account";
  const loading = authLoading || profileLoading;

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
          {loading ? (
            <Skeleton className="h-9 w-24 rounded-md" />
          ) : isAuthenticated && userInfo ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 min-h-[40px]">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{firstName}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {userInfo.role === "admin" || userInfo.role === "super_admin" ? (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      Admin Panel
                    </DropdownMenuItem>
                  </>
                ) : userInfo.role === "owner" ? (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/owner")}>
                      My Properties
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/owner/applications")}>
                      Applications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/owner/payouts")}>
                      Payouts
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/applications")}>
                      My Applications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/payments")}>
                      Payments
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden min-h-[40px] sm:inline-flex"
                onClick={() => navigate(loginUrl)}
              >
                Log In
              </Button>
              <Button
                size="sm"
                className="min-h-[40px]"
                onClick={() => navigate(loginUrl)}
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
