/**
 * AdminLocationPanel (Prompt 3) — trusted Admin location review + correction on the SAME final engine.
 *
 * Reads the persisted trusted state (property row + associations, admin-readable via RLS). Admin
 * corrections write ONLY through the trusted Edge (`commit_pin` for exact pin/building,
 * `admin_update_discovery` for Discovery geography, `finalize_discovery` to finalize). There is NO
 * location-specific status lock: admin location editing already goes through the trusted engine on
 * any status (PropertyEdit strips location keys; the DB location-lock permits only the trusted path).
 * Changing location naturally resets `discovery_finalized_at`; the panel then shows re-finalization.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Map as GoogleMap } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin, CheckCircle2, AlertTriangle, Loader2, Search, X, Plus, Lock, ShieldCheck,
} from "lucide-react";
import {
  MAP_ID, DraggablePin, useAutocomplete, type LatLng, type Suggestion,
} from "@/components/property-address/OwnerLocationPin";
import {
  resolvePinPreview, commitPin, adminUpdateDiscovery, finalizeDiscovery, updateBuildingName,
  type PinEngineResult,
} from "@/lib/location/confirmLocationClient";

interface AssocRow {
  geo_place_id: string;
  relationship: string | null;
  is_primary: boolean;
  source: string;
  evidence_type: string | null;
  distance_m: number | null;
  display_name: string;
  kind: string;
}
interface PropRow {
  status: string;
  building_name: string | null; building_name_source: string | null; place_id: string | null;
  address_mode: string | null; formatted_address: string | null;
  latitude: number | null; longitude: number | null;
  country: string | null; state: string | null; district: string | null; pincode: string | null;
  city: string | null; locality: string | null; route: string | null; street_address: string | null;
  location_confirmed_at: string | null; discovery_confirmed_at: string | null; discovery_finalized_at: string | null;
  streetview_available: boolean | null; streetview_pano_id: string | null;
}

const FINAL_KINDS = ["search_region", "settlement", "locality", "road"];
const ROOT_KINDS = new Set(["search_region", "settlement"]);
const KIND_LABEL: Record<string, string> = { search_region: "Search region", settlement: "Town / City", locality: "Locality", road: "Road" };
const SOURCE_LABEL: Record<string, string> = { system: "System", owner: "Owner added", admin: "Admin override" };
const EVIDENCE_LABEL: Record<string, string> = {
  provider_address: "Provider address", provider_descriptor: "Provider descriptor", provider_route: "Provider route",
  curated_search_region: "Curated search region", owner_added: "Owner added", admin_override: "Admin override",
};
const ADMIN_ERR: Record<string, string> = {
  forbidden: "You don't have permission to edit this location.",
  not_kept: "One of the kept places is no longer associated — reload and try again.",
  invalid_add: "That place can't be added (unsupported or missing data).",
  implausible_add: "That place is too far from the property pin.",
  invalid_search_region: "That search region isn't valid for this property.",
  locality_no_context: "A locality needs a town/city in the set. Add one first.",
  root_required: "Choose a primary town/city/search region for this property.",
  invalid_root: "The chosen primary isn't a valid town/city/search region in the set.",
  outside_service_area: "Reeve currently supports properties in India.",
  no_pin: "This property has no confirmed pin yet — set the exact location first.",
  location_not_confirmed: "Confirm the exact pin before finalizing.",
  discovery_incomplete: "The discovery set is incomplete — add at least one valid place and a primary.",
  save_failed: "Couldn't save. Please try again.",
};

export function AdminLocationPanel({ propertyId, token, onChanged }: { propertyId: string; token: string | null; onChanged?: () => void }) {
  const [prop, setProp] = useState<PropRow | null>(null);
  const [assocs, setAssocs] = useState<AssocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [mode, setMode] = useState<"view" | "edit_pin" | "edit_discovery">("view");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bnEditing, setBnEditing] = useState(false);
  const [bnValue, setBnValue] = useState("");
  const [bnBusy, setBnBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: p, error: pe } = await (supabase as any).from("properties")
      .select("status,building_name,building_name_source,place_id,address_mode,formatted_address,latitude,longitude,country,state,district,pincode,city,locality,route,street_address,location_confirmed_at,discovery_confirmed_at,discovery_finalized_at,streetview_available,streetview_pano_id")
      .eq("id", propertyId).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: a, error: ae } = await (supabase as any).from("property_geo_associations")
      .select("geo_place_id,relationship,is_primary,source,evidence_type,distance_m,geo_places(display_name,kind)")
      .eq("property_id", propertyId);
    if (pe || ae || !p) { setLoadError(true); setLoading(false); return; }
    setProp(p as PropRow);
    setAssocs(((a ?? []) as Array<Record<string, unknown>>).map((r) => ({
      geo_place_id: r.geo_place_id as string, relationship: (r.relationship as string) ?? null, is_primary: r.is_primary === true,
      source: (r.source as string) ?? "system", evidence_type: (r.evidence_type as string) ?? null,
      distance_m: r.distance_m != null ? Number(r.distance_m) : null,
      display_name: (r.geo_places as { display_name?: string } | null)?.display_name ?? "",
      kind: (r.geo_places as { kind?: string } | null)?.kind ?? "",
    })));
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { void load(); }, [load]);

  const finalAssocs = useMemo(() => assocs.filter((a) => a.relationship === null), [assocs]);
  const legacyAssocs = useMemo(() => assocs.filter((a) => a.relationship !== null), [assocs]);
  const isLegacy = legacyAssocs.length > 0 && finalAssocs.length === 0;
  const lifecycle = prop?.discovery_finalized_at ? "finalized" : prop?.discovery_confirmed_at ? "owner_confirmed" : "needs_finalization";

  const refresh = async () => { await load(); onChanged?.(); };

  if (loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading location…</p>;
  if (loadError || !prop) return <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">Couldn't load the location. Reload the page.</p>;

  const hasPin = prop.latitude != null && prop.longitude != null;

  return (
    <div className="space-y-4">
      {/* Lifecycle banner — legacy records get one coherent transitional state; only final-model
          properties show the finalization lifecycle. */}
      {isLegacy ? (
        <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">Legacy location record · Transitional publishing supported</p>
          <p className="text-xs">This property uses the legacy location model. Editing the location will convert it to the final model.</p>
        </div>
      ) : (
        <div className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm",
          lifecycle === "finalized" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800")}>
          {lifecycle === "finalized" ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {lifecycle === "finalized" ? "Discovery finalized" : lifecycle === "owner_confirmed" ? "Owner confirmed · needs Admin finalization" : "Needs Admin finalization"}
        </div>
      )}

      {/* ── Exact location + building ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Exact location & building</h3>
          {mode !== "edit_pin" && <Button type="button" size="sm" variant="outline" onClick={() => { setErr(null); setMode("edit_pin"); }}>Edit location</Button>}
        </div>
        {mode === "edit_pin" ? (
          <AdminPinEditor propertyId={propertyId} token={token} start={hasPin ? { lat: prop.latitude as number, lng: prop.longitude as number } : null}
            existingPlaceId={prop.place_id} existingBuilding={prop.building_name} onCancel={() => setMode("view")}
            onSaved={async () => { setMode("view"); await refresh(); }} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="overflow-hidden rounded-lg border">
                <div className="h-[180px] w-full">
                  {hasPin && <GoogleMap id="owner-pin-map" mapId={MAP_ID} defaultCenter={{ lat: prop.latitude as number, lng: prop.longitude as number }} defaultZoom={16} gestureHandling="greedy" clickableIcons={false}>
                    <DraggablePin position={{ lat: prop.latitude as number, lng: prop.longitude as number }} draggable={false} />
                  </GoogleMap>}
                </div>
                <p className="flex items-start gap-1.5 p-2 text-xs"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{prop.formatted_address ?? "—"}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {([["Building", prop.building_name], ["Building source", prop.building_name_source ? SOURCE_LABEL[prop.building_name_source] ?? prop.building_name_source : null],
                  ["Provider Place ID", prop.place_id], ["Address mode", prop.address_mode],
                  ["Locality", prop.locality], ["City", prop.city], ["District", prop.district], ["State", prop.state], ["PIN", prop.pincode],
                  ["Country", prop.country], ["Route", prop.route], ["Coordinates", hasPin ? `${prop.latitude}, ${prop.longitude}` : null],
                  ["Street View", prop.streetview_available == null ? "Unknown" : prop.streetview_available ? "Available" : "None"]] as Array<[string, string | null]>)
                  .filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>))}
              </dl>
            </div>
            {/* Building-name-only correction — trusted updateBuildingName; leaves pin, associations & Street View untouched. */}
            {bnEditing ? (
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label className="text-xs">Building / property name</Label>
                  <Input value={bnValue} onChange={(e) => setBnValue(e.target.value)} className="min-h-[40px] max-w-[280px]" placeholder="e.g. Prestige Lakeside" />
                </div>
                <Button type="button" size="sm" disabled={bnBusy} onClick={async () => {
                  if (!token) return;
                  const next = bnValue.trim();
                  const current = (prop.building_name ?? "").trim();
                  if (next === current) { setBnEditing(false); return; } // no-op → don't write / stamp admin
                  setBnBusy(true); setErr(null);
                  const r = await updateBuildingName(token, propertyId, next || null);
                  setBnBusy(false);
                  if (!r.ok) { setErr("Couldn't update the building name. Try again."); return; }
                  setBnEditing(false); await refresh();
                }}>{bnBusy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…</> : "Save name"}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setBnEditing(false)}>Cancel</Button>
              </div>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="px-0 text-muted-foreground" onClick={() => { setBnValue(prop.building_name ?? ""); setBnEditing(true); }}>Edit building name only</Button>
            )}
          </>
        )}
      </section>

      {/* ── Discovery geography ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Discovery geography</h3>
          {mode !== "edit_discovery" && !isLegacy && finalAssocs.length > 0 &&
            <Button type="button" size="sm" variant="outline" onClick={() => { setErr(null); setMode("edit_discovery"); }}>Edit discovery</Button>}
        </div>
        {mode === "edit_discovery" ? (
          <AdminDiscoveryEditor propertyId={propertyId} token={token} current={finalAssocs}
            onCancel={() => setMode("view")} onSaved={async () => { setMode("view"); await refresh(); }} />
        ) : (
          <ul className="space-y-1">
            {(isLegacy ? legacyAssocs : finalAssocs).map((a) => (
              <li key={a.geo_place_id + (a.relationship ?? "")} className="flex items-center gap-2 text-sm">
                {a.is_primary && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Primary</span>}
                <span className="font-medium">{a.display_name}</span>
                <span className="text-xs text-muted-foreground">{KIND_LABEL[a.kind] ?? a.kind} · {a.relationship ? "legacy" : SOURCE_LABEL[a.source] ?? a.source}{a.evidence_type && !a.relationship ? ` · ${EVIDENCE_LABEL[a.evidence_type] ?? a.evidence_type}` : ""}{a.distance_m != null ? ` · ${Math.round(a.distance_m)} m` : ""}</span>
              </li>
            ))}
            {assocs.length === 0 && <li className="text-sm text-muted-foreground">No discovery geography yet.</li>}
          </ul>
        )}
      </section>

      {/* ── Finalization ── */}
      {!isLegacy && finalAssocs.length > 0 && (
        <section className="flex flex-wrap items-center gap-2 border-t pt-3">
          {lifecycle === "finalized" ? (
            <p className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" /> Discovery finalized</p>
          ) : (
            <>
              <Button type="button" size="sm" disabled={busy} onClick={async () => {
                if (!token) return; setBusy(true); setErr(null);
                const r = await finalizeDiscovery(token, propertyId);
                setBusy(false);
                if (!r.ok) { setErr(ADMIN_ERR[r.error?.code ?? ""] ?? "Couldn't finalize. Please try again."); return; }
                await refresh();
              }}>{busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Finalizing…</> : "Finalize Discovery Geography"}</Button>
              <span className="text-xs text-muted-foreground">Required before this property can be published.</span>
            </>
          )}
        </section>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}

// ── Admin pin/building correction (compact, reuses the shared primitives + trusted engine) ──
function AdminPinEditor({ propertyId, token, start, existingPlaceId, existingBuilding, onCancel, onSaved }: {
  propertyId: string; token: string | null; start: LatLng | null; existingPlaceId: string | null; existingBuilding: string | null;
  onCancel: () => void; onSaved: () => void;
}) {
  const { predictions, setPredictions, fetch } = useAutocomplete();
  const [q, setQ] = useState("");
  const [pin, setPin] = useState<LatLng | null>(start);
  const [seedKey, setSeedKey] = useState(0);
  const [placeId, setPlaceId] = useState<string | null>(existingPlaceId); // seed existing so SAME/UNCERTAIN/CONFLICT is evaluable
  const [preview, setPreview] = useState<PinEngineResult | null>(null);
  const [buildingName, setBuildingName] = useState(existingBuilding ?? "");
  const [edited, setEdited] = useState(false);
  const [phase, setPhase] = useState<"pin" | "previewing" | "review" | "saving">("pin");
  const [err, setErr] = useState<string | null>(null);

  const onSelect = async (s: Suggestion) => {
    setPredictions([]);
    try {
      const place = s.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location", "id"] });
      const loc = place.location; if (!loc) return;
      setPlaceId(place.id); setPin({ lat: loc.lat(), lng: loc.lng() }); setSeedKey((k) => k + 1); setPreview(null); setPhase("pin");
    } catch { /* ignore */ }
  };

  const runPreview = async () => {
    if (!token || !pin) return;
    setPhase("previewing"); setErr(null);
    const r = await resolvePinPreview(token, { propertyId, lat: pin.lat, lng: pin.lng, placeId });
    if (!r.ok) {
      const c = r.error?.code;
      setErr(c === "outside_service_area" ? "Reeve currently supports properties in India." : c === "india_unresolved" ? "Move the pin onto the property (couldn't confirm India)." : "Couldn't verify this pin. Try again.");
      setPhase("pin"); return;
    }
    setPreview(r); setBuildingName(r.building?.display_name ?? existingBuilding ?? ""); setEdited(false); setPhase("review");
  };

  const save = async () => {
    if (!token || !pin) return;
    // Three-branch decision so a genuine geo/provider change re-resolves discovery, a building-name-only
    // correction preserves associations, and a no-op writes nothing (never flips building source to admin).
    const pinChanged = !start || pin.lat !== start.lat || pin.lng !== start.lng;
    const providerChanged = placeId !== existingPlaceId;
    // `edited` is true ONLY when the admin actually typed in the review input — runPreview() overwrites
    // buildingName with the server preview name and sets edited=false, so a server-normalized name never
    // counts as an admin edit (avoids stamping admin provenance on a no-op).
    const buildingChanged = edited && buildingName.trim() !== (existingBuilding ?? "").trim();
    setErr(null);
    if (!pinChanged && !providerChanged) {
      if (!buildingChanged) { onSaved(); return; } // nothing changed → no DB write
      setPhase("saving");
      const br = await updateBuildingName(token, propertyId, buildingName.trim() || null);
      if (!br.ok) { setErr("Couldn't update the building name. Try again."); setPhase("review"); return; }
      onSaved();
      return;
    }
    setPhase("saving");
    const outcome = preview?.building?.outcome;
    const buildingChoice = edited && buildingName.trim() ? "set" : (outcome === "CONFLICT" ? "set" : "keep");
    // True A→B: pin moved to a genuinely new location AND provider changed → clear stale owner provenance.
    const locationReplaced = pinChanged && providerChanged;
    const r = await commitPin(token, { propertyId, lat: pin.lat, lng: pin.lng, placeId, buildingChoice, buildingName: buildingName.trim() || null, ...(locationReplaced ? { locationReplaced: true } : {}) });
    if (!r.ok) { setErr(r.error?.code === "outside_service_area" ? "Reeve currently supports properties in India." : "Couldn't save the location. Try again."); setPhase("review"); return; }
    onSaved();
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="relative">
        <Label className="text-xs">Search a building/address (or drag the pin)</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} className="min-h-[40px] pl-8" placeholder="Search…" onChange={(e) => { setQ(e.target.value); fetch(e.target.value); }} />
        </div>
        {predictions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
            {predictions.map((s: Suggestion) => (
              <li key={s.placePrediction.placeId} onClick={() => onSelect(s)} className="cursor-pointer px-3 py-2 text-sm hover:bg-muted">
                <span className="font-medium">{s.placePrediction.mainText?.text}</span> <span className="text-xs text-muted-foreground">{s.placePrediction.secondaryText?.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pin && (
        <div className="h-[220px] w-full overflow-hidden rounded-md border">
          <GoogleMap id="owner-pin-map" mapId={MAP_ID} defaultCenter={pin} defaultZoom={placeId ? 17 : 15} gestureHandling="greedy" clickableIcons={false}>
            <DraggablePin position={pin} seedKey={seedKey} onMove={(p) => { setPin(p); setPreview(null); }} />
          </GoogleMap>
        </div>
      )}
      {phase === "review" && preview && (
        <div className="space-y-1.5">
          <p className="text-sm">{preview.exact_location?.formatted_address}</p>
          <div>
            <Label className="text-xs">Property / building name {preview.building?.source === "admin" ? "(admin-set)" : ""}</Label>
            <Input value={buildingName} className="min-h-[40px]" onChange={(e) => { setBuildingName(e.target.value); setEdited(true); }} placeholder="Building / society name" />
          </div>
        </div>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex flex-wrap gap-2">
        {(phase === "review" || phase === "saving") ? (
          <Button type="button" size="sm" onClick={save} disabled={phase === "saving"}>{phase === "saving" ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…</> : "Save location"}</Button>
        ) : (
          <Button type="button" size="sm" onClick={runPreview} disabled={!pin || phase === "previewing"}>{phase === "previewing" ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Checking…</> : "Use this pin"}</Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" /> Saving resets finalization — re-finalize afterwards.</p>
    </div>
  );
}

// ── Admin Discovery editor: keep/remove + add canonical/Google + choose primary → admin_update_discovery ──
function AdminDiscoveryEditor({ propertyId, token, current, onCancel, onSaved }: {
  propertyId: string; token: string | null; current: AssocRow[]; onCancel: () => void; onSaved: () => void;
}) {
  const [kept, setKept] = useState<Set<string>>(new Set(current.map((c) => c.geo_place_id)));
  const [addExisting, setAddExisting] = useState<Array<{ id: string; name: string; kind: string }>>([]);
  const [addGoogle, setAddGoogle] = useState<Array<{ placeId: string; label: string }>>([]);
  // root value: `uuid:<id>` or `google:<placeId>` or "" (preserve current)
  const [rootVal, setRootVal] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // canonical search
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; kind: string }>>([]);
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("geo_places")
        .select("id,display_name,kind").ilike("display_name", `%${q.trim()}%`).in("kind", FINAL_KINDS).limit(8);
      setResults(((data ?? []) as Array<Record<string, unknown>>).map((r) => ({ id: r.id as string, name: r.display_name as string, kind: r.kind as string })));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // google autocomplete
  const { predictions, setPredictions, fetch: gfetch } = useAutocomplete();
  const [gq, setGq] = useState("");

  const rootOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    for (const c of current) if (kept.has(c.geo_place_id) && ROOT_KINDS.has(c.kind)) opts.push({ value: `uuid:${c.geo_place_id}`, label: `${c.display_name} (${KIND_LABEL[c.kind]})` });
    for (const a of addExisting) if (ROOT_KINDS.has(a.kind)) opts.push({ value: `uuid:${a.id}`, label: `${a.name} (${KIND_LABEL[a.kind]}) · new` });
    for (const g of addGoogle) opts.push({ value: `google:${g.placeId}`, label: `${g.label} · new (verified on save)` });
    return opts;
  }, [current, kept, addExisting, addGoogle]);

  const save = async () => {
    if (!token) return;
    setBusy(true); setErr(null);
    const rootGeoPlaceId = rootVal.startsWith("uuid:") ? rootVal.slice(5) : null;
    const rootExtraPlaceId = rootVal.startsWith("google:") ? rootVal.slice(7) : null;
    const r = await adminUpdateDiscovery(token, {
      propertyId,
      keepGeoPlaceIds: [...kept],
      addGeoPlaceIds: addExisting.map((a) => a.id),
      extraPlaceIds: addGoogle.map((g) => g.placeId),
      rootGeoPlaceId,
      rootExtraPlaceId,
    });
    setBusy(false);
    if (!r.ok) { setErr(ADMIN_ERR[r.error?.code ?? ""] ?? "Couldn't save discovery changes. Try again."); return; }
    onSaved();
  };

  const totalAdds = addExisting.length + addGoogle.length;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {/* current + kept toggles */}
      <div className="space-y-1">
        <Label className="text-xs">Current places (uncheck to remove)</Label>
        <div className="flex flex-wrap gap-1.5">
          {current.map((c) => {
            const on = kept.has(c.geo_place_id);
            return (
              <button key={c.geo_place_id} type="button" onClick={() => setKept((p) => { const n = new Set(p); if (on) n.delete(c.geo_place_id); else n.add(c.geo_place_id); return n; })}
                className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", on ? "bg-muted/40" : "border-dashed text-muted-foreground line-through")}>
                {c.display_name} <span className="text-[10px] text-muted-foreground">{KIND_LABEL[c.kind]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* additions */}
      {(addExisting.length > 0 || addGoogle.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {addExisting.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {a.name} <span className="text-[10px]">{KIND_LABEL[a.kind]}</span>
              <button type="button" onClick={() => setAddExisting((p) => p.filter((x) => x.id !== a.id))}><X className="h-3 w-3" /></button>
            </span>
          ))}
          {addGoogle.map((g) => (
            <span key={g.placeId} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {g.label} <span className="text-[10px]">new</span>
              <button type="button" onClick={() => setAddGoogle((p) => p.filter((x) => x.placeId !== g.placeId))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* add existing canonical */}
      {totalAdds < 5 && (
        <div className="relative space-y-1">
          <Label className="text-xs">Add Discovery Geography (existing Reeve place)</Label>
          <Input value={q} className="min-h-[40px]" placeholder="Search town, locality, road…" onChange={(e) => setQ(e.target.value)} />
          {results.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
              {results.filter((r) => !kept.has(r.id) && !addExisting.some((a) => a.id === r.id)).map((r) => (
                <li key={r.id} onClick={() => { setAddExisting((p) => [...p, r]); setQ(""); setResults([]); }} className="cursor-pointer px-3 py-2 text-sm hover:bg-muted">
                  {r.name} <span className="text-xs text-muted-foreground">{KIND_LABEL[r.kind] ?? r.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* something is missing (google) */}
      {totalAdds < 5 && (
        <div className="relative space-y-1">
          <Label className="text-xs">Something is missing (search Google)</Label>
          <Input value={gq} className="min-h-[40px]" placeholder="Search a nearby place…" onChange={(e) => { setGq(e.target.value); gfetch(e.target.value); }} />
          {predictions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
              {predictions.map((s: Suggestion) => (
                <li key={s.placePrediction.placeId}
                  onClick={() => { setAddGoogle((p) => [...p, { placeId: s.placePrediction.placeId, label: s.placePrediction.mainText?.text ?? "Place" }]); setGq(""); setPredictions([]); }}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-muted">
                  {s.placePrediction.mainText?.text} <span className="text-xs text-muted-foreground">{s.placePrediction.secondaryText?.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* root selection */}
      <div className="space-y-1">
        <Label className="text-xs">Primary (root) — town/city or search region</Label>
        <select value={rootVal} onChange={(e) => setRootVal(e.target.value)} className="min-h-[40px] w-full rounded-md border bg-background px-2 text-sm">
          <option value="">Keep current primary</option>
          {rootOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={save} disabled={busy}>{busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…</> : "Save Discovery Changes"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        {totalAdds >= 5 && <span className="flex items-center text-[11px] text-muted-foreground"><Plus className="mr-0.5 h-3 w-3" /> Max 5 additions</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">Saving replaces the discovery set and resets finalization — re-finalize afterwards.</p>
    </div>
  );
}
