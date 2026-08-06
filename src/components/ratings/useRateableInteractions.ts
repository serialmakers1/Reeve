import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ownerCardKeys } from "@/hooks/useOwnerCard";
import { ratingSummaryKeys } from "./useRatingSummary";
import type { RatingAnswers } from "./ratingQuestions";

export interface RateableInteraction {
  contact_request_id: string;
  property_id: string;
  building_name: string | null;
  locality: string | null;
  counterparty_name: string | null;
  counterparty_user_id: string;
  i_am: "owner" | "seeker";
  my_submitted: boolean;
  property_viewable: boolean;
}

export const rateableKeys = {
  all: ["rateableInteractions"] as const,
  byUser: (userId: string) => ["rateableInteractions", userId] as const,
};

/**
 * Single page-level batched fetch of the caller's rateable interactions (both
 * directions). Cards read from this cache — never one fetch per request.
 */
export function useRateableInteractions() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: userId ? rateableKeys.byUser(userId) : rateableKeys.all,
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<RateableInteraction[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_my_rateable_interactions_v2");
      if (error) throw error;
      return Array.isArray(data) ? (data as RateableInteraction[]) : [];
    },
  });

  const submit = useCallback(
    async (contactRequestId: string, answers: RatingAnswers, counterpartyUserId?: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("submit_rating_v2", {
        p_contact_request_id: contactRequestId,
        p_reach: answers.reach,
        p_accuracy: answers.accuracy,
        p_progress: answers.progress,
        p_respect: answers.respect,
        p_trust: answers.trust,
      });
      if (error) throw error;
      // Refresh this list + the counterparty's reputation surfaces.
      if (userId) qc.invalidateQueries({ queryKey: rateableKeys.byUser(userId) });
      if (counterpartyUserId) {
        qc.invalidateQueries({ queryKey: ratingSummaryKeys.byUser(counterpartyUserId) });
        qc.invalidateQueries({ queryKey: ownerCardKeys.byOwner(counterpartyUserId) });
      } else {
        qc.invalidateQueries({ queryKey: ratingSummaryKeys.all });
        qc.invalidateQueries({ queryKey: ownerCardKeys.all });
      }
    },
    [qc, userId],
  );

  return {
    interactions: query.data ?? [],
    isLoading: authLoading || query.isLoading,
    error: (query.error as Error | null) ?? null,
    submit,
  };
}
