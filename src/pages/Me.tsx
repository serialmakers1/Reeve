import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import posthog from "posthog-js";
import { format } from "date-fns";
import { CheckCircle2, Pencil, Settings, Star } from "lucide-react";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { getUserDisplayName } from "@/lib/user";

import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ListingsGrid from "@/components/profile/ListingsGrid";

interface ProfileRow {
  display_name: string | null;
  bio: string | null;
  is_public: boolean | null;
  profile_photo_url: string | null;
}

const BIO_MAX = 200;

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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const posthogFiredRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user?.id || posthogFiredRef.current) return;
    posthogFiredRef.current = true;
    posthog?.capture("commons_profile_viewed", { self: true });
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const openEdit = () => {
    setBioDraft(profile?.bio ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (!user?.id) return;
    const trimmedBio = bioDraft.trim();
    if (trimmedBio.length > BIO_MAX) {
      toast({ title: `Bio too long (max ${BIO_MAX} chars)`, variant: "destructive" });
      return;
    }
    setSaving(true);
    // D-P4-003: display_name UI removed; only bio is user-editable now.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          bio: trimmedBio || null,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setProfile((p) => ({
      display_name: p?.display_name ?? null,
      bio: trimmedBio || null,
      is_public: p?.is_public ?? true,
      profile_photo_url: p?.profile_photo_url ?? null,
    }));
    posthog?.capture("commons_profile_edited", {
      changed_fields: trimmedBio !== (profile?.bio ?? "") ? ["bio"] : [],
    });
    toast({ title: "Profile updated" });
    setEditing(false);
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
              {!editing && (
                <Button variant="outline" size="sm" onClick={openEdit} className="mt-3">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit profile
                </Button>
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

        {/* Edit mode */}
        {editing && (
          <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Bio</Label>
              <Textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                placeholder="A short line about yourself"
                maxLength={BIO_MAX}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bioDraft.length} / {BIO_MAX}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </section>
        )}

        {/* Bio */}
        {!editing && (
          <section>
            {profile?.bio ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{profile.bio}</p>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">Add a bio to tell others about yourself.</p>
                <Button variant="ghost" size="sm" onClick={openEdit} className="mt-2">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Add bio
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Listings */}
        <section>
          <ListingsGrid userId={user.id} heading="My listings" />
        </section>

        {/* Ratings placeholder */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Ratings & Reviews</h2>
          </div>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No ratings yet — ratings will appear here after your first tenant interaction.
            </p>
          </div>
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
