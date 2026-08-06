/**
 * DecisionDetailDialog — read-only audit detail for a single Decisions-tab row.
 *
 * Renders entirely from data already loaded into the `DecisionRow` (no fetch),
 * so there is no detail loading / not-found / error / stale-selection state to
 * manage. Contains NO mutation controls — this is a historical audit surface,
 * never a review action page. A separate "View current property" action
 * navigates to the admin property route (/admin/properties/:id) when a current
 * property still exists; the dialog never navigates to an owner-facing route.
 *
 * Historical accuracy: we show the exact SUBMITTED edit values ("Submitted
 * changes") only — the current property row is not loaded and no historical
 * "before" values are persisted, so we never present a before/after comparison.
 */

import type { RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusDisplay } from "@/lib/propertyStatus";
import { formatRejectionReason } from "@/lib/rejectionReasons";
import { DECISION_META, type DecisionRow } from "@/components/admin/DecisionsTab";

interface Props {
  decision: DecisionRow | null;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

// Edit-request keys with bespoke readable rendering; everything else is scalar/array/fallback.
const STRUCTURED_KEYS = new Set(["furnishing_detail", "amenities"]);
const FREE_TEXT_KEYS = new Set([
  "parking_notes", "pet_policy", "building_rules", "building_notes", "youtube_walkthrough_url", "description",
]);

const isPrimitive = (v: unknown): v is string | number | boolean =>
  v === null || ["string", "number", "boolean"].includes(typeof v);

const humanKey = (k: string) =>
  k === "building_notes" ? "About the Property" : k.replace(/_/g, " ");

/** Escaped, wrapping JSON fallback. React escapes the text child — safe for any value. */
function JsonFallback({ value }: { value: unknown }) {
  return (
    <pre className="text-[11px] bg-muted rounded p-2 whitespace-pre-wrap [overflow-wrap:anywhere]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** furnishing_detail: array of { item, custom?, count?, size?, rooms? }. Falls back on any other shape. */
function FurnishingValue({ value }: { value: unknown }) {
  if (!Array.isArray(value) || !value.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
    return <JsonFallback value={value} />;
  }
  if (value.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="space-y-0.5">
      {(value as Array<Record<string, unknown>>).map((f, i) => {
        const label = typeof f.item === "string" ? f.item : JSON.stringify(f.item);
        const count = typeof f.count === "number" && f.count > 1 ? ` × ${f.count}` : "";
        const size = typeof f.size === "string" && f.size ? ` (${f.size})` : "";
        const rooms = typeof f.rooms === "string" && f.rooms ? ` — ${f.rooms}` : "";
        return (
          <li key={i} className="text-sm [overflow-wrap:anywhere]">· {label}{count}{size}{rooms}</li>
        );
      })}
    </ul>
  );
}

/** amenities: { building?: string[]; furnishing_items?: string[] }. Falls back on any other shape. */
function AmenitiesValue({ value }: { value: unknown }) {
  const ok =
    value != null && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value as Record<string, unknown>).every(
      ([, v]) => v == null || (Array.isArray(v) && v.every((x) => typeof x === "string")),
    );
  if (!ok) return <JsonFallback value={value} />;
  const obj = value as { building?: string[]; furnishing_items?: string[] };
  const chips = [...(obj.building ?? []), ...(obj.furnishing_items ?? [])];
  if (chips.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((a, i) => (
        <span key={`${a}-${i}`} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground [overflow-wrap:anywhere]">
          {a}
        </span>
      ))}
    </div>
  );
}

/** Renders a single submitted field value by shape. Never silently omits. */
function SubmittedValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (STRUCTURED_KEYS.has(fieldKey)) {
    return fieldKey === "furnishing_detail"
      ? <FurnishingValue value={value} />
      : <AmenitiesValue value={value} />;
  }
  if (FREE_TEXT_KEYS.has(fieldKey)) {
    return <span className="[overflow-wrap:anywhere] break-words whitespace-pre-line">{value == null || value === "" ? "—" : String(value)}</span>;
  }
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (isPrimitive(value)) return <span className="[overflow-wrap:anywhere]">{value == null || value === "" ? "—" : String(value)}</span>;
  // Arrays: join ONLY when every element is primitive; otherwise escaped fallback.
  if (Array.isArray(value) && value.every(isPrimitive)) {
    return <span className="[overflow-wrap:anywhere]">{value.join(", ")}</span>;
  }
  return <JsonFallback value={value} />;
}

