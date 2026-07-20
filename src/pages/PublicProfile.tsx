import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import posthog from "posthog-js";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDisplayName } from "@/lib/user";

import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ListingsGrid from "@/components/profile/ListingsGrid";
import RatingsBlock, { type RatingSummaryResult } from "@/components/ratings/RatingsBlock";

interface PublicProfileRow {
  user_id: string;
  bio: string | null;
  profile_photo_url: string | null;
  is_public: boolean | null;
}

interface UserRow {
  full_name: string | null;
  email: string | null;
  created_at: string | null;
  phone_verified: boolean | null;
  email_verified: boolean | null;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth();

  const [publicProfile, setPublicProfile] = useState<PublicProfileRow | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<RatingSummaryResult | null>(null);
  const [ratingLoading, setRatingLoading] = useState(true);
  const posthogFiredRef = useRef(false);

  // F2 (D-151): no self-redirect. /u/:userId renders the public view regardless
  // of viewer identity so owners can preview their own public profile.

  useEffect(() => {
    if (authLoading || !userId || !user?.id) return;
    if (posthogFiredRef.current) return;
    posthogFiredRef.current = true;
    posthog?.capture("commons_profile_viewed", {
      self: user.id === userId,
      target_user_id: userId,
    });
  }, [authLoading, userId, user?.id]);

  useEffect(() => {
    if (authLoading || !userId || !user?.id) return;
    (async () => {
      // Read public_profiles view (see migration 20260710120800). Filters by is_public.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pub } = await (supabase as any)
        .from("public_profiles")
        // D-P4-004: public profile shows real name only (from users.full_name via
        // getUserDisplayName). display_name intentionally omitted from select.
        .select("user_id, bio, profile_photo_url, is_public")
        .eq("user_id", userId)
        .maybeSingle();

      // Also read minimal user info (full_name, created_at, verification flags).
      // The users RLS policy `users_select_own` is restrictive — for cross-user reads
      // we rely on `users_owner_read_tenant_name` which permits owner→tenant reads.
      // For public profile visibility of any user, this may return null; that's OK.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: uRow } = await (supabase as any)
        .from("users")
        .select("full_name, email, created_at, phone_verified, email_verified")
        .eq("id", userId)
        .maybeSingle();

      if (!pub && !uRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      // D-173: view now exposes is_public as a column (no longer filters server-side).
      // Guard here: treat is_public=false the same as private profile.
      if (!pub && uRow) {
        setPrivateProfile(true);
        setLoading(false);
        return;
      }
      if (pub && (pub as PublicProfileRow).is_public === false) {
        setPrivateProfile(true);
        setLoading(false);
        return;
      }
      setPublicProfile(pub as PublicProfileRow);
      setUserRow((uRow ?? null) as UserRow | null);
      setLoading(false);
    })();
  }, [authLoading, userId, user?.id]);

  // C4: rating summary — separate effect, silent on error.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_user_rating_summary", { p_user_id: userId });
      if (cancelled) return;
      if (!error && data) setRatingSummary(data as RatingSummaryResult);
      setRatingLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
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

  // D-P4-004: full_name (from users) only; display_name intentionally not consulted here.
  const displayName = getUserDisplayName(userRow);
  const verified = !!userRow?.phone_verified || !!userRow?.email_verified;

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Identity */}
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              photoUrl={publicProfile?.profile_photo_url}
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
                {ratingSummary?.status === "new" && (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    ✓ New on Reeve
                  </span>
                )}
              </div>
              {userRow?.created_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {format(new Date(userRow.created_at), "MMMM yyyy")}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Bio */}
        {publicProfile?.bio && (
          <section>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{publicProfile.bio}</p>
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

        {/* C4: Interaction ratings block (separate from OwnerStatsBlock contact response rate). */}
        <RatingsBlock summary={ratingSummary} loading={ratingLoading} />
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
