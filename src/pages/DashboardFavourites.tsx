import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { SearchCardSkeleton } from "@/features/search/components/list/SearchCardSkeleton";
import { Button } from "@/components/ui/button";
import { Heart, Search } from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";
import Layout from "@/components/Layout";
import { formatIndianRupee, formatPriceShort } from "@/features/search/domain/formatCurrency";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
import { cn } from "@/lib/utils";

interface FavProperty {
  id: string;
  building_name: string;
  locality: string | null;
  city: string;
  bhk: string;
  listed_rent: number | null;
  sale_price: number | null;
  listing_type: "rent" | "sale";
  property_type: string | null;
  primary_image_url: string | null;
}

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";

export default function DashboardFavourites() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRequireAuth();
  const { toggleFavourite } = useFavourites();

  const [properties, setProperties] = useState<FavProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setQueryError(false);
    setLoading(true);

    const { data: favs, error: favsError } = await supabase
      .from("favourites")
      .select("property_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (favsError) {
      setQueryError(true);
      setLoading(false);
      return;
    }

    if (!favs || favs.length === 0) {
      setProperties([]);
      setLoading(false);
      return;
    }

    const ids = favs.map((f) => f.property_id);

    const { data: props, error: propsError } = await supabase
      .from("properties")
      .select("id, building_name, locality, city, bhk, listed_rent, sale_price, listing_type, property_type")
      .in("id", ids)
      .in("status", ["listed", "edit_pending_review"])
      .eq("is_active", true);

    if (propsError) {
      setQueryError(true);
      setLoading(false);
      return;
    }

    let imageMap: Record<string, string> = {};
    if (props && props.length > 0) {
      const { data: imgs } = await supabase
        .from("property_images")
        .select("property_id, url")
        .in("property_id", ids)
        .eq("is_primary", true);
      if (imgs) {
        for (const img of imgs) imageMap[img.property_id] = img.url;
      }
    }

    // Maintain favourites order; skip deleted or unavailable properties
    const propMap = new Map((props ?? []).map((p) => [p.id, p]));
    const ordered: FavProperty[] = ids
      .map((id) => {
        const p = propMap.get(id);
        if (!p) return null;
        return { ...p, primary_image_url: imageMap[p.id] || null } as FavProperty;
      })
      .filter(Boolean) as FavProperty[];

    setProperties(ordered);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const handleUnfavourite = async (propertyId: string) => {
    const idx = properties.findIndex((p) => p.id === propertyId);
    if (idx === -1) return;
    const removed = properties[idx];
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    const ok = await toggleFavourite(propertyId);
    if (!ok && removed) {
      setProperties((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, removed);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          <h1 className="text-xl font-bold text-foreground">My Favourites</h1>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SearchCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (queryError) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          <h1 className="text-xl font-bold text-foreground">My Favourites</h1>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-destructive">Something went wrong loading your favourites.</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">My Favourites</h1>

        <p className="text-xs text-muted-foreground">
          Saved properties that are unlisted or no longer available will automatically disappear from this page.
        </p>

        {properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h2 className="text-lg font-bold text-foreground">No saved properties yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse properties and tap the ♡ to save ones you like
            </p>
            <Button className="mt-4 min-h-[44px]" onClick={() => navigate("/search")}>
              <Search className="mr-2 h-4 w-4" /> Browse Properties
            </Button>
          </div>
        )}

        {properties.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.map((p, i) => {
              const isRent = p.listing_type === "rent";
              const price: { amount: string; unit?: string } | null = isRent
                ? p.listed_rent != null && p.listed_rent > 0
                  ? { amount: formatIndianRupee(p.listed_rent), unit: "/mo" }
                  : null
                : p.sale_price != null && p.sale_price > 0
                  ? { amount: formatPriceShort(p.sale_price) }
                  : null;
              const bhkLabel = formatEnumLabel("bhk", p.bhk);
              const typeLabel = formatEnumLabel("property_type", p.property_type);
              const titleLine = [bhkLabel, typeLabel].filter(Boolean).join(" · ") || "Property";
              const locationLine = [p.building_name?.trim(), p.locality?.trim() || p.city?.trim()]
                .filter(Boolean)
                .join(" · ");

              return (
                <article
                  key={p.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-primary/40"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnfavourite(p.id); }}
                    aria-label="Remove from favourites"
                    aria-pressed={true}
                    className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  </button>

                  <Link to={`/property/${p.id}`} className="block focus-visible:outline-none">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      <img
                        src={p.primary_image_url || PLACEHOLDER_IMG}
                        alt={titleLine}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG; }}
                      />
                    </div>
                    <div
                      aria-hidden="true"
                      className={cn(
                        "h-[3px] bg-gradient-to-r",
                        isRent
                          ? "from-teal-500 via-cyan-500 to-blue-600"
                          : "from-indigo-500 via-violet-500 to-amber-500",
                      )}
                    />
                    <div className="p-3 space-y-1">
                      {price && (
                        <p className="text-xl font-bold text-foreground tabular-nums">
                          {price.amount}
                          {price.unit && (
                            <span className="ml-1 text-sm font-normal text-muted-foreground">{price.unit}</span>
                          )}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-foreground leading-tight">{titleLine}</p>
                      {locationLine && (
                        <p className="truncate text-xs text-muted-foreground">{locationLine}</p>
                      )}
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
