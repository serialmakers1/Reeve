import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users, Home, FileText, Building2, ClipboardList, ClipboardCheck, UserPlus, Menu, X, User, ChevronDown, CalendarDays, ScrollText, Phone, ExternalLink, Search, PlusSquare, LayoutDashboard, UserCircle } from "lucide-react";
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
  { label: "Listing Reviews", path: "/admin/listing-reviews", icon: ClipboardCheck },
  { label: "Inspections", path: "/admin/inspections", icon: ClipboardList },
  { label: "Field Calendar", path: "/admin/calendar", icon: CalendarDays },
  { label: "Visit Logs", path: "/admin/visits", icon: ScrollText },
  { label: "Callbacks", path: "/admin/callbacks", icon: Phone },
  { label: "Applications", path: "/admin/applications", icon: FileText },
];

// Access to the normal (non-admin) Reeve site from within the admin shell.
const REEVE_LINKS = [
  { label: "View Reeve", path: "/", icon: ExternalLink },
  { label: "Browse Properties", path: "/search", icon: Search },
  { label: "List Your Property", path: "/list", icon: PlusSquare },
  { label: "Tenant Dashboard", path: "/tenant-dashboard", icon: LayoutDashboard },
  { label: "Owner Dashboard", path: "/owner-dashboard", icon: Building2 },
  { label: "My Profile", path: "/me", icon: UserCircle },
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
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

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

      // Poll pending review count for nav badge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ count: newCount }, { count: editCount }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("properties").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("property_edit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setPendingReviewCount((newCount ?? 0) + (editCount ?? 0));
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
            <span className="flex-1">{item.label}</span>
            {item.path === "/admin/listing-reviews" && pendingReviewCount > 0 && (
              <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[20px] text-center">
                {pendingReviewCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* Access to the normal Reeve site */}
      <div className="mt-4 pt-3 border-t border-primary-foreground/20">
        <span className="px-3 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/50">
          Reeve
        </span>
        <div className="mt-1 flex flex-col gap-1">
          {REEVE_LINKS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 min-h-[44px]"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
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
