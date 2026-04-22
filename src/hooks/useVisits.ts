import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const visitKeys = {
  all: ["visits"] as const,
  adminRange: (start: string, end: string) =>
    ["visits", "admin", start, end] as const,
  tenant: (userId: string) => ["visits", "tenant", userId] as const,
  events: ["visit-events"] as const,
  eventsByTenant: (userId: string) =>
    ["visit-events", "tenant", userId] as const,
  logs: ["visit-events", "logs"] as const,
};

// ─── Admin calendar query ─────────────────────────────────────────────────────

export function useAdminVisitsQuery(weekStart: Date, weekEnd: Date) {
  const startISO = weekStart.toISOString();
  const endISO = weekEnd.toISOString();
  return useQuery({
    queryKey: visitKeys.adminRange(startISO, endISO),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select(
          `id, property_id, scheduled_at, status, tenant_id,
           property:properties!inner(building_name, locality, city),
           tenant:users!visits_tenant_id_fkey(full_name)`
        )
        .in("status", ["scheduled", "confirmed", "rescheduled"])
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

// ─── Tenant visits query ──────────────────────────────────────────────────────

export function useTenantVisitsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? visitKeys.tenant(userId) : visitKeys.all,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select(
          `id, property_id, scheduled_at, previous_scheduled_at, status,
           cancelled_at, no_show_at, completed_at, created_at,
           rescheduled_by, cancelled_by,
           property:properties!visits_property_id_fkey(
             building_name, locality, city, listed_rent, bhk
           )`
        )
        .eq("tenant_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

// ─── Tenant visit events query ────────────────────────────────────────────────

export function useTenantVisitEventsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? visitKeys.eventsByTenant(userId) : visitKeys.events,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_events")
        .select(
          `id, visit_id, event_type, initiated_by, scheduled_at,
           notes, note_type, created_at`
        )
        .eq("tenant_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

// ─── Admin visit logs query ───────────────────────────────────────────────────

export function useVisitLogsQuery() {
  return useQuery({
    queryKey: visitKeys.logs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_events")
        .select(
          `id, visit_id, event_type, initiated_by, scheduled_at, notes,
           note_type, created_at,
           tenant:users!visit_events_tenant_id_fkey(id, full_name, phone),
           property:properties!visit_events_property_id_fkey(
             building_name, locality, city
           )`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
}

// ─── Mutation: Schedule new visit (direct insert) ────────────────────────────

export function useScheduleVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tenantId,
      propertyId,
      scheduledAt,
    }: {
      tenantId: string;
      propertyId: string;
      scheduledAt: Date;
    }) => {
      const { error } = await supabase.from("visits").insert({
        tenant_id: tenantId,
        property_id: propertyId,
        scheduled_at: scheduledAt.toISOString(),
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      queryClient.invalidateQueries({ queryKey: visitKeys.events });
    },
  });
}

// ─── Mutation: Reschedule (via RPC) ──────────────────────────────────────────

export function useRescheduleVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      visitId,
      scheduledAt,
    }: {
      visitId: string;
      scheduledAt: Date;
    }) => {
      const { data, error } = await supabase.rpc("reschedule_visit", {
        p_visit_id: visitId,
        p_new_scheduled_at: scheduledAt.toISOString(),
        p_actor: "",
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      queryClient.invalidateQueries({ queryKey: visitKeys.events });
    },
  });
}

// ─── Mutation: Complete (via RPC) ─────────────────────────────────────────────

export function useCompleteVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      visitId,
      propertyFeedback,
      adminNote,
    }: {
      visitId: string;
      propertyFeedback?: string;
      adminNote?: string;
    }) => {
      const { error } = await supabase.rpc("complete_visit", {
        p_visit_id: visitId,
        p_property_feedback: propertyFeedback ?? null,
        p_admin_note: adminNote ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      queryClient.invalidateQueries({ queryKey: visitKeys.events });
    },
  });
}

// ─── Mutation: Cancel (direct update + event log) ────────────────────────────

export function useCancelVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      visitId,
      tenantId,
      propertyId,
      cancelledBy,
    }: {
      visitId: string;
      tenantId: string;
      propertyId: string;
      cancelledBy: "tenant" | "admin";
    }) => {
      const { error } = await supabase
        .from("visits")
        .update({
          status: "cancelled" as any,
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
        })
        .eq("id", visitId);
      if (error) throw error;

      await supabase.from("visit_events").insert({
        visit_id: visitId,
        tenant_id: tenantId,
        property_id: propertyId,
        event_type: "cancelled",
        initiated_by: cancelledBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      queryClient.invalidateQueries({ queryKey: visitKeys.events });
    },
  });
}

// ─── Mutation: No-Show (direct update + event log + no_show_count bump) ──────

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      visitId,
      tenantId,
      propertyId,
    }: {
      visitId: string;
      tenantId: string;
      propertyId: string;
    }) => {
      const { error: visitErr } = await supabase
        .from("visits")
        .update({
          status: "no_show" as any,
          no_show_at: new Date().toISOString(),
        })
        .eq("id", visitId);
      if (visitErr) throw visitErr;

      await supabase.from("visit_events").insert({
        visit_id: visitId,
        tenant_id: tenantId,
        property_id: propertyId,
        event_type: "no_show",
        initiated_by: "admin",
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, no_show_count")
        .eq("user_id", tenantId)
        .maybeSingle();

      if (profile) {
        const newCount = (profile.no_show_count ?? 0) + 1;
        await supabase
          .from("profiles")
          .update({ no_show_count: newCount })
          .eq("id", profile.id);
        return newCount;
      }
      return 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      queryClient.invalidateQueries({ queryKey: visitKeys.events });
    },
  });
}
