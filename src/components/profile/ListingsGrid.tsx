import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BHK_OPTIONS } from "@/config/property-form";

interface Props {
  userId: string;
  heading?: string;
}

interface Listing {
  id: string;
  building_name: string | null;
  locality: string | null;
  city: string | null;
  bhk: string | null;
  listed_rent: number | null;
  primary_image_url: string | null;
}

const bhkLabel = (v: string | null): string =>
  v ? BHK_OPTIONS.find((o) => o.value === v)?.label ?? v : "";

const formatRupees = (n: number | null): string =>
  n && n > 0 ? "₹" + n.toLocaleString("en-IN") : "";

export default function ListingsGrid({ userId, heading = "Listings" }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  // D1: batched view+comment counts per property (D-P4-015 thresholds).
  const [countsMap, setCountsMap] = useState<Record<string, { view_count: number; comment_count: number }>>({});

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: props } = await (supabase as any)
        .from("properties")
        .select("id, building_name, locality, city, bhk, listed_rent")
        .eq("owner_id", userId)
        // Codebase convention: edit_pending_review is still a live public listing.
        .in("status", ["listed", "edit_pending_review"])
        .eq("is_active", true)
        .order("listed_at", { ascending: false });
      const rows = (props ?? []) as Omit<Listing, "primary_image_url">[];
      if (rows.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }
      const ids = rows.map((r) => r.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: imgs } = await (supabase as any)
        .from("property_images")
        .select("property_id, url")
        .in("property_id", ids)
        .eq("is_primary", true);
      const imgMap: Record<string, string> = {};
      for (const img of (imgs ?? []) as { property_id: string; url: string }[]) {
        imgMap[img.property_id] = img.url;
      }
      setListings(rows.map((r) => ({ ...r, primary_image_url: imgMap[r.id] ?? null })));
      setLoading(false);

      // D1: fire-and-forget batched counts (same pattern as Search B7).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .rpc("get_property_counts", { p_property_ids: ids })
        .then(({ data }: { data: unknown }) => {
          const arr = Array.isArray(data)
            ? (data as { property_id: string; view_count: number | string; comment_count: number | string }[])
            : [];
          const m: Record<string, { view_count: number; comment_count: number }> = {};
          for (const row of arr) {
            m[row.property_id] = {
              view_count: Number(row.view_count ?? 0),
              comment_count: Number(row.comment_count ?? 0),
            };
          }
          setCountsMap(m);
        })
        .catch(() => { /* silent */ });
    })();
  }, [userId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">{heading}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg border bg-muted animate-pulse aspect-[4/3]" />
          ))}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">{heading}</h2>
        <p className="text-sm text-muted-foreground">No active listings.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">
        {heading} <span className="text-muted-foreground font-normal">({listings.length})</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listings.map((p) => {
          const c = countsMap[p.id];
          const showViews = (c?.view_count ?? 0) >= 10;
          const showComments = (c?.comment_count ?? 0) >= 1;
          return (
            <Link
              key={p.id}
              to={`/property/${p.id}`}
              className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[4/3] bg-muted">
                {p.primary_image_url ? (
                  <img
                    src={p.primary_image_url}
                    alt={p.building_name ?? "Property"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
              </div>
              <div className="p-3 space-y-0.5">
                <p className="text-sm font-medium text-foreground truncate">
                  {p.building_name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[p.locality, p.city].filter(Boolean).join(", ") || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[bhkLabel(p.bhk), formatRupees(p.listed_rent) + (p.listed_rent ? "/mo" : "")]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {(showViews || showComments) && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {showViews && <span>👁 {c!.view_count} views</span>}
                    {showViews && showComments && <span> · </span>}
                    {showComments && <span>💬 {c!.comment_count} comments</span>}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
