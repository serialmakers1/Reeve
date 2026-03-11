import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, ArrowLeft, Upload, X, FileText, CheckCircle2,
  MessageCircle, Phone, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { getStatusDisplay, getPropertyDisplayId, formatBhk, getFurnishingLabel } from "@/lib/propertyStatus";
import OwnerApplicationsTab from "@/components/owner/OwnerApplicationsTab";

/* ───── Document types for property ───── */
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

const WHATSAPP_NUMBER = "917899874281";

function buildWhatsAppUrl(buildingName: string, locality: string | null): string {
  const text = `Hi, I'd like to discuss my property at ${buildingName}${locality ? `, ${locality}` : ""}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export default function MyPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useRequireAuth();

  const [property, setProperty] = useState<any>(null);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Doc upload state
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docSubmitting, setDocSubmitting] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const userId = session?.user?.id ?? "";

  /* ───── Fetch property + docs ───── */
  const fetchData = async () => {
    if (!id || !userId) return;
    const [propRes, docsRes] = await Promise.all([
      supabase.from("properties").select("*").eq("id", id).eq("owner_id", userId).maybeSingle(),
      supabase
        .from("documents")
        .select("id, document_type, file_name, submitted_at")
        .eq("property_id", id)
        .in("document_type", ["sale_deed", "society_noc", "electricity_bill", "property_papers"]),
    ]);
    if (!propRes.data) {
      setNotFound(true);
    } else {
      setProperty(propRes.data);
    }
    if (docsRes.data) setDocs(docsRes.data as DocRecord[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (authLoading || !userId || !id) return;
    fetchData();
  }, [authLoading, userId, id]);

  /* ───── Doc upload handler ───── */
  const handleSubmitDoc = async (docType: string) => {
    const file = docFiles[docType];
    if (!file || !id || !userId) return;
    setDocSubmitting((prev) => ({ ...prev, [docType]: true }));
    try {
      const uploadPath = `${userId}/property/${id}/${docType}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("owner-documents").upload(uploadPath, file);
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("documents").insert({
        uploaded_by: userId,
        owner_user_id: userId,
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
      toast.success("Document submitted");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setDocSubmitting((prev) => ({ ...prev, [docType]: false }));
    }
  };

  /* ───── Loading / not found ───── */
  if (authLoading || loadingData) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (notFound || !property) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <p className="text-muted-foreground">Property not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/my-properties")}>← Back to My Properties</Button>
        </div>
      </Layout>
    );
  }

  const status = getStatusDisplay(property.status);
  const displayId = getPropertyDisplayId(property.id);
  const whatsappUrl = buildWhatsAppUrl(property.building_name, property.locality);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-4 min-h-[44px]" onClick={() => navigate("/my-properties")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          My Properties
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {property.building_name}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {displayId} · {property.locality ?? property.city}
              </p>
            </div>
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
          </div>
          {/* Next step banner */}
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Next step:</span> {status.nextAction}
            </p>
          </div>
          {/* Quick actions */}
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px]"
              onClick={() => window.open(whatsappUrl, "_blank")}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" style={{ color: "#25D366" }} />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
            <TabsTrigger value="applications" className="text-xs">Applications</TabsTrigger>
            <TabsTrigger value="inspection" className="text-xs">Inspection</TabsTrigger>
            <TabsTrigger value="support" className="text-xs">Support</TabsTrigger>
          </TabsList>

          {/* ─── Overview ─── */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground text-xs">BHK</Label>
                    <p className="font-medium text-foreground">{formatBhk(property.bhk)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Furnishing</Label>
                    <p className="font-medium text-foreground">{getFurnishingLabel(property.furnishing)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Locality</Label>
                    <p className="font-medium text-foreground">{property.locality || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">City</Label>
                    <p className="font-medium text-foreground">{property.city}</p>
                  </div>
                  {property.street_address && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground text-xs">Address</Label>
                      <p className="font-medium text-foreground">{property.street_address}</p>
                    </div>
                  )}
                  {property.floor_number != null && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Floor</Label>
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

                {property.status === "draft" && (
                  <div className="mt-4 rounded-md border border-muted bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">
                      📸 Photos and full listing details are added by the Reeve team after your property is inspected and approved.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Documents ─── */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Documents</CardTitle>
                <CardDescription>Upload documents for verification. PDF format only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {DOC_TYPES.map(({ type, label }) => {
                  const existingDoc = docs.find((d) => d.document_type === type);
                  const isSubmitted = existingDoc?.submitted_at != null;
                  const file = docFiles[type] || null;
                  const isSubmitting = docSubmitting[type] || false;

                  return (
                    <div key={type} className="space-y-2">
                      <Label className="text-sm">{label}</Label>
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
          </TabsContent>

          {/* ─── Applications ─── */}
          <TabsContent value="applications">
            {property.status === "listed" || property.status === "occupied" ? (
              <OwnerApplicationsTab userId={userId} />
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  Applications will appear here once your property is live.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete documents and inspection first.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ─── Inspection ─── */}
          <TabsContent value="inspection">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inspection</CardTitle>
                <CardDescription>
                  {property.status === "draft"
                    ? "Request an inspection to get your property listed."
                    : property.inspected_at
                      ? `Inspected on ${new Date(property.inspected_at).toLocaleDateString("en-IN")}`
                      : property.inspection_date
                        ? `Inspection scheduled for ${new Date(property.inspection_date).toLocaleDateString("en-IN")}`
                        : "Inspection status will be updated by the Reeve team."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {property.status === "draft" && (
                  <p className="text-sm text-muted-foreground">
                    Contact us to schedule an inspection for your property.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => window.open(whatsappUrl, "_blank")}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" style={{ color: "#25D366" }} />
                    Request via WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Support ─── */}
          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Need Help?</CardTitle>
                <CardDescription>
                  Our team is available to assist you with your property listing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full min-h-[44px]"
                  onClick={() => window.open(whatsappUrl, "_blank")}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" style={{ color: "#25D366" }} />
                  Chat on WhatsApp
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Available Mon–Sat, 9 AM – 7 PM IST
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
