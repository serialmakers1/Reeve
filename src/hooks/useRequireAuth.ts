import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/useSession";

export function useRequireAuth() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
    }
  }, [session, loading, navigate, location]);

  return { session, loading };
}
