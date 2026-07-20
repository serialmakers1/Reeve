import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Circle, Heart, MessageSquare, Settings2 } from "lucide-react";

import Layout from "@/components/Layout";
import ContactRequestsCard from "@/components/tenant-dashboard/ContactRequestsCard";
import PendingRatingsSection from "@/components/ratings/PendingRatingsSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STAY_DURATION_LABELS: Record<string, string> = {
  less_than_6_months: "Under 6 months",
  "6_to_11_months": "6–11 months",
  "1_year": "1 year",
  "2_years": "2 years",
  "3_years_plus": "3+ years",
  flexible: "Flexible",
};

interface PrefsSummary {
  preferred_city: string | null;
  move_in_by: string | null;
  number_of_occupants: number | null;
  expected_stay_duration: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
}

export default function TenantDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth();
  const { isFullyVerified } = useAuth();
  const [favouritesCount, setFavouritesCount] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<PrefsSummary | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    (async () => {
      const [{ count }, prefsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("favourites")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("rental_preferences")
          .select("preferred_city, move_in_by, number_of_occupants, expected_stay_duration, age, gender, occupation")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      setFavouritesCount(count ?? 0);
      setPrefs((prefsRes?.data as PrefsSummary | null) ?? null);
      setPrefsLoaded(true);
    })();
  }, [authLoading, user?.id]);

  const loading = authLoading || favouritesCount === null || !prefsLoaded;

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64" />
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const prefsSummary = prefs ? buildPrefsSummary(prefs) : null;

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.full_name || "there"}
          </p>
        </div>

        {/* C3: Pending ratings — renders nothing when empty. */}
        <PendingRatingsSection />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* ── Card 1 — Contact Requests (Phase 3 Prompt 5 — live) ── */}
          <ContactRequestsCard />

          {/* ── Card 2 — Saved Properties ── */}
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Saved Properties</h2>
            </div>
            {favouritesCount === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  No saved properties yet. Browse listings and tap ♥ to save them.
                </p>
                <Button variant="outline" onClick={() => navigate("/search")}>
                  Browse properties
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {favouritesCount} saved {favouritesCount === 1 ? "property" : "properties"}
                </p>
                <Button onClick={() => navigate("/dashboard/favourites")}>
                  View all
                </Button>
              </>
            )}
          </section>

          {/* ── Card 3 — Rental Preferences ── */}
          <section className="rounded-xl border bg-card p-5 space-y-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Rental Preferences</h2>
            </div>

            {!isFullyVerified ? (
              <div className="space-y-2">
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    {user?.phone_verified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span className={user?.phone_verified ? "text-muted-foreground" : "text-foreground"}>
                      Phone {user?.phone_verified ? "verified" : "not verified"}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {user?.email_verified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span className={user?.email_verified ? "text-muted-foreground" : "text-foreground"}>
                      Email {user?.email_verified ? "verified" : "not verified"}
                    </span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Verify your account to set your rental preferences.
                </p>
                <button
                  onClick={() => navigate("/profile")}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Go to Account Settings →
                </button>
              </div>
            ) : prefs === null ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Let owners know who you are when you reach out. Takes 2 minutes.
                </p>
                <Button onClick={() => navigate("/tenant-dashboard/preferences")}>
                  Set preferences
                </Button>
              </>
            ) : (
              <>
                {prefsSummary && (
                  <p className="text-sm text-foreground">{prefsSummary}</p>
                )}
                <Button variant="outline" onClick={() => navigate("/tenant-dashboard/preferences")}>
                  Edit
                </Button>
              </>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}

function buildPrefsSummary(p: PrefsSummary): string | null {
  const parts: string[] = [];
  if (p.preferred_city) parts.push(p.preferred_city);
  if (p.move_in_by) {
    try {
      parts.push(format(new Date(p.move_in_by), "MMM yyyy"));
    } catch {
      // skip malformed date
    }
  }
  if (p.number_of_occupants != null) {
    parts.push(`${p.number_of_occupants} ${p.number_of_occupants === 1 ? "resident" : "residents"}`);
  }
  if (p.expected_stay_duration && STAY_DURATION_LABELS[p.expected_stay_duration]) {
    parts.push(STAY_DURATION_LABELS[p.expected_stay_duration]);
  }
  return parts.length > 0 ? parts.slice(0, 4).join(" · ") : null;
}
