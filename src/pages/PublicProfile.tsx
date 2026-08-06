import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import posthog from "posthog-js";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import VerificationGate from "@/components/VerificationGate";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDisplayName } from "@/lib/user";

import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ListingsGrid from "@/components/profile/ListingsGrid";
import ReputationSummary from "@/components/ratings/ReputationSummary";

// Result of the get_public_profile RPC (migration 20260805142143). Identity read
// path for /u/:userId — server enforces auth + full verification and returns only
// public-safe columns without broadening public.users RLS.
interface PublicProfileResult {
  user_id: string;
  full_name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  is_public: boolean | null;
  created_at: string | null;
  phone_verified: boolean | null;
  email_verified: boolean | null;
}

const ProfileSkeleton = () => (
  <Layout>
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </Layout>
);

// Outer shell: enforce logged-in (useRequireAuth) + fully-verified (VerificationGate)
// BEFORE the profile body mounts, so the RPC fires only after both resolve and a
// partially-verified viewer is redirected rather than stranded on a skeleton.
export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { isAuthenticated, loading: authLoading } = useRequireAuth();

  if (authLoading) return <ProfileSkeleton />;
  // Not logged in → useRequireAuth redirects to /login?returnTo=/u/:userId.
  if (!isAuthenticated) return null;

  return (
    <VerificationGate returnTo={`/u/${userId}`}>
      <PublicProfileContent userId={userId} />
    </VerificationGate>
  );
}

function PublicProfileContent({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const { user } = useRequireAuth();

  const [profile, setProfile] = useState<PublicProfileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const posthogFiredRef = useRef(false);

  // F2 (D-151): no self-redirect. /u/:userId renders the public view regardless
  // of viewer identity so owners can preview their own public profile.

  useEffect(() => {
    if (!userId || !user?.id) return;
    if (posthogFiredRef.current) return;
    posthogFiredRef.current = true;
    posthog?.capture("commons_profile_viewed", {
      self: user.id === userId,
      target_user_id: userId,
    });
  }, [userId, user?.id]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      // Single verification-gated read path. TABLE-returning RPC → array; take [0].
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_public_profile", {
        p_user_id: userId,
      });
      if (cancelled) return;

      // Explicit error handling: a permission/verification error must NOT be shown
      // as "User not found." The VerificationGate should have prevented unverified
      // callers from mounting; this is a defensive backstop.
      if (error) {
        setLoadError(true);
        setLoading(false);
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as PublicProfileResult | undefined;

      // No row → nonexistent user.
      if (!row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      // Private profile: RPC returns is_public=false with all identity fields NULL.
      if (row.is_public === false) {
        setPrivateProfile(true);
        setLoading(false);
        return;
      }
      setProfile(row);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);


  if (loading) {
    return <ProfileSkeleton />;
  }

  if (loadError) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-lg font-semibold text-foreground">Couldn't load this profile</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm text-primary underline"
          >
            Go back
          </button>
        </div>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-lg font-semibold text-foreground">User not found</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The profile you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm text-primary underline"
          >
            Go back
          </button>
        </div>
      </Layout>
    );
  }

  if (privateProfile) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-lg font-semibold text-foreground">This profile is private</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The owner has chosen not to display their profile publicly.
          </p>
        </div>
      </Layout>
    );
  }

  // D-P4-004: full_name (from users.full_name via the RPC) only; display_name
  // intentionally not consulted here.
  const displayName = getUserDisplayName(profile);
  const verified = !!profile?.phone_verified || !!profile?.email_verified;

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Identity */}
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              photoUrl={profile?.profile_photo_url}
              displayName={displayName}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {displayName}
                </h1>
                {verified && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-label="Verified" />
                )}
              </div>
              {profile?.created_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {format(new Date(profile.created_at), "MMMM yyyy")}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Bio */}
        {profile?.bio && (
          <section>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{profile.bio}</p>
          </section>
        )}

        {/* Owner response-rate stats (D-P3-009 + D-P3-011) */}
        {userId && (
          <section>
            <OwnerStatsBlock userId={userId} />
          </section>
        )}

        {/* Listings */}
        {userId && (
          <section>
            <ListingsGrid userId={userId} heading="Listings" />
          </section>
        )}

        {/* Reputation summary v2 (separate from OwnerStatsBlock contact response rate). */}
        {userId && (
          <section>
            <ReputationSummary userId={userId} />
          </section>
        )}
      </div>
    </Layout>
  );
}

// ── Phase 3 Prompt 6 — Owner response-rate stats block ────────────────────────
// Calls get_owner_response_rate() (public grant) + a count of the userId's
// active listings. Renders only when the profile is materially an owner:
// either they have active listings (Condition A applies) OR they have >=5
// handled requests. Tenant-only profiles with zero requests render nothing
// to avoid a misleading empty state (D-P3-009 rationale).
function OwnerStatsBlock({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [handled, setHandled] = useState(0);
  const [responded, setResponded] = useState(0);
  const [weekHandled, setWeekHandled] = useState(0);
  const [weekResponded, setWeekResponded] = useState(0);
  const [hasActiveListings, setHasActiveListings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = supabase as unknown as { from: (t: string) => any; rpc: (n: string, a?: unknown) => any };
      const [rpcRes, propRes] = await Promise.all([
        sb.rpc("get_owner_response_rate", { p_owner_id: userId }),
        sb.from("properties")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", userId)
          .in("status", ["listed", "edit_pending_review"])
          .eq("is_active", true),
      ]);
      if (cancelled) return;

      const row = Array.isArray(rpcRes?.data) ? rpcRes.data[0] : rpcRes?.data;
      // Prefer `_handled` per Prompt 6 spec; fall back to `_total` if the RPC
      // was deployed with the earlier column names.
      const h = Number(row?.all_time_handled ?? row?.all_time_total ?? 0);
      const r = Number(row?.all_time_responded ?? 0);
      const wh = Number(row?.last_7d_handled ?? row?.last_7d_total ?? 0);
      const wr = Number(row?.last_7d_responded ?? 0);
      setHandled(Number.isFinite(h) ? h : 0);
      setResponded(Number.isFinite(r) ? r : 0);
      setWeekHandled(Number.isFinite(wh) ? wh : 0);
      setWeekResponded(Number.isFinite(wr) ? wr : 0);
      setHasActiveListings((propRes?.count ?? 0) > 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <Skeleton className="h-4 w-56" />;

  // Hide entirely for pure tenant profiles: no active listings AND no request history.
  if (!hasActiveListings && handled === 0) return null;

  // Condition A: fewer than 5 handled → "New owner · Verified"
  if (handled < 5) {
    return (
      <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <span aria-hidden>✓</span> Verified
        </span>
        <span>· New owner</span>
      </p>
    );
  }

  // Condition B: enough data to display rates
  const allTimePct = Math.round((responded / handled) * 100);
  const weekPct = weekHandled > 0 ? Math.round((weekResponded / weekHandled) * 100) : null;

  return (
    <div className="space-y-0.5">
      <p className="text-sm text-muted-foreground">
        Responds to {allTimePct}% of requests · {handled} handled all-time
      </p>
      {weekPct !== null && (
        <p className="text-sm text-muted-foreground">
          This week: {weekPct}% · {weekHandled} handled
        </p>
      )}
    </div>
  );
}