export default function DecisionDetailDialog({ decision, onClose, returnFocusRef }: Props) {
  const navigate = useNavigate();
  if (!decision) {
    // Keep the Dialog mounted-closed so onCloseAutoFocus can still fire cleanly.
    return <Dialog open={false} onOpenChange={(v) => !v && onClose()} />;
  }

  const { detail, property, kind } = decision;
  const meta = DECISION_META[kind];
  const currentStatus = property ? getStatusDisplay(property.status) : null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${meta.badgeClass}`}>{meta.label}</Badge>
            <span>Decision details</span>
          </DialogTitle>
          <DialogDescription>
            Read-only audit record — {detail.sourceType === "listing" ? "new-listing review" : "edit request"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Property summary */}
          <section className="space-y-1">
            <p className="font-medium [overflow-wrap:anywhere]">
              {property ? (
                <>
                  {property.building_name ?? "—"}
                  {property.city && <span className="text-muted-foreground font-normal">, {property.city}</span>}
                </>
              ) : (
                <span className="text-muted-foreground italic">Property unavailable or deleted</span>
              )}
            </p>
            {property && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 font-medium">
                  {property.listing_type === "sale" ? "For Sale" : "For Rent"}
                </span>
                {currentStatus && <span>Currently: {currentStatus.label}</span>}
              </div>
            )}
          </section>

          {/* Decision metadata */}
          <section className="space-y-1.5">
            <MetaRow k="Decided by" v={decision.actorName ?? "—"} />
            {detail.sourceType === "listing" ? (
              <>
                <MetaRow k="Decision at" v={format(new Date(detail.decisionAt), "PPpp")} />
                {(detail.fromStatus || detail.toStatus) && (
                  <MetaRow
                    k="Status change"
                    v={`${statusLabel(detail.fromStatus)} → ${statusLabel(detail.toStatus)}`}
                  />
                )}
                {formatRejectionReason(detail.reason) && <MetaRow k="Reason" v={formatRejectionReason(detail.reason)!} />}
                {detail.reasonText && <MetaRow k="Message" v={detail.reasonText} multiline />}
              </>
            ) : (
              <>
                <MetaRow k="Submitted at" v={format(new Date(detail.submittedAt), "PPpp")} />
                {detail.reviewedAt && <MetaRow k="Decision at" v={format(new Date(detail.reviewedAt), "PPpp")} />}
                {formatRejectionReason(detail.rejectionReason) && <MetaRow k="Reason" v={formatRejectionReason(detail.rejectionReason)!} />}
                {detail.rejectionReasonText && <MetaRow k="Message" v={detail.rejectionReasonText} multiline />}
              </>
            )}
          </section>

          {/* Edit contents */}
          {detail.sourceType === "edit" && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted changes</h3>
              {Object.keys(detail.fieldChanges).length === 0 ? (
                <p className="text-sm text-muted-foreground">No field changes.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(detail.fieldChanges).map(([k, v]) => (
                    <div key={k} className="rounded-md border bg-card p-2 space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground capitalize">{humanKey(k)}</p>
                      <div className="text-sm text-blue-700">
                        <SubmittedValue fieldKey={k} value={v} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(detail.photoAdd.length > 0 || detail.photoDelete.length > 0 || detail.photoUpdate.length > 0) && (
                <div className="space-y-3 pt-1 border-t">
                  {detail.photoAdd.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Photos requested for addition ({detail.photoAdd.length})</p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {detail.photoAdd.map((p, i) => (
                          <PhotoAddTile key={i} entry={p} />
                        ))}
                      </div>
                    </div>
                  )}
                  {detail.photoDelete.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Photos requested for removal ({detail.photoDelete.length})</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {detail.photoDelete.map((id, i) => (
                          <li key={i} className="[overflow-wrap:anywhere] font-mono">{typeof id === "string" ? id : JSON.stringify(id)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {detail.photoUpdate.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Photo updates ({detail.photoUpdate.length})</p>
                      <div className="space-y-1.5">
                        {detail.photoUpdate.map((u, i) => (
                          <PhotoUpdateRow key={i} entry={u} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {property && (
            <Button variant="outline" onClick={() => navigate(`/admin/properties/${property.id}`)}>
              View current property
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const statusLabel = (s: string | null) => (s ? getStatusDisplay(s).label : "—");

function MetaRow({ k, v, multiline }: { k: string; v: string; multiline?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className={`text-right text-foreground [overflow-wrap:anywhere] ${multiline ? "whitespace-pre-line" : ""}`}>{v}</span>
    </div>
  );
}

/** Added photo — thumbnail with a broken-image fallback tile. */
function PhotoAddTile({ entry }: { entry: unknown }) {
  const url = entry && typeof entry === "object" && typeof (entry as { url?: unknown }).url === "string"
    ? (entry as { url: string }).url
    : null;
  if (!url) return <JsonFallback value={entry} />;
  return (
    <div className="relative aspect-square rounded overflow-hidden bg-muted">
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const sib = el.nextElementSibling as HTMLElement | null;
          if (sib) sib.style.display = "flex";
        }}
      />
      <div className="absolute inset-0 hidden items-center justify-center text-[10px] text-muted-foreground text-center px-1">
        Image unavailable
      </div>
    </div>
  );
}

/** Photo update entry — image ID + submitted metadata changes (readable, fallback on malformed). */
function PhotoUpdateRow({ entry }: { entry: unknown }) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return <JsonFallback value={entry} />;
  }
  const obj = entry as Record<string, unknown>;
  const idRaw = obj.id ?? obj.image_id;
  const id = typeof idRaw === "string" ? idRaw : idRaw != null ? JSON.stringify(idRaw) : null;
  const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => k !== "id" && k !== "image_id"));
  return (
    <div className="rounded border bg-card p-2 text-xs space-y-1">
      {id && <p className="font-mono text-muted-foreground [overflow-wrap:anywhere]">{id}</p>}
      {Object.keys(rest).length > 0 ? (
        <ul className="space-y-0.5">
          {Object.entries(rest).map(([k, v]) => (
            <li key={k} className="[overflow-wrap:anywhere]">
              <span className="text-muted-foreground">{humanKey(k)}: </span>
              {isPrimitive(v) ? String(v) : JSON.stringify(v)}
            </li>
          ))}
        </ul>
      ) : (
        !id && <JsonFallback value={entry} />
      )}
    </div>
  );
}
