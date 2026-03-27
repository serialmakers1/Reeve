import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";

type EligibilityStatus = 'pending' | 'passed' | 'disqualified';

interface EligibilityState {
  status: EligibilityStatus | null;
  reason: string | null;
  loaded: boolean;
}

export default function EligibilityBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<EligibilityState>({ status: null, reason: null, loaded: false });

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setState({ status: null, reason: null, loaded: true });
        return;
      }

      const { data } = await supabase
        .from('eligibility')
        .select('status, disqualification_reason')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      setState({
        status: (data?.status as EligibilityStatus) || null,
        reason: data?.disqualification_reason || null,
        loaded: true,
      });
    };
    load();
  }, [user?.id]);

  if (!state.loaded) return null;

  // No row
  if (!state.status) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Complete your eligibility profile to start shortlisting properties.
            </p>
            <Link to="/eligibility?returnTo=/dashboard/profile">
              <Button size="sm" className="mt-3">Start Eligibility Check →</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'pending') {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <p className="text-sm font-medium text-blue-800">
            Your eligibility profile is under review.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'passed') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Eligibility profile complete.</p>
            <Link
              to="/eligibility"
              className="mt-1 inline-block text-xs text-green-700 underline underline-offset-2 hover:text-green-900"
            >
              Edit answers →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // disqualified
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            Reeve is built for long-term rentals by Indian citizens. Based on your details, we&apos;re unable to move forward. Update your preferences below if anything looks incorrect.
          </p>
          <Link to="/eligibility?returnTo=/dashboard/profile">
            <Button size="sm" variant="outline" className="mt-3">Update My Answers →</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
