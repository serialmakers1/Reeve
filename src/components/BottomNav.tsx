import { Link, useLocation } from "react-router-dom";
import { Search, Building2, Home, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
  { label: 'Home',              icon: Home,            route: '/'              },
  { label: 'Browse Properties', icon: Search,          route: '/search'        },
  { label: 'Tenant Dashboard',  icon: LayoutDashboard, route: '/dashboard'     },
  { label: 'Owner Dashboard',   icon: Building2,       route: '/my-properties' },
];

export default function BottomNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  const isActive = (route: string) => {
    if (route === '/') return location.pathname === '/';
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
