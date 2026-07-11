/**
 * ListingReviewDetail — admin per-listing / per-edit review page.
 *
 * URL: /admin/listing-reviews/(new|edit)/:id
 *   new  → :id is properties.id (status must be pending_review)
 *   edit → :id is property_edit_requests.id (status must be pending)
 *
 * Actions:
 *   Approve (new)      → direct UPDATE properties.status = 'listed' (trigger sets is_active + listed_at)
 *   Request Changes    → direct UPDATE properties.status = 'changes_requested' + manual activity log insert (D-118)
 *   Approve (edit)     → RPC approve_edit_request
 *   Reject   (edit)    → RPC reject_edit_request
 *
 * Race guard: RPCs verify pending status server-side and raise if superseded/cancelled. On any error the
 * detail refetches and shows a toast so the admin sees the fresh state.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import posthog from "posthog-js";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BHK_OPTIONS } from "@/config/property-form";
import { getUserDisplayName } from "@/lib/user";
import ProfileAvatar from "@/components/profile/ProfileAvatar";

const REJECTION_REASONS = [
  { value: "incomplete_details", label: "Incomplete details" },
  { value: "photos_insufficient", label: "Photos insufficient" },
  { value: "pricing_unclear", label: "Pricing unclear" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "policy_violation", label: "Policy violation" },
  { value: "other", label: "Other" },
] as const;

interface PropertyRow {
  id: string; owner_id: string; status: string;
  building_name: string | null; street_address: string | null;
  locality: string | null; city: string | null; state: string | null; pincode: string | null;
  bhk: string | null; property_type: string | null;
  square_footage: number | null; furnishing: string | null;
  listed_rent: number | null; security_deposit_amount: number | null;
  available_from: string | null;
  title: string | null; description: string | null;
  building_rules: string | null; building_notes: string | null; pet_policy: string | null;
}

interface EditRequestRow {
  id: string; property_id: string; owner_id: string; status: string;
  payload: {
    field_changes?: Record<string, unknown>;
    photo_changes?: { add?: Array<{ url: string; section?: string | null }>; delete?: string[]; update?: unknown[] };
  };
  created_at: string;
  rejection_reason?: string | null;
  rejection_reason_text?: string | null;
}

const bhkLabel = (v: string | null): string =>
  v ? BHK_OPTIONS.find((o) => o.value === v)?.label ?? v : "";

const formatValue = (v: unknown): string => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export default function ListingReviewDetail() {
  const { type, id } = useParams<{ type: "new" | "edit"; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  useRequireAuth({ requireAdmin: true });

  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [editRequest, setEditRequest] = useState<EditRequestRow | null>(null);
  const [ownerName, setOwnerName] = useState<string>("Owner");
  const [ownerPhoto, setOwnerPhoto] = useState<string | null>(null);
  const [priorRevisions, setPriorRevisions] = useState<EditRequestRow[]>([]);
  const [expandedRev, setExpandedRev] = useState<string | null>(null);
  const [images, setImages] = useState<Array<{ id: string; url: string; is_primary: boolean; section: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [reason, setReason] = useState<typeof REJECTION_REASONS[number]["value"]>("incomplete_details");
  const [reasonText, setReasonText] = useState("");

  const load = useCallback(async () => {
    if (!id || !type) return;
    setLoading(true);
    let propertyId: string | null = null;

    if (type === "edit") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: er } = await (supabase as any).from("property_edit_requests")
        .select("id, property_id, owner_id, status, payload, created_at, rejection_reason, rejection_reason_text")
        .eq("id", id).maybeSingle();
      if (!er) {
        toast({ title: "Edit request not found", variant: "destructive" });
        navigate("/admin/listing-reviews?tab=edit", { replace: true });
        return;
      }
      setEditRequest(er as EditRequestRow);
      propertyId = (er as EditRequestRow).property_id;
    } else {
      propertyId = id;
    }

    if (!propertyId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prop } = await (supabase as any).from("properties").select("*").eq("id", propertyId).maybeSingle();
    if (!prop) {
      toast({ title: "Property not found", variant: "destructive" });
      navigate("/admin/listing-reviews", { replace: true });
      return;
    }
    setProperty(prop as PropertyRow);

    // Owner info (public_profiles view)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ownerProfile } = await (supabase as any)
      .from("public_profiles")
      .select("user_id, display_name, profile_photo_url")
      .eq("user_id", (prop as PropertyRow).owner_id).maybeSingle();
    setOwnerName(getUserDisplayName(undefined, ownerProfile));
    setOwnerPhoto((ownerProfile as { profile_photo_url?: string | null } | null)?.profile_photo_url ?? null);

    // Photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: imgs } = await (supabase as any).from("property_images")
      .select("id, url, is_primary, section").eq("property_id", propertyId)
      .order("is_primary", { ascending: false });
    setImages((imgs ?? []) as Array<{ id: string; url: string; is_primary: boolean; section: string | null }>);

    // Prior revisions for edit type
    if (type === "edit") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: hist } = await (supabase as any).from("property_edit_requests")
        .select("id, property_id, owner_id, status, payload, created_at, rejection_reason, rejection_reason_text")
        .eq("property_id", propertyId)
        .in("status", ["superseded", "rejected", "withdrawn", "approved"])
        .order("created_at", { ascending: false });
      setPriorRevisions((hist ?? []) as EditRequestRow[]);
    }
    setLoading(false);

    posthog?.capture("commons_admin_review_detail_viewed", { type, id });
  }, [id, type, navigate, toast]);

  useEffect(() => { void load(); }, [load]);

  // ── Actions ──
  const approveNewListing = async () => {
    if (!property || busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("properties")
      .update({ status: "listed" }).eq("id", property.id);
    setBusy(false);
    if (error) {
      toast({ title: "Could not approve", description: error.message, variant: "destructive" });
      await load();
      return;
    }
    posthog?.capture("commons_admin_new_listing_approved", { property_id: property.id });
    toast({ title: "Listing approved" });
    navigate("/admin/listing-reviews?tab=new");
  };

  const requestChangesOnNewListing = async () => {
    if (!property || busy) return;
    setBusy(true);
    // Two-step per D-118: UPDATE status + INSERT activity log with reason.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e1 } = await (supabase as any).from("properties")
      .update({ status: "changes_requested" }).eq("id", property.id);
    if (e1) {
      setBusy(false);
      toast({ title: "Could not request changes", description: e1.message, variant: "destructive" });
      await load();
      return;
    }
    // Non-atomic follow-up log entry (D-118 accepts this trade-off).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("property_activity_log").insert({
      property_id: property.id,
      actor_role: "admin",
      action: "listing_rejected",
      payload: {
        summary: `Admin requested changes${reason === "other" ? "" : `: ${REJECTION_REASONS.find(r => r.value === reason)?.label}`}`,
        reason,
        reason_text: reasonText.trim() || null,
      },
      is_public: false,
    });
    setBusy(false);
    posthog?.capture("commons_admin_new_listing_changes_requested", { property_id: property.id, reason });
    toast({ title: "Changes requested" });
    setShowRequestChanges(false);
    navigate("/admin/listing-reviews?tab=new");
  };

  const approveEdit = async () => {
    if (!editRequest || busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("approve_edit_request", { p_edit_request_id: editRequest.id });
    setBusy(false);
    if (error) {
      const msg = /no longer pending/i.test(error.message)
        ? "This edit was superseded or cancelled by the owner. Refreshing…"
        : error.message;
      toast({ title: "Could not approve", description: msg, variant: "destructive" });
      await load();
      return;
    }
    const fieldCount = Object.keys(editRequest.payload.field_changes ?? {}).length;
    posthog?.capture("commons_admin_edit_approved", {
      edit_request_id: editRequest.id,
      property_id: editRequest.property_id,
      field_count: fieldCount,
    });
    toast({ title: "Edit approved" });
    navigate("/admin/listing-reviews?tab=edit");
  };

  const rejectEdit = async () => {
    if (!editRequest || busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("reject_edit_request", {
      p_edit_request_id: editRequest.id,
      p_reason: reason,
      p_reason_text: reasonText.trim() || null,
    });
    setBusy(false);
    if (error) {
      const msg = /no longer pending/i.test(error.message)
        ? "This edit was superseded or cancelled by the owner. Refreshing…"
        : error.message;
      toast({ title: "Could not reject", description: msg, variant: "destructive" });
      await load();
      return;
    }
    posthog?.capture("commons_admin_edit_rejected", {
      edit_request_id: editRequest.id,
      property_id: editRequest.property_id,
      reason,
    });
    toast({ title: "Edit rejected" });
    setShowReject(false);
    navigate("/admin/listing-reviews?tab=edit");
  };

  const isNewType = type === "new";

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }
  if (!property) return null;

  const fieldChanges = editRequest?.payload.field_changes ?? {};
  const changedKeys = Object.keys(fieldChanges);
  const photoAdd = editRequest?.payload.photo_changes?.add ?? [];
  const photoDelete = editRequest?.payload.photo_changes?.delete ?? [];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <button
          onClick={() => navigate(`/admin/listing-reviews?tab=${isNewType ? "new" : "edit"}`)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to queue
        </button>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">
            {isNewType ? "Review new listing" : "Review edit request"}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <ProfileAvatar photoUrl={ownerPhoto} displayName={ownerName} size="sm" />
            <div className="text-right">
              <p className="text-xs font-medium">{ownerName}</p>
              <p className="text-[10px] text-muted-foreground">
                Submitted {formatDistanceToNow(new Date(isNewType ? (property as PropertyRow & { created_at?: string }).created_at ?? "" : editRequest?.created_at ?? ""), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Property snapshot always shown */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Property</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <Field k="Building" v={property.building_name} />
            <Field k="Address" v={property.street_address} />
            <Field k="Locality" v={property.locality} />
            <Field k="City" v={property.city} />
            <Field k="Pincode" v={property.pincode} />
            <Field k="BHK" v={bhkLabel(property.bhk)} />
            <Field k="Type" v={property.property_type} />
            <Field k="Rent" v={property.listed_rent ? `₹${property.listed_rent.toLocaleString("en-IN")}` : null} />
            <Field k="Deposit" v={property.security_deposit_amount ? `₹${property.security_deposit_amount.toLocaleString("en-IN")}` : null} />
            <Field k="Available from" v={property.available_from ? format(new Date(property.available_from), "PPP") : null} />
            <Field k="Furnishing" v={property.furnishing} />
            <Field k="Area (sqft)" v={property.square_footage} />
          </div>
          {property.title && <div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm">{property.title}</p></div>}
          {property.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm whitespace-pre-line">{property.description}</p></div>}
          {property.pet_policy && <div><p className="text-xs text-muted-foreground">Pet policy</p><p className="text-sm">{property.pet_policy}</p></div>}
          {property.building_rules && <div><p className="text-xs text-muted-foreground">House rules</p><p className="text-sm whitespace-pre-line">{property.building_rules}</p></div>}
          {property.building_notes && <div><p className="text-xs text-muted-foreground">About the building</p><p className="text-sm whitespace-pre-line">{property.building_notes}</p></div>}
        </section>

        {/* Diff view for edit type */}
        {!isNewType && editRequest && (
          <section className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Proposed changes</h2>
            {changedKeys.length > 0 ? (
              <div className="space-y-2">
                {changedKeys.map((k) => (
                  <div key={k} className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-xs text-muted-foreground truncate">{k}</span>
                    <span className="text-xs text-muted-foreground line-through truncate" title="Current">
                      {formatValue((property as unknown as Record<string, unknown>)[k])}
                    </span>
                    <span className="text-sm font-medium text-blue-700 truncate" title="Proposed">
                      {formatValue(fieldChanges[k])}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No field changes</p>
            )}
            {(photoAdd.length > 0 || photoDelete.length > 0) && (
              <div className="pt-2 border-t space-y-2">
                {photoAdd.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Photos to add ({photoAdd.length})</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {photoAdd.map((p, i) => (
                        <img key={i} src={p.url} alt="" className="aspect-square object-cover rounded" />
                      ))}
                    </div>
                  </div>
                )}
                {photoDelete.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Photos to remove ({photoDelete.length})</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {images.filter((img) => photoDelete.includes(img.id)).map((img) => (
                        <div key={img.id} className="relative">
                          <img src={img.url} alt="" className="aspect-square object-cover rounded opacity-50" />
                          <span className="absolute inset-0 flex items-center justify-center text-xs bg-red-500/30 rounded text-white font-semibold">
                            REMOVE
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Photos gallery (current) */}
        {images.length > 0 && (
          <section className="rounded-lg border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold">Current photos ({images.length})</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {images.map((img) => (
                <img key={img.id} src={img.url} alt="" className="aspect-square object-cover rounded" />
              ))}
            </div>
          </section>
        )}

        {/* Revision history (edit type) */}
        {!isNewType && priorRevisions.length > 0 && (
          <section className="rounded-lg border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold">Previous versions ({priorRevisions.length})</h2>
            <ul className="divide-y">
              {priorRevisions.map((r) => {
                const isOpen = expandedRev === r.id;
                const fc = r.payload.field_changes ?? {};
                return (
                  <li key={r.id} className="py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedRev(isOpen ? null : r.id)}
                      className="w-full text-left flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{r.status}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(fc).length} field change{Object.keys(fc).length === 1 ? "" : "s"}
                          {r.rejection_reason ? ` · reason: ${r.rejection_reason}` : ""}
                        </p>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="mt-2 text-sm space-y-1 pl-2">
                        {Object.entries(fc).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-2 gap-2 text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="truncate">{formatValue(v)}</span>
                          </div>
                        ))}
                        {r.rejection_reason_text && (
                          <div className="mt-1 text-xs text-muted-foreground bg-muted rounded p-2 whitespace-pre-line">
                            {r.rejection_reason_text}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {isNewType ? (
            <>
              <Button onClick={approveNewListing} disabled={busy}>Approve</Button>
              <Button variant="outline" onClick={() => setShowRequestChanges(true)} disabled={busy}>
                Request changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={approveEdit} disabled={busy}>Approve edit</Button>
              <Button variant="outline" onClick={() => setShowReject(true)} disabled={busy} className="text-destructive">
                Reject edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Request Changes modal (new listing) */}
      <ReasonDialog
        open={showRequestChanges}
        onOpenChange={setShowRequestChanges}
        title="Request changes"
        description="Tell the owner what needs updating."
        confirmLabel="Send"
        onConfirm={requestChangesOnNewListing}
        reason={reason} setReason={setReason}
        reasonText={reasonText} setReasonText={setReasonText}
        busy={busy}
      />

      {/* Reject Edit modal */}
      <ReasonDialog
        open={showReject}
        onOpenChange={setShowReject}
        title="Reject edit"
        description="The owner will see this reason and the property returns to its previous live state."
        confirmLabel="Reject"
        confirmVariant="destructive"
        onConfirm={rejectEdit}
        reason={reason} setReason={setReason}
        reasonText={reasonText} setReasonText={setReasonText}
        busy={busy}
      />
    </AdminLayout>
  );
}

function Field({ k, v }: { k: string; v: unknown }) {
  const empty = v == null || v === "";
  if (empty) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="text-sm truncate">{String(v)}</p>
    </div>
  );
}

function ReasonDialog({
  open, onOpenChange, title, description, confirmLabel, confirmVariant = "default",
  onConfirm, reason, setReason, reasonText, setReasonText, busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => Promise<void>;
  reason: typeof REJECTION_REASONS[number]["value"];
  setReason: (v: typeof REJECTION_REASONS[number]["value"]) => void;
  reasonText: string;
  setReasonText: (v: string) => void;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger className="min-h-[40px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">
              Message to owner {reason === "other" ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={4}
              placeholder="Add specifics the owner should address…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={busy || (reason === "other" && !reasonText.trim())}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
