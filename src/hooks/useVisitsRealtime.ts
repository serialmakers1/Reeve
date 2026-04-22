import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { visitKeys } from "@/hooks/useVisits";

export function useVisitsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("visits-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        () => {
          queryClient.invalidateQueries({ queryKey: visitKeys.all });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visit_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: visitKeys.events });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
