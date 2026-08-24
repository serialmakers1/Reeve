import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Pencil, Settings, Award } from "lucide-react";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { getUserDisplayName } from "@/lib/user";
import { mapBioError } from "@/lib/bioValidation";

import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ListingsGrid from "@/components/profile/ListingsGrid";
import { BioSection } from "@/components/profile/BioSection";
import ReputationSummary from "@/components/ratings/ReputationSummary";

interface ProfileRow {
  display_name: string | null;
  bio: string | null;
  is_public: boolean | null;
  profile_photo_url: string | null;
}

export default function Me() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useRequireAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    (async () => {
      const [{ data: pRow }, { data: uRow }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("display_name, bio, is_public, profile_photo_url")
          .eq("user_id", user.id)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("users")
          .select("full_name, email, created_at, phone_verified, email_verified, pseudonym")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      setProfile(pRow as ProfileRow | null);
      setCreatedAt(uRow?.created_at ?? null);
      setPhoneVerified(!!uRow?.phone_verified);
      setEmailVerified(!!uRow?.email_verified);
      setFullName(uRow?.full_name ?? null);
      setPseudonym(uRow?.pseudonym ?? null);
      setLoading(false);
    })();
  }, [authLoading, user?.id]);

  const displayName = useMemo(
    () => getUserDisplayName(user, profile),
    [user, profile],
  );

  const handleSaveBio = async (rawBio: string) => {
    try {
      const { data, error } = await supabase.rpc("update_profile_bio", {
        p_bio: rawBio,
      });
      if (error) {
        const mapped = mapBioError(error.message ?? "");
        if (mapped) return { ok: false as const, error: mapped };
        toast({ title: "Could not save", description: error.message, variant: "destructive" });
        return { ok: false as const };
      }
      const savedBio: string | null = data ?? null;
      setProfile((p) => ({
        display_name: p?.display_name ?? null,
        bio: savedBio,
        is_public: p?.is_public ?? true,
        profile_photo_url: p?.profile_photo_url ?? null,
      }));
      return { ok: true as const };
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      return { ok: false as const };
    }
  };

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

  const verified = phoneVerified || emailVerified;

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {displayName}
                </h1>
                {verified && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-label="Verified" />
                )}
              </div>
              {createdAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {format(new Date(createdAt), "MMMM yyyy")}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Identity card — D-P4-001/002/004. Both fields non-editable. */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Your name (from Google)
                </p>
                <p className="text-base font-medium text-foreground select-text">
                  {fullName ?? "—"}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Your comment name
                </p>
                <p className="inline-block rounded-md bg-muted px-2.5 py-1 font-mono text-sm text-foreground select-text">
                  {pseudonym ?? "—"}
                </p>
                <p className="text-muted-foreground text-sm">
                  This name keeps your comments anonymous and permanent. It's how you appear in all property discussions on Reeve — no one can identify you from it, and you can't change it. This protects everyone on the platform.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        <BioSection bio={profile?.bio ?? null} onSave={handleSaveBio} />

        {/* Listings */}
        <section>
          <ListingsGrid userId={user.id} heading="My listings" />
        </section>

        {/* Reputation summary (v2) */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Reputation</h2>
          </div>
          <ReputationSummary userId={user.id} />
        </section>

        {/* Account settings */}
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Account settings</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Phone verification, Google account linking, and other private settings.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/profile")}>
              Manage
            </Button>
          </div>
        </section>

        {/* Rental preferences (Phase 2 — D-177) */}
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Rental preferences</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                What you're looking for — city, occupants, move-in, and more.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/tenant-dashboard/preferences")}>
              Edit
            </Button>
          </div>
        </section>

        {/* View as public */}
        <p className="text-center text-xs text-muted-foreground">
          This is how you see it.{" "}
          <button
            onClick={() => navigate(`/u/${user.id}`)}
            className="underline hover:text-foreground"
          >
            View my public profile →
          </button>
        </p>
      </div>
    </Layout>
  );
}
