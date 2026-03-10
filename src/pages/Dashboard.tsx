import { FileText, Heart, CreditCard, Wrench, FolderOpen, ShieldCheck, CalendarDays } from "lucide-react";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";

const tiles = [
  { label: "Applications", icon: FileText, href: "/dashboard/applications" },
  { label: "Favourites", icon: Heart, href: "/dashboard/favourites" },
  { label: "Eligibility", icon: ShieldCheck, href: "/eligibility" },
  { label: "My Visits", icon: CalendarDays, href: "/dashboard/visits" },
  { label: "Payments", icon: CreditCard },
  { label: "Maintenance", icon: Wrench },
  { label: "Documents", icon: FolderOpen },
];

export default function Dashboard() {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64" />
          <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.full_name || "there"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {tiles.map(({ label, icon: Icon, href }) => {
            const isActive = !!href;
            const Wrapper = isActive ? "a" : "div";
            return (
              <Wrapper
                key={label}
                {...(isActive ? { href } : {})}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow ${
                  isActive
                    ? "cursor-pointer hover:shadow-md hover:shadow-primary/10"
                    : "opacity-50"
                }`}
              >
                <Icon className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{label}</span>
                {!isActive && (
                  <span className="text-[10px] text-muted-foreground">Coming soon</span>
                )}
              </Wrapper>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
