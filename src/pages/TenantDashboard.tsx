import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Heart, Settings2 } from "lucide-react";

import Layout from "@/components/Layout";
import ContactRequestsSummaryCard from "@/components/tenant-dashboard/ContactRequestsSummaryCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PreferenceMode,
  isRentModeActive,
  isBuyModeActive,
  isRentComplete,
  isBuyComplete,
} from "@/lib/preferenceHelpers";

interface PrefsRow {
  preference_mode: PreferenceMode | null;
  age: number | null;
  occupation: string | null;
  is_foreign_citizen: boolean | null;
  gender: string | null;
  number_of_occupants: number | null;
  expected_stay_duration: string | null;
  buying_purpose: string | null;
  purchase_timeline: string | null;
  funding_stage: string | null;
}

export default function TenantDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth();
  const { isFullyVerified } = useAuth();
  const [favouritesCount, setFavouritesCount] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<PrefsRow | null | undefined>(undefined);
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
          .select("preference_mode, age, occupation, is_foreign_citizen, gender, number_of_occupants, expected_stay_duration, buying_purpose, purchase_timeline, funding_stage")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      setFavouritesCount(count ?? 0);
      setPrefs((prefsRes?.data as PrefsRow | null) ?? null);
      setPrefsLoaded(true);
    })();
  }, [authLoading, user?.id]);

  const loading = authLoading || favouritesCount === null || !prefsLoaded;
  // prefs === undefined means not yet loaded; null means no row exists
  const prefsRowExists = prefs !== null && prefs !== undefined;

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

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.full_name || "there"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* ── Card 1 — Contact Requests (Phase 3 Prompt 5 — live) ── */}
          <ContactRequestsSummaryCard />

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

          {/* ── Card 3 — My Preferences ── */}
          <section className="rounded-xl border bg-card p-5 space-y-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">My Preferences</h2>
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
                  Verify your account to set up your preferences.
                </p>
                <button
                  onClick={() => navigate("/profile")}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Go to Account Settings →
                </button>
              </div>
            ) : (
              <>
                <PrefsStatusRows prefs={prefsRowExists ? prefs : null} />
                <Button
                  variant={prefsRowExists ? "outline" : "default"}
                  onClick={() => navigate("/tenant-dashboard/preferences")}
                >
                  {prefsRowExists ? "View or edit" : "Set up"}
                </Button>
              </>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}

function PrefsStatusRows({ prefs }: { prefs: PrefsRow | null }) {
  const mode = prefs?.preference_mode ?? null;
  const rentActive = isRentModeActive(mode);
  const buyActive = isBuyModeActive(mode);

  const rentStatus = !prefs
    ? "not_set_up"
    : !rentActive
    ? "not_set_up"
    : isRentComplete(prefs)
    ? "complete"
    : "incomplete";

  const buyStatus = !prefs
    ? "not_set_up"
    : !buyActive
    ? "not_set_up"
    : isBuyComplete(prefs)
    ? "complete"
    : "incomplete";

  return (
    <div className="grid grid-cols-2 gap-3">
      <PrefStatusChip label="Rent preferences" status={rentStatus} />
      <PrefStatusChip label="Buy preferences" status={buyStatus} />
    </div>
  );
}

function PrefStatusChip({
  label,
  status,
}: {
  label: string;
  status: "complete" | "incomplete" | "not_set_up";
}) {
  const colorClass =
    status === "complete"
      ? "text-green-700 bg-green-50 border-green-200"
      : status === "incomplete"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-muted-foreground bg-muted border-border";

  const statusLabel =
    status === "complete" ? "Complete" : status === "incomplete" ? "Incomplete" : "Not set up";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${colorClass}`}>
      <div className="font-medium">{label}</div>
      <div className="text-xs mt-0.5 opacity-80">{statusLabel}</div>
    </div>
  );
}
