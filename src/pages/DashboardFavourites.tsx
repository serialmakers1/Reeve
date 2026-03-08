import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, Search, X } from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";
import FavouriteHeart from "@/components/FavouriteHeart";
import Layout from "@/components/Layout";

interface FavProperty {
  id: string;
  building_name: string;
  floor_number: number | null;
  locality: string | null;
  city: string;
  bhk: string;
  listed_rent: number;
  furnishing: string;
  square_footage: number | null;
  property_type: string | null;
  primary_image_url: string | null;
}

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";

function formatIndianRupee(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return "₹" + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "₹" + formatted + "," + last3;
}

function bhkLabel(bhk: string): string {
  const map: Record<string, string> = {
    studio: "Studio", "1BHK": "1 BHK", "2BHK": "2 BHK",
    "3BHK": "3 BHK", "4BHK": "4 BHK", "5BHK_plus": "5 BHK+",
  };
  return map[bhk] ?? bhk;
}

function furnishingLabel(f: string): string {
  const map: Record<string, string> = {
    unfurnished: "Unfurnished", semi_furnished: "Semi Furnished", fully_furnished: "Fully Furnished",
  };
  return map[f] ?? f;
}

export default function DashboardFavourites() {
  const navigate = useNavigate();
  const { isFavourited, toggleFavourite, isLoggedIn, loading: favLoading } = useFavourites();

  const [properties, setProperties] = useState<FavProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibilityPassed, setEligibilityPassed] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (favLoading) return;
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch favourites
      const { data: favs } = await supabase
        .from("favourites")
        .select("property_id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!favs || favs.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }

      const ids = favs.map((f) => f.property_id);

      // Fetch properties
      const { data: props } = await supabase
        .from("properties_public")
        .select("id, building_name, floor_number, locality, city, bhk, listed_rent, furnishing, square_footage, property_type")
        .in("id", ids);

      // Fetch primary images
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

      // Maintain favourites order
      const propMap = new Map((props ?? []).map((p) => [p.id, p]));
      const ordered: FavProperty[] = ids
        .map((id) => {
          const p = propMap.get(id);
          if (!p) return null;
          return { ...p, primary_image_url: imageMap[p.id] || null } as FavProperty;
        })
        .filter(Boolean) as FavProperty[];

      setProperties(ordered);

      // Check eligibility
      const { data: elig } = await supabase
        .from("eligibility")
        .select("status")
        .eq("user_id", session.user.id)
        .eq("status", "passed")
        .limit(1)
        .maybeSingle();

      setEligibilityPassed(!!elig);
      setLoading(false);
    };

    fetchData();
  }, [favLoading, isLoggedIn, navigate]);

  const handleUnfavourite = async (propertyId: string) => {
    await toggleFavourite(propertyId);
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
  };

  if (loading || favLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          <h1 className="text-xl font-bold text-foreground">My Favourites</h1>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">My Favourites</h1>

        {/* Eligibility nudge */}
        {!eligibilityPassed && properties.length > 0 && !bannerDismissed && (
          <div className="relative rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <button
              onClick={() => setBannerDismissed(true)}
              className="absolute right-2 top-2 rounded-full p-1 text-blue-400 hover:text-blue-600"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="pr-8 text-sm font-medium text-blue-800">
              Complete your eligibility check to start applying to your saved properties
            </p>
            <Link to="/eligibility">
              <Button size="sm" className="mt-2">Check Eligibility →</Button>
            </Link>
          </div>
        )}

        {/* Empty state */}
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

        {/* Cards */}
        {properties.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.map((p) => (
              <Link key={p.id} to={`/property/${p.id}`} className="block cursor-pointer">
                <div className="group relative rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md hover:shadow-primary/10">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={p.primary_image_url || PLACEHOLDER_IMG}
                      alt={`${p.building_name} ${bhkLabel(p.bhk)} apartment`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {bhkLabel(p.bhk)}
                    </span>
                    <div className="absolute right-2 top-2">
                      <FavouriteHeart
                        filled={true}
                        onClick={() => handleUnfavourite(p.id)}
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
                      <span className="text-lg font-bold text-white">
                        {formatIndianRupee(p.listed_rent)}
                        <span className="text-sm font-normal opacity-80">/mo</span>
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      {p.locality ? `${p.locality}, ` : ""}{p.city}
                    </p>
                    <h3 className="text-sm font-bold text-foreground leading-tight">
                      {p.building_name}
                      {p.floor_number != null && (
                        <span className="font-normal text-muted-foreground"> · Floor {p.floor_number}</span>
                      )}
                    </h3>
                    <div className="flex gap-1.5 pt-1">
                      <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        1 Month Deposit
                      </span>
                      <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Zero Brokerage
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
