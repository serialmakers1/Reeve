import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";

interface Property {
  id: string;
  building_name: string;
  locality: string | null;
  city: string;
  bhk: string;
  furnishing: string;
  status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  inspection_proposed: { label: "Inspection Pending", variant: "outline", className: "border-amber-500 text-amber-600 bg-amber-50" },
  inspection_scheduled: { label: "Inspection Scheduled", variant: "outline", className: "border-blue-500 text-blue-600 bg-blue-50" },
  inspected: { label: "Inspected", variant: "outline", className: "border-blue-500 text-blue-600 bg-blue-50" },
  listed: { label: "Listed", variant: "outline", className: "border-green-500 text-green-600 bg-green-50" },
  occupied: { label: "Occupied", variant: "outline", className: "border-green-500 text-green-600 bg-green-50" },
  off_market: { label: "Off Market", variant: "outline", className: "border-gray-400 text-gray-500 bg-gray-50" },
};

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  fully_furnished: "Fully furnished",
};

interface OwnerPropertiesTabProps {
  userId: string;
}

export default function OwnerPropertiesTab({ userId }: OwnerPropertiesTabProps) {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, building_name, locality, city, bhk, furnishing, status, created_at")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true });
      if (data) setProperties(data as Property[]);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Your Properties</h2>
        <Button
          size="sm"
          className="min-h-[44px]"
          onClick={() => navigate("/owner/properties/new")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No properties yet. Add your first property.
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => {
            const statusInfo = STATUS_MAP[p.status] || { label: p.status, variant: "outline" as const, className: "" };
            return (
              <Card
                key={p.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/owner/properties/${p.id}`)}
              >
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground text-sm">
                      {p.bhk} in {p.building_name}
                    </p>
                    <Badge variant={statusInfo.variant} className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.locality ? `${p.locality}, ` : ""}{p.city}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {FURNISHING_LABELS[p.furnishing] || p.furnishing}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
