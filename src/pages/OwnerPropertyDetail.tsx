import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2, Upload, X, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  inspection_proposed: { label: "Inspection Pending", className: "border-amber-500 text-amber-600 bg-amber-50" },
  inspection_scheduled: { label: "Inspection Scheduled", className: "border-blue-500 text-blue-600 bg-blue-50" },
  inspected: { label: "Inspected", className: "border-blue-500 text-blue-600 bg-blue-50" },
  listed: { label: "Listed", className: "border-green-500 text-green-600 bg-green-50" },
  occupied: { label: "Occupied", className: "border-green-500 text-green-600 bg-green-50" },
  off_market: { label: "Off Market", className: "border-gray-400 text-gray-500 bg-gray-50" },
};

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  fully_furnished: "Fully furnished",
};

const DOC_TYPES = [
  { type: "sale_deed", label: "Sale Deed" },
  { type: "society_noc", label: "Society NOC" },
  { type: "electricity_bill", label: "Electricity Bill" },
  { type: "property_papers", label: "Property Papers" },
] as const;

interface DocRecord {
  id: string;
  document_type: string;
  file_name: string;
  submitted_at: string | null;
}

export default function OwnerPropertyDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [property, setProperty] = useState<any>(null);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string>("");

  // Per-doc file and submitting state
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docSubmitting, setDocSubmitting] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      // Step 1: explicitly get the current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      setSessionUserId(session.user.id);

      // Step 2: fetch property and docs in parallel
      const [propRes, docsRes] = await Promise.all([
        supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("documents")
          .select("id, document_type, file_name, submitted_at")
          .eq("property_id", id)
          .in("document_type", ["sale_deed", "society_noc", "electricity_bill", "property_papers"]),
      ]);

      if (propRes.error) {
        console.error("Property fetch error:", propRes.error);
        setProperty(null);
      } else {
        setProperty(propRes.data);
      }

      if (docsRes.data) setDocs(docsRes.data as DocRecord[]);
      setLoading(false);
    };

    fetchData();
  }, [id, navigate]);

  const refetchData = async () => {
    if (!id) return;
    const [propRes, docsRes] = await Promise.all([
      supabase.from("properties").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("documents")
        .select("id, document_type, file_name, submitted_at")
        .eq("property_id", id)
        .in("document_type", ["sale_deed", "society_noc", "electricity_bill", "property_papers"]),
    ]);
    if (!propRes.error) setProperty(propRes.data);
    if (docsRes.data) setDocs(docsRes.data as DocRecord[]);
  };

  const handleSubmitDoc = async (docType: string) => {
    const file = docFiles[docType];
    if (!file || !id || !sessionUserId) return;

    setDocSubmitting((prev) => ({ ...prev, [docType]: true }));

    try {
      const uploadPath = `${sessionUserId}/property/${id}/${docType}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("owner-documents")
        .upload(uploadPath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        uploaded_by: sessionUserId,
        owner_user_id: sessionUserId,
        property_id: id,
        document_type: docType as any,
        category: "tenant_kyc" as any,
        file_name: file.name,
        file_url: uploadPath,
        file_size_bytes: file.size,
        mime_type: "application/pdf",
        is_verified: false,
        is_mandatory: false,
        submitted_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setDocFiles((prev) => ({ ...prev, [docType]: null }));
      await fetchData();
      toast({ title: "Document submitted" });
    } catch {
      toast({ title: "Upload failed. Please try again.", variant: "destructive" });
    } finally {
      setDocSubmitting((prev) => ({ ...prev, [docType]: false }));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <p className="text-muted-foreground">Property not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
            ← Go back
          </Button>
        </div>
      </Layout>
    );
  }

  const statusInfo = STATUS_MAP[property?.status] || { label: property?.status, className: "" };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 min-h-[44px]"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-6">
          {/* Property details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">
                  {property.bhk} in {property.building_name}
                </CardTitle>
                <Badge variant="outline" className={statusInfo.className}>
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Locality</Label>
                  <p className="font-medium text-foreground">{property.locality || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">City</Label>
                  <p className="font-medium text-foreground">{property.city}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">BHK</Label>
                  <p className="font-medium text-foreground">{property.bhk}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Furnishing</Label>
                  <p className="font-medium text-foreground">
                    {FURNISHING_LABELS[property.furnishing] || property.furnishing}
                  </p>
                </div>
                {property.street_address && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Street Address</Label>
                    <p className="font-medium text-foreground">{property.street_address}</p>
                  </div>
                )}
                {property.floor_number != null && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Floor Number</Label>
                    <p className="font-medium text-foreground">{property.floor_number}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Added On</Label>
                  <p className="font-medium text-foreground">
                    {new Date(property.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Documents (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DOC_TYPES.map(({ type, label }) => {
                const existingDoc = docs.find((d) => d.document_type === type);
                const isSubmitted = existingDoc?.submitted_at != null;
                const file = docFiles[type] || null;
                const isSubmitting = docSubmitting[type] || false;

                return (
                  <div key={type} className="space-y-2">
                    <Label className="text-sm">{label} (PDF only)</Label>

                    {isSubmitted ? (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{existingDoc?.file_name}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">Submitted</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {file ? (
                          <div className="flex items-center gap-2 rounded-md border border-border p-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setDocFiles((prev) => ({ ...prev, [type]: null }))}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full min-h-[44px]"
                            onClick={() => fileInputRefs.current[type]?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload {label}
                          </Button>
                        )}
                        <input
                          ref={(el) => { fileInputRefs.current[type] = el; }}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setDocFiles((prev) => ({ ...prev, [type]: f }));
                            e.target.value = "";
                          }}
                        />
                        {file && (
                          <Button
                            size="sm"
                            className="w-full min-h-[44px]"
                            disabled={isSubmitting}
                            onClick={() => handleSubmitDoc(type)}
                          >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit {label}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
