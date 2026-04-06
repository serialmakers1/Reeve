import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users, Home, FileText, Building2, ClipboardList, UserPlus, Menu, X, User, ChevronDown, CalendarDays, ScrollText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { label: "Owner Pipeline", path: "/admin/owners", icon: Users },
  { label: "Leads", path: "/admin/leads", icon: UserPlus },
  { label: "Properties", path: "/admin/properties", icon: Building2 },
  { label: "Inspections", path: "/admin/inspections", icon: ClipboardList },
  { label: "Field Calendar", path: "/admin/calendar", icon: CalendarDays },
  { label: "Visit Logs", path: "/admin/visits", icon: ScrollText },
  { label: "Applications", path: "/admin/applications", icon: FileText },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      setUserEmail(session.user.email ?? null);

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!data || !["admin", "super_admin"].includes(data.role)) {
        navigate("/search", { replace: true });
        return;
      }

      setAuthChecked(true);
    };
    checkAdmin();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
              active
                ? "bg-primary-foreground text-primary"
                : "text-primary-foreground/80 hover:bg-primary-foreground/10"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col bg-primary">
        <div className="px-4 py-5 text-primary-foreground font-bold text-lg border-b border-primary-foreground/20">
          Reeve Admin
        </div>
        <NavLinks />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-primary border-none">
                <div className="flex items-center justify-between px-4 py-5 border-b border-primary-foreground/20">
                  <span className="text-primary-foreground font-bold text-lg">Reeve Admin</span>
                </div>
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="md:hidden text-foreground font-bold">Reeve Admin</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 min-h-[40px]">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline truncate max-w-[150px]">
                  {userEmail ?? "Admin"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
