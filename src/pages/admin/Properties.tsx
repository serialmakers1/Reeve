import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  inspection_proposed: "bg-yellow-100 text-yellow-700",
  inspection_scheduled: "bg-blue-100 text-blue-700",
  inspected: "bg-purple-100 text-purple-700",
  agreement_pending: "bg-orange-100 text-orange-700",
  listed: "bg-green-100 text-green-700",
  occupied: "bg-teal-100 text-teal-700",
  off_market: "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-400",
};

interface Property {
  id: string;
  building_name: string;
  locality: string | null;
  bhk: string;
  status: string;
  is_active: boolean;
  listed_rent: number | null;
  updated_at: string;
  owner: { full_name: string } | null;
}

interface AppCount {
  property_id: string;
  status: string;
}

interface FinalRent {
  property_id: string;
  proposed_rent: number | null;
  final_agreed_rent: number | null;
  owner_counter_rent: number | null;
}

const formatCurrency = (n: number | null | undefined) =>
  n != null && n > 0 ? `₹${n.toLocaleString("en-IN")}` : "—";

export default function AdminProperties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [countMap, setCountMap] = useState<Record<string, number>>({});
  const [rentMap, setRentMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: props } = await supabase
        .from("properties")
        .select(`
          id, building_name, locality, bhk, status, is_active,
          listed_rent, updated_at,
          owner:users!properties_owner_id_fkey(full_name)
        `)
        .order("updated_at", { ascending: false });

      const { data: appCounts } = await supabase
        .from("applications")
        .select("property_id, status")
        .not("status", "in", '("draft","withdrawn","expired")');

      const { data: finalRents } = await supabase
        .from("applications")
        .select("property_id, proposed_rent, final_agreed_rent, owner_counter_rent")
        .eq("status", "lease_active");

      const cMap = (appCounts as AppCount[] | null)?.reduce((acc, a) => {
        acc[a.property_id] = (acc[a.property_id] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>) ?? {};

      const rMap = (finalRents as FinalRent[] | null)?.reduce((acc, a) => {
        const rent = a.final_agreed_rent ?? a.owner_counter_rent ?? a.proposed_rent;
        if (rent != null) acc[a.property_id] = rent;
        return acc;
      }, {} as Record<string, number>) ?? {};

      setProperties((props as unknown as Property[]) ?? []);
      setCountMap(cMap);
      setRentMap(rMap);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-5xl">
          <Skeleton className="h-8 w-48" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Properties</h1>
          <Badge variant="secondary">{properties.length}</Badge>
        </div>

        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No properties found.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Property</span>
              <span>BHK</span>
              <span>Status</span>
              <span>Live</span>
              <span>Owner</span>
              <span>Rent</span>
              <span>Apps</span>
            </div>

            {/* Rows */}
            {properties.map((p) => {
              const rent = p.status === "occupied" ? rentMap[p.id] : (p.listed_rent ?? undefined);
              const appCount = countMap[p.id] ?? 0;

              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/properties/${p.id}`)}
                  className="w-full text-left border-t first:border-t-0 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{p.building_name}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {p.locality && <span>{p.locality}</span>}
                      <span>{p.bhk}</span>
                      <span>{p.owner?.full_name ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span>{formatCurrency(rent)}</span>
                      <span className="text-muted-foreground">{appCount} apps</span>
                      <span className="text-muted-foreground">{format(new Date(p.updated_at), "d MMM yyyy")}</span>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.building_name}</p>
                      {p.locality && <p className="text-xs text-muted-foreground">{p.locality}</p>}
                    </div>
                    <span className="text-sm text-foreground">{p.bhk}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                    <span>
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${p.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    </span>
                    <span className="text-sm text-foreground truncate">{p.owner?.full_name ?? "—"}</span>
                    <span className="text-sm text-foreground">{formatCurrency(rent)}</span>
                    <span className="text-sm text-foreground">{appCount > 0 ? appCount : "—"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
