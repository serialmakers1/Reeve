import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Building2 } from "lucide-react";

interface Property {
  id: string;
  locality: string | null;
  building_name: string | null;
  bhk: string | null;
  furnishing: string | null;
  status: string | null;
  listed_rent: number | null;
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
        .select("id, locality, building_name, bhk, furnishing, status, listed_rent")
        .eq("owner_id", userId)
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Properties</h1>
          <Button onClick={() => navigate("/my-properties/new")} className="min-h-[40px]">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Property
          </Button>
        </div>

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
          <div className="space-y-4">
            {properties.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{p.building_name ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">{p.locality ?? "—"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(p.bhk ?? "").replace("_plus", "+").replace(/(\d)(BHK)/, "$1 BHK")} &middot; {(p.furnishing ?? "").replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize">
                      {(p.status ?? "").replace(/_/g, " ")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
