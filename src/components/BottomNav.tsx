import { Link, useLocation } from "react-router-dom";
import { Search, Building2, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
  { label: 'Browse',           icon: Search,          route: '/search'        },
  { label: 'Tenant Dashboard',  icon: LayoutDashboard, route: '/tenant-dashboard' },
  { label: 'Owner Dashboard',   icon: Building2,       route: '/owner-dashboard' },
];

export default function BottomNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) return null;
  // P4: /property/:id owns the bottom slot with a sticky CTA bar; suppress the nav there.
  if (/^\/property\/[^/]+$/.test(location.pathname)) return null;

  const isActive = (route: string) => {
    if (route === '/') return location.pathname === '/';
    // Owner Dashboard tab also highlights on legacy /my-properties URL during the transition
    // (redirect fires but the check runs before pathname rewrite on the first render).
    if (route === '/owner-dashboard') {
      return location.pathname.startsWith('/owner-dashboard') || location.pathname.startsWith('/my-properties');
    }
    if (route === '/tenant-dashboard') {
      return location.pathname === '/tenant-dashboard' || location.pathname.startsWith('/tenant-dashboard/');
    }
    return location.pathname.startsWith(route);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background pb-safe md:hidden">
      {TABS.map(({ label, icon: Icon, route }) => (
        <Link
          key={route}
          to={route}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
            isActive(route) ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
