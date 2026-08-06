import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RatingSummaryV2 } from "./ratingQuestions";

export const ratingSummaryKeys = {
  all: ["ratingSummaryV2"] as const,
  byUser: (userId: string) => ["ratingSummaryV2", userId] as const,
};

/** Shared read of the public reputation summary (aggregates only). */
export function useRatingSummary(userId: string | null | undefined) {
  const query = useQuery({
    queryKey: userId ? ratingSummaryKeys.byUser(userId) : ratingSummaryKeys.all,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RatingSummaryV2> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_user_rating_summary_v2", {
        p_user_id: userId!,
      });
      if (error) throw error;
      return (data ?? { as_lister: null, as_seeker: null }) as RatingSummaryV2;
    },
  });

  return {
    summary: (query.data ?? null) as RatingSummaryV2 | null,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
