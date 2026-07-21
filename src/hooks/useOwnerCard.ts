import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OwnerCardData {
  displayName: string | null;
  profilePhotoUrl: string | null;
  isNew: boolean;
  allTimeHandled: number;
  allTimeRate: number;
  ratingSummary: {
    total: number;
    dealAgainPct: number;
  } | null;
}

export const ownerCardKeys = {
  all: ["ownerCard"] as const,
  byOwner: (ownerId: string) => ["ownerCard", ownerId] as const,
};

interface RatingSummaryJson {
  status?: "new" | "active";
  as_owner?: {
    total?: number;
    deal_again_pct?: number;
  };
}

interface ResponseRateRow {
  all_time_handled: number | string | null;
  all_time_responded: number | string | null;
  all_time_rate: number | string | null;
  last_7d_handled: number | string | null;
  last_7d_responded: number | string | null;
  last_7d_rate: number | string | null;
}

export function useOwnerCard(ownerId: string | null | undefined) {
  const query = useQuery({
    queryKey: ownerId ? ownerCardKeys.byOwner(ownerId) : ownerCardKeys.all,
    enabled: !!ownerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OwnerCardData> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const [profileRes, rateRes, ratingRes] = await Promise.all([
        sb
          .from("public_profiles")
          .select("display_name, full_name, profile_photo_url")
          .eq("user_id", ownerId!)
          .maybeSingle(),
        supabase.rpc("get_owner_response_rate", { p_owner_id: ownerId! }),
        supabase.rpc("get_user_rating_summary", { p_user_id: ownerId! }),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (rateRes.error) throw rateRes.error;
      if (ratingRes.error) throw ratingRes.error;

      const profile = profileRes.data as {
        display_name: string | null;
        full_name: string | null;
        profile_photo_url: string | null;
      } | null;

      const rateRow =
        (rateRes.data as unknown as ResponseRateRow[] | null)?.[0] ?? null;
      const allTimeHandled = Number(rateRow?.all_time_handled ?? 0);
      const allTimeRate = Number(rateRow?.all_time_rate ?? 0);

      const ratingJson = (ratingRes.data ?? null) as RatingSummaryJson | null;
      const asOwner = ratingJson?.as_owner;
      const total = Number(asOwner?.total ?? 0);
      const ratingSummary =
        total > 0
          ? {
              total,
              dealAgainPct: Number(asOwner?.deal_again_pct ?? 0),
            }
          : null;

      return {
        displayName: profile?.display_name ?? profile?.full_name ?? null,
        profilePhotoUrl: profile?.profile_photo_url ?? null,
        isNew: allTimeHandled < 5,
        allTimeHandled,
        allTimeRate,
        ratingSummary,
      };
    },
  });

  return {
    ...query.data,
    displayName: query.data?.displayName ?? null,
    profilePhotoUrl: query.data?.profilePhotoUrl ?? null,
    isNew: query.data?.isNew ?? true,
    allTimeHandled: query.data?.allTimeHandled ?? 0,
    allTimeRate: query.data?.allTimeRate ?? 0,
    ratingSummary: query.data?.ratingSummary ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
