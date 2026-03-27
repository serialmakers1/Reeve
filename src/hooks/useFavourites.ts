import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function useFavourites() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFavouriteIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("favourites")
      .select("property_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setFavouriteIds(new Set(data.map((r) => r.property_id)));
        setLoading(false);
      });
  }, [userId]);

  const isFavourited = useCallback(
    (propertyId: string) => favouriteIds.has(propertyId),
    [favouriteIds]
  );

  const toggleFavourite = useCallback(
    async (propertyId: string): Promise<boolean> => {
      if (!userId) return false;

      const wasFav = favouriteIds.has(propertyId);

      // Optimistic update
      setFavouriteIds((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(propertyId);
        else next.add(propertyId);
        return next;
      });

      try {
        if (wasFav) {
          const { error } = await supabase
            .from("favourites")
            .delete()
            .eq("user_id", userId)
            .eq("property_id", propertyId);
          if (error) throw error;
          toast({ title: "Removed from favourites" });
        } else {
          const { error } = await supabase
            .from("favourites")
            .insert({ user_id: userId, property_id: propertyId });
          if (error) throw error;
          toast({ title: "Added to favourites ♡" });
        }
        return true;
      } catch {
        // Rollback
        setFavouriteIds((prev) => {
          const next = new Set(prev);
          if (wasFav) next.add(propertyId);
          else next.delete(propertyId);
          return next;
        });
        toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
        return false;
      }
    },
    [userId, favouriteIds]
  );

  return { isFavourited, toggleFavourite, isLoggedIn: !!userId, loading };
}
