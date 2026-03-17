import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Building2, ChevronRight, AlertCircle } from "lucide-react";
import { getStatusDisplay, getPropertyDisplayId, formatBhk, getFurnishingLabel } from "@/lib/propertyStatus";

interface Property {
  id: string;
  locality: string | null;
  building_name: string | null;
  bhk: string | null;
  furnishing: string | null;
  status: string | null;
  city: string | null;
  listed_rent: number | null;
  created_at: string | null;
}

interface PendingAction {
  propertyId: string;
  propertyLabel: string;
  action: string;
}

function derivePendingActions(properties: Property[]): PendingAction[] {
  const actions: PendingAction[] = [];
  for (const p of properties) {
    const label = p.building_name || "Property";
    if (p.status === "draft") {
      actions.push({ propertyId: p.id, propertyLabel: label, action: "Upload documents & request inspection" });
    }
  }
  return actions;
}

export default function MyProperties() {
  const navigate = useNavigate();
  const { session, loading } = useRequireAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !session?.user?.id) return;
    const userId = session.user.id;
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, locality, building_name, bhk, furnishing, status, city, listed_rent, created_at")
        .eq("owner_id", userId)
        .neq("status", "inactive")
        .order("created_at", { ascending: false });
      setProperties(data ?? []);
      setFetching(false);
    })();
  }, [loading, session]);

  if (loading || fetching) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const pendingActions = derivePendingActions(properties);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Properties</h1>
          <Button onClick={() => navigate("/my-properties/new")} className="min-h-[40px]">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Property
          </Button>
        </div>

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Pending Actions</p>
            </div>
            <ul className="space-y-1.5">
              {pendingActions.map((a) => (
                <li key={a.propertyId} className="text-sm text-amber-700">
                  <button
                    onClick={() => navigate(`/my-properties/${a.propertyId}`)}
                    className="underline font-medium hover:text-amber-900"
                  >
                    {a.propertyLabel}
                  </button>
                  {" — "}{a.action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Property List */}
        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Building2 className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">No properties yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first property to get started.
            </p>
            <Button
              className="mt-5 min-h-[44px]"
              onClick={() => navigate("/my-properties/new")}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Property
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((p) => {
              const status = getStatusDisplay(p.status);
              const displayId = getPropertyDisplayId(p.id);

              return (
                <Card
                  key={p.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/my-properties/${p.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-foreground truncate">
                            {p.building_name ?? "—"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {displayId} · {p.locality ?? p.city ?? "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatBhk(p.bhk)} · {getFurnishingLabel(p.furnishing)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 italic">
                          {status.nextAction}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
