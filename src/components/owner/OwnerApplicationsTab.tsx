import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-gray-400 text-gray-500 bg-gray-50" },
  submitted: { label: "Submitted", className: "border-blue-500 text-blue-600 bg-blue-50" },
  under_review: { label: "Under Review", className: "border-amber-500 text-amber-600 bg-amber-50" },
  sent_to_owner: { label: "Awaiting Your Decision", className: "border-purple-500 text-purple-600 bg-purple-50" },
  owner_accepted: { label: "Accepted", className: "border-green-500 text-green-600 bg-green-50" },
  owner_rejected: { label: "Rejected", className: "border-red-500 text-red-600 bg-red-50" },
  owner_countered: { label: "Counter Sent", className: "border-amber-500 text-amber-600 bg-amber-50" },
  tenant_countered: { label: "Tenant Countered", className: "border-purple-500 text-purple-600 bg-purple-50" },
  payment_pending: { label: "Payment Pending", className: "border-amber-500 text-amber-600 bg-amber-50" },
  payment_received: { label: "Payment Received", className: "border-green-500 text-green-600 bg-green-50" },
  active: { label: "Active", className: "border-green-500 text-green-600 bg-green-50" },
  withdrawn: { label: "Withdrawn", className: "border-gray-400 text-gray-500 bg-gray-50" },
};

function formatINR(amount: number | null) {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

interface OwnerApplicationsTabProps {
  userId: string;
}

interface PropertyInfo {
  id: string;
  building_name: string;
  locality: string | null;
  bhk: string;
}

export default function OwnerApplicationsTab({ userId }: OwnerApplicationsTabProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  const fetchData = async () => {
    const { data: ownerProps } = await supabase
      .from("properties")
      .select("id, building_name, locality, bhk")
      .eq("owner_id", userId);

    if (!ownerProps || ownerProps.length === 0) {
      setProperties([]);
      setApplications([]);
      setLoading(false);
      return;
    }

    setProperties(ownerProps as PropertyInfo[]);
    const propertyIds = ownerProps.map((p) => p.id);

    const { data: apps } = await supabase
      .from("applications")
      .select(`
        id, status, proposed_rent, owner_counter_rent, monthly_income, submitted_at,
        property_id,
        tenant:users!tenant_id(
          full_name
        )
      `)
      .in("property_id", propertyIds)
      .eq("platform_approved", true)
      .order("submitted_at", { ascending: false });

    if (apps) setApplications(apps);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Realtime subscription
  useEffect(() => {
    if (properties.length === 0) return;
    const propertyIds = properties.map((p) => p.id);

    const channel = supabase
      .channel("owner-applications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `property_id=in.(${propertyIds.join(",")})`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [properties]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No applications yet.
      </div>
    );
  }

  // Group by property
  const grouped: Record<string, any[]> = {};
  for (const app of applications) {
    if (!grouped[app.property_id]) grouped[app.property_id] = [];
    grouped[app.property_id].push(app);
  }

  return (
    <div className="space-y-6 pt-2">
      {properties
        .filter((p) => grouped[p.id])
        .map((prop) => (
          <div key={prop.id} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {prop.bhk} in {prop.building_name}
              {prop.locality ? `, ${prop.locality}` : ""}
            </h3>

            {grouped[prop.id].map((app: any) => {
              const statusInfo = STATUS_MAP[app.status] || {
                label: app.status,
                className: "",
              };
              const tenantName =
                (app.tenant as any)?.full_name || "Tenant";

              return (
                <Card
                  key={app.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/owner/applications/${app.id}`)}
                >
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">
                        {tenantName}
                      </p>
                      <Badge variant="outline" className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {app.monthly_income != null && (
                        <span>Income: {formatINR(app.monthly_income)}/mo</span>
                      )}
                      <span>Proposed: {formatINR(app.proposed_rent)}/mo</span>
                    </div>
                    {app.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(app.submitted_at).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
    </div>
  );
}
