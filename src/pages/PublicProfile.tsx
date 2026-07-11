import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import posthog from "posthog-js";
import { format } from "date-fns";
import { CheckCircle2, Star } from "lucide-react";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDisplayName } from "@/lib/user";

import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ListingsGrid from "@/components/profile/ListingsGrid";

interface PublicProfileRow {
  user_id: string;
  display_name: string | null;
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
  const posthogFiredRef = useRef(false);

  // Self-redirect: viewing own profile → /me
  useEffect(() => {
    if (!authLoading && user?.id && userId && user.id === userId) {
      navigate("/me", { replace: true });
    }
  }, [authLoading, user?.id, userId, navigate]);

  useEffect(() => {
    if (authLoading || !userId || !user?.id) return;
    if (user.id === userId) return; // effect above handles the redirect
    if (posthogFiredRef.current) return;
    posthogFiredRef.current = true;
    posthog?.capture("commons_profile_viewed", { self: false, target_user_id: userId });
  }, [authLoading, userId, user?.id]);

  useEffect(() => {
    if (authLoading || !userId || !user?.id || user.id === userId) return;
    (async () => {
      // Read public_profiles view (see migration 20260710120800). Filters by is_public.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pub } = await (supabase as any)
        .from("public_profiles")
        .select("user_id, display_name, bio, profile_photo_url, is_public")
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
      // If the profile row exists but is_public=false, the view filters it out.
      // Distinguish "no row" from "hidden": if we got no view row but the user row exists,
      // we could still show a minimal card. Simpler: treat as private profile.
      if (!pub && uRow) {
        setPrivateProfile(true);
        setLoading(false);
        return;
      }
      setPublicProfile(pub as PublicProfileRow);
      setUserRow((uRow ?? null) as UserRow | null);
      setLoading(false);
    })();
  }, [authLoading, userId, user?.id]);

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

  const displayName = getUserDisplayName(userRow, publicProfile);
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {displayName}
                </h1>
                {verified && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-label="Verified" />
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

        {/* Listings */}
        {userId && (
          <section>
            <ListingsGrid userId={userId} heading="Listings" />
          </section>
        )}

        {/* Ratings placeholder */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Ratings & Reviews</h2>
          </div>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No ratings yet.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
