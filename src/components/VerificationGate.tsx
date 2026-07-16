import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface VerificationGateProps {
  returnTo: string;
  children: React.ReactNode;
}

// D-172: hard-blocks unverified users. Loading → null (no flash). Verified →
// children. Unverified → toast + navigate to /profile?returnTo=…&reason=…
// Matches redirect shape used by handleVerificationGate in PropertyDetail.tsx.
export default function VerificationGate({ returnTo, children }: VerificationGateProps) {
  const { user, isLoading, isFullyVerified } = useAuth();
  const navigate = useNavigate();
  const firedRef = useRef(false);

  useEffect(() => {
    if (isLoading || isFullyVerified || firedRef.current) return;
    firedRef.current = true;

    const phoneOk = !!user?.phone_verified;
    const emailOk = !!user?.email_verified;
    const reason = !phoneOk && !emailOk ? "both" : !phoneOk ? "phone" : "email";

    toast("Verification required — redirecting…", { duration: 1500 });
    navigate(
      `/profile?returnTo=${encodeURIComponent(returnTo)}&reason=${reason}`,
      { replace: true },
    );
  }, [isLoading, isFullyVerified, user, returnTo, navigate]);

  if (isLoading || !isFullyVerified) return null;
  return <>{children}</>;
}
