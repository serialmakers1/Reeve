import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RatingSide, RatingSummaryV2 } from "@/components/ratings/ratingQuestions";

export interface OwnerCardData {
  displayName: string | null;
  profilePhotoUrl: string | null;
  allTimeHandled: number;
  allTimeRate: number;
  /** Reputation as a lister (v2), for the compact summary. Null when no ratings. */
  ratingSide: RatingSide | null;
}

export const ownerCardKeys = {
  all: ["ownerCard"] as const,
  // Kept for invalidation: useRateableInteractions invalidates byOwner(ownerId),
  // which prefix-matches the owner-first byOwnerProperty key below.
  byOwner: (ownerId: string) => ["ownerCard", ownerId] as const,
  // Actual query key. Owner-id first (so byOwner stays a valid prefix);
  // propertyId included so one property's identity is never reused for another.
  byOwnerProperty: (ownerId: string, propertyId: string) =>
    ["ownerCard", ownerId, propertyId] as const,
};

interface ResponseRateRow {
  all_time_handled: number | string | null;
  all_time_responded: number | string | null;
  all_time_rate: number | string | null;
  last_7d_handled: number | string | null;
  last_7d_responded: number | string | null;
  last_7d_rate: number | string | null;
}

export function useOwnerCard(
  propertyId: string | null | undefined,
  ownerId: string | null | undefined,
) {
  const query = useQuery({
    queryKey:
      ownerId && propertyId
        ? ownerCardKeys.byOwnerProperty(ownerId, propertyId)
        : ownerCardKeys.all,
    enabled: !!propertyId && !!ownerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OwnerCardData> => {
      const [identityRes, rateRes, ratingRes] = await Promise.all([
        // Identity is property-scoped: get_owner_card returns { name,
        // profile_photo_url } only for publicly-visible properties. No fallback
        // to public_profiles — a non-public property simply yields no row.
        supabase.rpc("get_owner_card", { p_property_id: propertyId! }),
        supabase.rpc("get_owner_response_rate", { p_owner_id: ownerId! }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).rpc("get_user_rating_summary_v2", { p_user_id: ownerId! }),
      ]);

      if (identityRes.error) throw identityRes.error;
      if (rateRes.error) throw rateRes.error;
      if (ratingRes.error) throw ratingRes.error;

      const identity =
        (identityRes.data as unknown as { name: string | null; profile_photo_url: string | null }[] | null)?.[0] ??
        null;

      const rateRow =
        (rateRes.data as unknown as ResponseRateRow[] | null)?.[0] ?? null;
      const allTimeHandled = Number(rateRow?.all_time_handled ?? 0);
      const allTimeRate = Number(rateRow?.all_time_rate ?? 0);

      const ratingJson = (ratingRes.data ?? null) as RatingSummaryV2 | null;
      const ratingSide = ratingJson?.as_lister ?? null;

      return {
        displayName: identity?.name ?? null,
        profilePhotoUrl: identity?.profile_photo_url ?? null,
        allTimeHandled,
        allTimeRate,
        ratingSide,
      };
    },
  });

  return {
    ...query.data,
    displayName: query.data?.displayName ?? null,
    profilePhotoUrl: query.data?.profilePhotoUrl ?? null,
    allTimeHandled: query.data?.allTimeHandled ?? 0,
    allTimeRate: query.data?.allTimeRate ?? 0,
    ratingSide: query.data?.ratingSide ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
