import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import posthog from "posthog-js";
import { Plus, Building2, AlertCircle } from "lucide-react";

import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import TopRequestsStrip from "@/components/owner-dashboard/TopRequestsStrip";
import PropertyCard from "@/components/owner-dashboard/PropertyCard";

const DRAFT_LIMIT = 20;

// Statuses eligible for the Active tab. Includes both Commons statuses and
// legacy PM statuses so an owner who still has PM properties sees them here too.
const ACTIVE_STATUSES = new Set([
  "draft", "pending_review", "changes_requested", "listed",
  "edit_pending_review", "unlisted",
  // Legacy PM
  "inspection_proposed", "inspection_accepted", "inspection_scheduled",
  "inspected", "agreement_pending", "occupied", "off_market", "expiring",
  "turnover", "inactive",
]);

interface OwnerProperty {
  id: string;
  building_name: string | null;
  locality: string | null;
  city: string | null;
  bhk: string | null;
  listed_rent: number | null;
  status: string;
  is_active: boolean;
  created_at: string;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showDraftLimit, setShowDraftLimit] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const posthogFiredRef = useRef(false);

  useEffect(() => {
    if (authLoading || posthogFiredRef.current) return;
    posthogFiredRef.current = true;
    posthog?.capture("commons_owner_dashboard_viewed");
  }, [authLoading]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: props } = await (supabase as any)
        .from("properties")
        .select("id, building_name, locality, city, bhk, listed_rent, status, is_active, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      const rows = (props ?? []) as OwnerProperty[];
      setProperties(rows);
      setDraftCount(rows.filter((r) => r.status === "draft").length);

      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: imgs } = await (supabase as any)
          .from("property_images")
          .select("property_id, url")
          .in("property_id", ids)
          .eq("is_primary", true);
        const map: Record<string, string> = {};
        for (const img of (imgs ?? []) as { property_id: string; url: string }[]) {
          map[img.property_id] = img.url;
        }
        setPhotoMap(map);
      }
      setLoading(false);
    })();
  }, [authLoading, user?.id]);

  const activeProperties = useMemo(
    () => properties.filter((p) => ACTIVE_STATUSES.has(p.status)),
    [properties],
  );
  const archivedProperties = useMemo(
    () => properties.filter((p) => p.status === "archived"),
    [properties],
  );

  const visibleProperties = tab === "active" ? activeProperties : archivedProperties;

  const pendingActions = useMemo(() => {
    const drafts = activeProperties.filter((p) => p.status === "draft").length;
    const needsChanges = activeProperties.filter((p) => p.status === "changes_requested").length;
    const items: string[] = [];
    if (drafts) items.push(`${drafts} draft${drafts === 1 ? "" : "s"} to complete`);
    if (needsChanges) items.push(`${needsChanges} listing${needsChanges === 1 ? "" : "s"} need${needsChanges === 1 ? "s" : ""} changes`);
    return items;
  }, [activeProperties]);

  const handleAddProperty = () => {
    posthog?.capture("commons_owner_dashboard_add_property_clicked", { draft_count: draftCount });
    if (draftCount >= DRAFT_LIMIT) {
      posthog?.capture("commons_owner_dashboard_add_property_blocked", { draft_count: draftCount });
      setShowDraftLimit(true);
      return;
    }
    navigate("/list");
  };

  const goToProperty = (p: OwnerProperty) => {
    posthog?.capture("commons_owner_dashboard_property_card_clicked", {
      property_id: p.id,
      status: p.status,
    });
    navigate(`/owner-dashboard/property/${p.id}`);
  };

  const handleTabChange = (next: "active" | "archived") => {
    setTab(next);
    posthog?.capture("commons_owner_dashboard_tab_changed", { tab: next });
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const isEmptyOverall = properties.length === 0;

  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-4 py-6 pb-24">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Listings</h1>
            {draftCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {draftCount} draft{draftCount === 1 ? "" : "s"} in progress
              </p>
            )}
          </div>
          <Button onClick={handleAddProperty} className="min-h-[40px]">
            <Plus className="mr-1.5 h-4 w-4" /> Add Property
          </Button>
        </div>

        {/* Top requests strip (reserved for Phase 3 contact requests) */}
        <div className="mb-4">
          <TopRequestsStrip count={0} />
        </div>

        {/* Pending actions row */}
        {pendingActions.length > 0 && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Needs your attention</p>
            </div>
            <ul className="mt-1.5 text-sm text-amber-700 space-y-0.5">
              {pendingActions.map((a) => <li key={a}>· {a}</li>)}
            </ul>
          </div>
        )}

        {/* Empty state (no properties at all) */}
        {isEmptyOverall ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 px-4 text-center">
            <Building2 className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Welcome to Reeve</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Get started by listing your first property. It takes about 10 minutes.
            </p>
            <Button className="mt-5 min-h-[44px]" onClick={handleAddProperty}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Property
            </Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-4 border-b flex gap-4">
              <TabButton active={tab === "active"} onClick={() => handleTabChange("active")}>
                Active {activeProperties.length > 0 && `(${activeProperties.length})`}
              </TabButton>
              {archivedProperties.length > 0 && (
                <TabButton active={tab === "archived"} onClick={() => handleTabChange("archived")}>
                  Archived ({archivedProperties.length})
                </TabButton>
              )}
            </div>

            {/* Property grid */}
            {visibleProperties.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {tab === "active"
                    ? "You haven't listed any properties yet. Click 'Add Property' to get started."
                    : "No archived properties."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleProperties.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    primaryPhotoUrl={photoMap[p.id] ?? null}
                    onClick={() => goToProperty(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Draft limit modal */}
      <Dialog open={showDraftLimit} onOpenChange={setShowDraftLimit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Draft limit reached</DialogTitle>
            <DialogDescription>
              You have reached the {DRAFT_LIMIT}-draft limit. Complete or discard some drafts before starting a new listing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDraftLimit(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px]",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
