import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type EligibilityStatus = 'pending' | 'passed' | 'disqualified';

interface EligibilityGateResult {
  checkAndFavourite: (propertyId: string, onAllowed: () => Promise<void> | void) => Promise<void>;
}

export function useEligibilityGate(): EligibilityGateResult {
  const navigate = useNavigate();

  const checkAndFavourite = useCallback(async (propertyId: string, onAllowed: () => Promise<void> | void) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast({
        title: "You need to be logged in to shortlist properties.",
      });
      navigate('/login');
      return;
    }

    const { data } = await supabase
      .from('eligibility')
      .select('status')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle();

    const status = data?.status as EligibilityStatus | undefined;

    if (status === 'pending' || status === 'passed') {
      await onAllowed();
    } else {
      toast({
        title: "Complete a quick eligibility check first — takes 2 minutes.",
      });
      navigate(`/eligibility?returnTo=/property/${propertyId}`);
    }
  }, [navigate]);

  return { checkAndFavourite };
}
