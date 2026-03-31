import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
};

interface InspectionProperty {
  id: string;
  building_name: string;
  locality: string | null;
  bhk: string;
  flat_number: string | null;
  floor_number: number | null;
  users: { full_name: string } | null;
}

interface Inspection {
  id: string;
  status: string;
  mode: string | null;
  scheduled_date: string | null;
  actual_date: string | null;
  property_id: string;
  properties: InspectionProperty | null;
}

interface PendingProperty {
  id: string;
  building_name: string;
  locality: string | null;
  bhk: string;
  flat_number: string | null;
  floor_number: number | null;
  users: { full_name: string } | null;
}

type TabFilter = "all" | "scheduled" | "in_progress" | "completed";

export default function InspectionsList() {
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const navigate = useNavigate();
  const { toast } = useToast();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [pendingProperties, setPendingProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inspRes, propRes] = await Promise.all([
        supabase
          .from("property_inspections" as any)
          .select(`
            id, status, mode, scheduled_date, actual_date, property_id,
            properties (
              id, building_name, locality, bhk, flat_number, floor_number,
              users!properties_owner_id_fkey ( full_name )
            )
          `)
          .order("scheduled_date", { ascending: true }),
        supabase
          .from("properties")
          .select(`
            id, building_name, locality, bhk, flat_number, floor_number,
            users!properties_owner_id_fkey ( full_name )
          `)
          .eq("status", "inspection_scheduled"),
      ]);

      const inspData = (inspRes.data ?? []) as unknown as Inspection[];
      const propData = (propRes.data ?? []) as unknown as PendingProperty[];

      setInspections(inspData);

      const inspPropertyIds = new Set(inspData.map((i) => i.property_id));
      setPendingProperties(propData.filter((p) => !inspPropertyIds.has(p.id)));
    } catch {
      toast({ title: "Error loading inspections", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    activeTab === "all"
      ? inspections
      : inspections.filter((i) => i.status === activeTab);

  const counts = {
    all: inspections.length,
    scheduled: inspections.filter((i) => i.status === "scheduled").length,
    in_progress: inspections.filter((i) => i.status === "in_progress").length,
    completed: inspections.filter((i) => i.status === "completed").length,
  };

  const handleStartInspection = async (propertyId: string) => {
    if (!user) return;
    setStartingId(propertyId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;

      const { error } = await (supabase as any)
        .from("property_inspections")
        .insert({ property_id: propertyId, inspector_user_id: userId, status: "scheduled" })
        .select()
        .maybeSingle();

      if (error) throw error;
      navigate(`/admin/inspections/${propertyId}`);
    } catch (err: any) {
      toast({ title: "Failed to start inspection", description: err.message, variant: "destructive" });
    } finally {
      setStartingId(null);
    }
  };

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "dd MMM yyyy") : "—";

  const shortId = (id: string) => id.slice(0, 8);

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const noData = inspections.length === 0 && pendingProperties.length === 0;

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold mb-4">Inspections</h1>

      {noData ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          No inspections yet.
        </div>
      ) : (
        <>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled ({counts.scheduled})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Main table */}
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No inspections with this status.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property ID</TableHead>
                    <TableHead>Building & Locality</TableHead>
                    <TableHead>BHK</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((insp) => {
                    const p = insp.properties;
                    const cfg = STATUS_CONFIG[insp.status] ?? STATUS_CONFIG.scheduled;
                    return (
                      <TableRow key={insp.id}>
                        <TableCell className="font-mono text-xs">
                          {p ? shortId(p.id) : shortId(insp.property_id)}
                        </TableCell>
                        <TableCell>
                          {p ? `${p.building_name} · ${p.locality ?? ""}` : "—"}
                        </TableCell>
                        <TableCell>{p?.bhk ?? "—"}</TableCell>
                        <TableCell>{p?.users?.full_name ?? "—"}</TableCell>
                        <TableCell>{formatDate(insp.scheduled_date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cfg.className}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/inspections/${p?.id ?? insp.property_id}`)}
                          >
                            Open Form
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pending section */}
          {pendingProperties.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-3">Awaiting Inspection Setup</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property ID</TableHead>
                      <TableHead>Building & Locality</TableHead>
                      <TableHead>BHK</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingProperties.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{shortId(p.id)}</TableCell>
                        <TableCell>{p.building_name} · {p.locality ?? ""}</TableCell>
                        <TableCell>{p.bhk}</TableCell>
                        <TableCell>{p.users?.full_name ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleStartInspection(p.id)}
                            disabled={startingId === p.id}
                          >
                            {startingId === p.id ? "Starting…" : "Start Inspection"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
