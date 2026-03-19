import { Link, useLocation } from "react-router-dom";
import { Search, Heart, FileText, Building2, User, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
  { label: "Search", icon: Search, route: "/search" },
  { label: "Visits", icon: CalendarDays, route: "/dashboard/visits" },
  { label: "Applications", icon: FileText, route: "/dashboard/applications" },
  { label: "Properties", icon: Building2, route: "/my-properties" },
  { label: "Profile", icon: User, route: "/profile" },
];

export default function BottomNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background pb-safe md:hidden">
      {TABS.map(({ label, icon: Icon, route }) => {
        const active = location.pathname.startsWith(route);
        return (
          <Link
            key={route}
            to={route}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
