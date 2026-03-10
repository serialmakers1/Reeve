import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800" },
  platform_review: { label: "Under Review", color: "bg-amber-100 text-amber-800" },
  sent_to_owner: { label: "Sent to Owner", color: "bg-amber-100 text-amber-800" },
  owner_accepted: { label: "Accepted", color: "bg-green-100 text-green-800" },
  owner_rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  owner_countered: { label: "Counter Offer", color: "bg-purple-100 text-purple-800" },
  tenant_countered: { label: "Counter Sent", color: "bg-purple-100 text-purple-800" },
  payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-800" },
  payment_received: { label: "Payment Received", color: "bg-green-100 text-green-800" },
  kyc_pending: { label: "KYC Pending", color: "bg-amber-100 text-amber-800" },
  kyc_passed: { label: "KYC Passed", color: "bg-green-100 text-green-800" },
  kyc_failed: { label: "KYC Failed", color: "bg-red-100 text-red-800" },
  agreement_pending: { label: "Agreement Pending", color: "bg-amber-100 text-amber-800" },
  lease_active: { label: "Lease Active", color: "bg-green-100 text-green-800" },
  withdrawn: { label: "Withdrawn", color: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

function formatRent(val: number) {
  return "₹" + val.toLocaleString("en-IN");
}

interface ApplicationRow {
  id: string;
  status: string;
  proposed_rent: number;
  owner_counter_rent: number | null;
  submitted_at: string | null;
  created_at: string;
  property_id: string;
  properties: {
    building_name: string;
    locality: string | null;
    city: string;
    bhk: string;
    listed_rent: number;
  } | null;
}

export default function ApplicationsList() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from("applications")
        .select(
          `id, status, proposed_rent, owner_counter_rent, submitted_at, created_at, property_id,
           properties(building_name, locality, city, bhk, listed_rent)`
        )
        .eq("tenant_id", user.id)
        .order("submitted_at", { ascending: false });

      setApps((data as unknown as ApplicationRow[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("my-applications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `tenant_id=eq.${user.id}`,
        },
        (payload) => {
          setApps((prev) =>
            prev.map((a) =>
              a.id === payload.new.id ? { ...a, ...payload.new } : a
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>

        {apps.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No applications yet</p>
            <Button onClick={() => navigate("/search")}>Browse Properties</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => {
              const p = app.properties;
              const badge = STATUS_MAP[app.status] || {
                label: app.status,
                color: "bg-muted text-muted-foreground",
              };
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(`/dashboard/applications/${app.id}`)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md hover:shadow-primary/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        {p ? `${p.bhk} in ${p.building_name}` : "Property"}
                      </p>
                      {p && (
                        <p className="mt-0.5 text-sm text-muted-foreground truncate">
                          {[p.locality, p.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {app.submitted_at && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Applied: {format(new Date(app.submitted_at), "dd MMM yyyy")}
                        </p>
                      )}
                      {app.proposed_rent && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Your offer: {formatRent(app.proposed_rent)}/month
                        </p>
                      )}
                    </div>
                    <Badge className={`shrink-0 ${badge.color} border-0`}>
                      {badge.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
