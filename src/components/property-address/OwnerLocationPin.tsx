/**
 * OwnerLocationPin (Prompt 3 P2) — the trusted owner location experience on the FINAL engine.
 *
 * Flow: search → select Google result → draggable exact pin → "Use this pin" (use_pin, read-only)
 * → review factual location + Reeve Discovery Geography + building question → "Looks right"
 * (commit_pin → confirm_discovery) → confirmed. Also supports a manual/rural pin with no Google
 * building, and "Something is missing" to add a locality/village/town/road (server-validated).
 *
 * Trust boundaries (do NOT weaken): the browser only forwards a selected Google place_id + pin +
 * candidate selections + owner-added place_ids. Canonical geography, building eligibility, India
 * validation and root are decided by the Edge Function. Marker drag is LOCAL ONLY — no Google/DB
 * call, no building deletion. This component NEVER writes trusted location columns directly.
 *
 * Admin uses AdminLocationPanel (the canonical Phase-3 final flow).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map as GoogleMap, useMap, useMapsLibrary, useApiLoadingStatus, APILoadingStatus,
} from "@vis.gl/react-google-maps";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle2, Search, AlertTriangle, Loader2, LocateFixed, Plus } from "lucide-react";
import { isBuildingNameRequired } from "@/lib/location/isLocationReadyForSubmit";
import { DiscoveryGeographyPanel, type DiscoveryItem } from "@/components/property-address/DiscoveryGeographyPanel";
import {
  resolvePinPreview, commitPin, confirmDiscovery, type PinEngineResult,
} from "@/lib/location/confirmLocationClient";

export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

export interface LatLng { lat: number; lng: number }

export type BuildingSource = "google" | "owner" | "admin" | null;

export interface ConfirmedLocationSummary {
  place_id: string | null;
  formatted_address: string | null; city: string | null; locality: string | null;
  building_name: string | null; latitude: number | null; longitude: number | null;
  verified: boolean;
  building_source: BuildingSource;
}

interface Props {
  propertyId: string | null;
  ensureDraft: () => Promise<string | null>;
  token: string | null;
  propertyType: string | null;
  confirmed: ConfirmedLocationSummary | null;
  readOnly?: boolean;
  /** Persisted-location classification from ListProperty (source of truth; mirrors M1). */
  locationKind: "final" | "legacy" | "none";
  discoveryConfirmed: boolean;
  buildingSource: BuildingSource;
  /** True while the parent is still loading the readiness classification. */
  hydrating: boolean;
  onConfirmed: (s: ConfirmedLocationSummary) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type Phase =
  | "loading" | "confirmed" | "resume_confirm" | "idle"
  | "pin" | "previewing" | "review" | "committing" | "confirming" | "google_down";

// Saved/non-editing phases — the location section is NOT dirty in these.
const SAVED_PHASES: Phase[] = ["confirmed", "idle", "loading", "resume_confirm"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Suggestion = any;

/** Single marker inside <Map>. When draggable, drag/click update local coords only (no Google/DB
 *  call). When draggable=false (review), the marker is fixed — no dragend/click listeners at all. */
export function DraggablePin({ position, seedKey = 0, onMove, draggable = true }: {
  position: LatLng; seedKey?: number; onMove?: (p: LatLng) => void; draggable?: boolean;
}) {
  const map = useMap("owner-pin-map");
  const markerLib = useMapsLibrary("marker");
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!map || !markerLib?.AdvancedMarkerElement) return;
    const marker = new markerLib.AdvancedMarkerElement({ map, position, gmpDraggable: draggable });
    markerRef.current = marker;
    const listeners: Array<{ remove?: () => void }> = [];
    if (draggable) {
      const read = (): LatLng | null => {
        const p = marker.position as google.maps.LatLng | google.maps.LatLngLiteral | null;
        if (!p) return null;
        const lat = typeof (p as google.maps.LatLng).lat === "function" ? (p as google.maps.LatLng).lat() : (p as google.maps.LatLngLiteral).lat;
        const lng = typeof (p as google.maps.LatLng).lng === "function" ? (p as google.maps.LatLng).lng() : (p as google.maps.LatLngLiteral).lng;
        return { lat: Number(lat), lng: Number(lng) };
      };
      listeners.push(marker.addListener("dragend", () => { const p = read(); if (p) onMoveRef.current?.(p); }));
      listeners.push(map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) onMoveRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }));
    }
    return () => { listeners.forEach((l) => l.remove?.()); marker.map = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerLib, draggable]);

  // Keep the marker in sync when coords change (drag OR programmatic set).
  useEffect(() => { if (markerRef.current) markerRef.current.position = position; }, [position]);
  // Recenter ONLY on a new seed (search select / manual seed) — never during a drag.
  useEffect(() => {
    if (map && seedKey > 0) map.panTo(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);
  return null;
}

/** India-constrained Places Autocomplete; returns the SELECTED place_id only (never free text). */
export function useAutocomplete() {
  const placesLib = useMapsLibrary("places");
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [predictions, setPredictions] = useState<Suggestion[]>([]);

  const fetch = useCallback((input: string, opts?: { citiesOnly?: boolean; bias?: LatLng }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!placesLib || !input.trim()) { setPredictions([]); return; }
    debounceRef.current = setTimeout(async () => {
      if (!sessionRef.current) sessionRef.current = new placesLib.AutocompleteSessionToken();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { suggestions } = await (placesLib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input, includedRegionCodes: ["IN"], sessionToken: sessionRef.current ?? undefined,
          ...(opts?.citiesOnly ? { includedPrimaryTypes: ["(regions)"] } : {}),
          ...(opts?.bias ? { locationBias: { center: opts.bias, radius: 20000 } } : {}),
        });
        setPredictions(suggestions ?? []);
      } catch { setPredictions([]); }
    }, 300);
  }, [placesLib]);

  const resetSession = () => { sessionRef.current = null; setPredictions([]); };
  return { placesLib, predictions, setPredictions, fetch, resetSession };
}

export function OwnerLocationPin({
  propertyId, ensureDraft, token, propertyType, confirmed, readOnly,
  locationKind, discoveryConfirmed, buildingSource, hydrating, onConfirmed, onDirtyChange,
}: Props) {
  const apiStatus = useApiLoadingStatus();
  const mapsFailed = apiStatus === APILoadingStatus.FAILED || apiStatus === APILoadingStatus.AUTH_FAILURE;

  // Admin-set building identity is protected: an owner can never overwrite it (mirrors the DB rule).
  const adminLocked = buildingSource === "admin";

  const [phase, setPhase] = useState<Phase>((hydrating || confirmed) ? "loading" : "idle");
  const [query, setQuery] = useState("");
  const { placesLib, predictions, setPredictions, fetch: fetchPreds, resetSession } = useAutocomplete();

  const [pin, setPin] = useState<LatLng | null>(confirmed?.latitude != null ? { lat: confirmed.latitude, lng: confirmed.longitude as number } : null);
  const [seedKey, setSeedKey] = useState(0);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PinEngineResult | null>(null);
  const [previewPin, setPreviewPin] = useState<LatLng | null>(null); // pin the current preview was computed for

  // Building resolution (from preview.building.outcome)
  const [buildingName, setBuildingName] = useState("");
  const [buildingEditing, setBuildingEditing] = useState(false);   // owner chose to correct the name
  const [buildingConfirmed, setBuildingConfirmed] = useState(false); // owner answered "Yes, keep"

  // Discovery selections
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [extraPlaceIds, setExtraPlaceIds] = useState<string[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const buildingRequired = isBuildingNameRequired(propertyType);

  useEffect(() => { onDirtyChange?.(!SAVED_PHASES.includes(phase)); }, [phase, onDirtyChange]);

  // ── Reload/resume: initialize phase from the parent's readiness classification (source of truth).
  // Runs only while phase==='loading' so it never clobbers an in-progress local edit. FINAL vs
  // LEGACY: a legacy draft shows its saved summary and NEVER calls confirm_discovery; only a
  // final-committed-not-confirmed draft enters resume_confirm.
  useEffect(() => {
    if (hydrating) return;              // wait for the parent's classification
    if (phase !== "loading") return;    // don't override an active/edit/confirmed state
    if (!confirmed) { setPhase("idle"); return; }
    if (locationKind === "final" && !discoveryConfirmed) { setPhase("resume_confirm"); return; }
    setPhase("confirmed");
  }, [hydrating, locationKind, discoveryConfirmed, confirmed, phase]);

  const staleReset = useCallback(() => { setPreview(null); setPreviewPin(null); setErrorMsg(null); }, []);

  // ── Search select → seed pin (a selected result may be a building OR just a map anchor) ──
  const onSelectPlace = async (s: Suggestion) => {
    setPredictions([]);
    try {
      const place = s.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location", "id"] });
      const loc = place.location;
      if (!loc) { setErrorMsg("That location didn't match. Please search again."); return; }
      setSelectedPlaceId(place.id);       // server decides if it is building evidence (geographic-only won't be)
      setExtraPlaceIds([]); setDeselected(new Set());
      staleReset();
      setPin({ lat: loc.lat(), lng: loc.lng() });
      setSeedKey((k) => k + 1);
      setPhase("pin");
    } catch { setErrorMsg("That location didn't match. Please search again."); }
  };

  const startManual = async () => {
    await ensureDraft();
    setSelectedPlaceId(null); setExtraPlaceIds([]); setDeselected(new Set()); staleReset();
    if (!pin) { setPin(INDIA_CENTER); }
    setSeedKey((k) => k + 1);
    setPhase("pin");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setSelectedPlaceId(null); setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setSeedKey((k) => k + 1); staleReset(); },
      () => { /* denied/unavailable — manual map remains usable */ },
    );
  };

  const onPinMove = useCallback((p: LatLng) => { setPin(p); staleReset(); }, [staleReset]);

  // ── use_pin (read-only preview) ──
  const runPreview = useCallback(async (extras: string[] = extraPlaceIds) => {
    if (!token || !pin) return;
    const pid = propertyId ?? (await ensureDraft());
    if (!pid) { setErrorMsg("Couldn't save your draft. Please try again."); return; }
    setPhase("previewing"); setErrorMsg(null);
    const res = await resolvePinPreview(token, {
      propertyId: pid, lat: pin.lat, lng: pin.lng, placeId: selectedPlaceId, extraPlaceIds: extras,
    });
    if (!res.ok) {
      const code = res.error?.code;
      if (code === "outside_service_area") setErrorMsg("Reeve currently supports properties in India.");
      else if (code === "india_unresolved") setErrorMsg("We couldn't confirm this pin is in India. Move the pin onto your property and try again.");
      else if (code === "retryable_google" || code === "network") { setPhase("google_down"); return; }
      else setErrorMsg("We couldn't verify this pin right now. Your location hasn't been changed. Try again.");
      setPhase("pin");
      return;
    }
    setPreview(res); setPreviewPin(pin);
    // Seed building answer state. Admin-locked buildings keep the saved Admin name and are never
    // re-questioned (owner can't overwrite); otherwise seed from the preview outcome.
    if (adminLocked) {
      setBuildingName(confirmed?.building_name ?? "");
      setBuildingEditing(false);
      setBuildingConfirmed(true);
    } else {
      const outcome = res.building?.outcome;
      setBuildingName(res.building?.display_name ?? "");
      setBuildingEditing(false);
      setBuildingConfirmed(outcome === "SAME");
    }
    setPhase("review");
  }, [token, pin, propertyId, ensureDraft, selectedPlaceId, extraPlaceIds, adminLocked, confirmed]);

  // ── Something is missing: add a server-validated extra, re-run preview ──
  const addExtra = async (placeId: string) => {
    if (extraPlaceIds.includes(placeId) || extraPlaceIds.length >= 5) return;
    const next = [...extraPlaceIds, placeId];
    setExtraPlaceIds(next);
    await runPreview(next);
  };
  const removeExtraByKey = async (candidateKey: string) => {
    const pid = candidateKey.split(":google:")[1];
    if (!pid) return;
    const next = extraPlaceIds.filter((x) => x !== pid);
    setExtraPlaceIds(next);
    await runPreview(next);
  };

  // ── Looks right: commit_pin → confirm_discovery (sequential, never parallel) ──
  const buildingBlocking = useMemo(() => {
    if (adminLocked) return false; // owner cannot change an admin building → never blocks
    const outcome = preview?.building?.outcome;
    // CONFLICT + UNCERTAIN both require an explicit owner acknowledgement (confirm) or edit.
    if (outcome === "CONFLICT" || outcome === "UNCERTAIN") return !buildingConfirmed && !(buildingEditing && buildingName.trim());
    if (outcome === "NOT_APPLICABLE") return buildingRequired && !buildingName.trim();
    return false; // SAME
  }, [adminLocked, preview, buildingName, buildingConfirmed, buildingEditing, buildingRequired]);

  const commitAndConfirm = async () => {
    if (!token || !pin || !preview) return;
    if (buildingBlocking) return;
    const pid = propertyId ?? (await ensureDraft());
    if (!pid) { setErrorMsg("Couldn't save your draft. Please try again."); return; }

    // building_choice derivation. Admin-locked → keep (server also protects). CONFLICT → deliberate
    // set with the confirmed/edited name. Owner edit / required NA name → set.
    const outcome = preview.building?.outcome;
    let buildingChoice: "keep" | "clear" | "set" = "keep";
    if (adminLocked) buildingChoice = "keep";
    else if (outcome === "CONFLICT") buildingChoice = "set";
    else if (buildingEditing && buildingName.trim()) buildingChoice = "set";
    else if (outcome === "NOT_APPLICABLE" && buildingRequired && buildingName.trim()) buildingChoice = "set";

    // selected recommendations = SYSTEM candidate_keys only, minus owner deselections. The deterministic
    // system root is already a recommended system candidate (never in `deselected` — the panel excludes
    // it), and an owner-added root is promoted server-side via extra_place_ids + missing-root logic; its
    // owner candidate_key must NOT go here (it isn't in the server's persistable set → rejection).
    const selectedCandidateKeys = (preview.discovery?.associations ?? [])
      .filter((a) => a.source !== "owner" && a.candidate_key)
      .map((a) => a.candidate_key)
      .filter((k) => !deselected.has(k));

    setPhase("committing"); setErrorMsg(null);
    const commit = await commitPin(token, {
      propertyId: pid, lat: pin.lat, lng: pin.lng, placeId: selectedPlaceId,
      selectedCandidateKeys, buildingChoice, buildingName: buildingName.trim() || null, extraPlaceIds,
    });
    if (!commit.ok || commit.discovery?.missing_root) {
      const code = commit.error?.code;
      if (code === "outside_service_area") setErrorMsg("Reeve currently supports properties in India.");
      else if (code === "retryable_google" || code === "network") { setPhase("google_down"); return; }
      else if (commit.ok && commit.discovery?.missing_root) setErrorMsg("We still couldn't identify the town or city. Add the nearest one under “Something is missing”.");
      else setErrorMsg("We couldn't save this location right now. Please try again.");
      // Re-preview so the review reflects fresh server truth (candidate keys may be stale).
      setPreview(commit.ok ? commit : preview); setPhase("review");
      return;
    }

    // commit succeeded → confirm discovery. If confirm fails, the location IS saved; offer retry.
    setPhase("confirming");
    const conf = await confirmDiscovery(token, pid);
    const f = commit.factual ?? {};
    const summary: ConfirmedLocationSummary = {
      place_id: commit.building?.provider_place_id ?? null,
      formatted_address: commit.exact_location?.formatted_address ?? null,
      city: (f.city as string) ?? null, locality: (f.locality as string) ?? null,
      building_name: commit.building?.display_name ?? null,
      latitude: pin.lat, longitude: pin.lng, verified: true,
      building_source: (commit.building?.source as BuildingSource) ?? null,
    };
    if (!conf.ok) {
      setPreview(commit); setErrorMsg("Your location is saved, but we couldn't finish confirming it. Tap “Looks right” to retry.");
      setPhase("review");
      return;
    }
    onConfirmed(summary);
    setPhase("confirmed");
  };

  // Resume: commit already done, only confirmation missing → confirm_discovery only.
  const resumeConfirm = async () => {
    if (!token || !propertyId || !confirmed) return;
    setPhase("confirming"); setErrorMsg(null);
    const conf = await confirmDiscovery(token, propertyId);
    if (!conf.ok) { setErrorMsg("We couldn't finish confirming your saved location. Please try again."); setPhase("resume_confirm"); return; }
    onConfirmed({ ...confirmed, building_source: buildingSource });
    setPhase("confirmed");
  };

  const changeLocation = () => {
    setPhase("pin");
    if (confirmed?.latitude != null) { setPin({ lat: confirmed.latitude, lng: confirmed.longitude as number }); setSeedKey((k) => k + 1); }
    // Retain the existing trusted Google building Place ID so re-resolving the pin can still evaluate
    // SAME/UNCERTAIN/CONFLICT; stays null for manual/rural properties that never had building evidence.
    setSelectedPlaceId(confirmed?.place_id ?? null); setExtraPlaceIds([]); setDeselected(new Set()); staleReset();
  };

  // ── Discovery items for the panel (root excluded; owner-added flagged) ──
  const rootDisplay = (preview?.discovery?.root as { display_name?: string; kind?: string } | null) ?? null;
  const rootKey = (preview?.discovery?.root as { candidate_key?: string } | null)?.candidate_key ?? null;
  const discoveryItems: DiscoveryItem[] = useMemo(() => {
    const assoc = preview?.discovery?.associations ?? [];
    return assoc
      .filter((a) => a.candidate_key && a.candidate_key !== rootKey)
      .map((a) => ({ candidate_key: a.candidate_key, display_name: a.display_name, kind: a.kind, owner: a.source === "owner" }));
  }, [preview, rootKey]);

  const toggleSystem = (key: string) => setDeselected((prev) => {
    const n = new Set(prev);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  // ── Renders ──────────────────────────────────────────────────────────────
  if (readOnly) {
    return (
      <div className="text-sm">
        <p className="font-medium">{confirmed?.formatted_address ?? [confirmed?.building_name, confirmed?.locality, confirmed?.city].filter(Boolean).join(", ")}</p>
      </div>
    );
  }

  const summaryLine = (c: ConfirmedLocationSummary | null) =>
    c?.formatted_address ?? [c?.building_name, c?.locality, c?.city].filter(Boolean).join(", ");

  return (
    <div className="space-y-3">
      {mapsFailed && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Location search couldn't load. Please refresh and try again — your draft is safe.
        </div>
      )}

      {phase === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your saved location…</p>
      )}

      {/* Confirmed */}
      {phase === "confirmed" && confirmed && (
        <div className="rounded-lg border border-green-500/40 bg-green-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800"><CheckCircle2 className="h-4 w-4" /> Location confirmed</p>
          <p className="mt-1 text-sm text-foreground">{summaryLine(confirmed)}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={changeLocation}>Change location</Button>
        </div>
      )}

      {/* Committed but not owner-confirmed (resume) */}
      {phase === "resume_confirm" && confirmed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Almost done</p>
          <p className="mt-1 text-sm text-foreground">{summaryLine(confirmed)}</p>
          <p className="mt-1 text-xs text-amber-800">Your location is saved. Confirm it looks right to finish this section.</p>
          {errorMsg && <p className="mt-1 text-sm text-destructive">{errorMsg}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={resumeConfirm}>Looks right</Button>
            <Button type="button" variant="outline" size="sm" onClick={changeLocation}>Change location</Button>
          </div>
        </div>
      )}

      {/* Google-down */}
      {phase === "google_down" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-amber-800"><AlertTriangle className="h-4 w-4" /> Location search is temporarily unavailable</p>
          <p className="mt-1 text-amber-800">Your draft is safe. Try again in a moment.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => (pin ? runPreview() : setPhase("idle"))}>Retry</Button>
        </div>
      )}

      {/* Idle / search */}
      {phase === "idle" && (
        <div className="relative space-y-1">
          <Label htmlFor="loc-search">Where is your property?</Label>
          <p className="text-xs text-muted-foreground">Search for your property, building or address — then place the exact pin on the map.</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="loc-search" value={query} autoComplete="off" className="min-h-[44px] pl-9"
              placeholder="Search for your property, building or address"
              onChange={(e) => { setQuery(e.target.value); fetchPreds(e.target.value); }} />
          </div>
          {predictions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
              {predictions.map((s) => (
                <li key={s.placePrediction.placeId} onClick={() => onSelectPlace(s)} className="cursor-pointer px-3 py-2 text-sm hover:bg-muted">
                  <span className="font-medium">{s.placePrediction.mainText?.text}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{s.placePrediction.secondaryText?.text}</span>
                </li>
              ))}
            </ul>
          )}
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          <div className="pt-1">
            <Button type="button" variant="ghost" size="sm" className="px-0 text-muted-foreground" onClick={startManual}>
              <MapPin className="mr-1 h-4 w-4" /> Can't find it? Set the location on the map
            </Button>
          </div>
        </div>
      )}

      {/* Pin adjusting */}
      {(phase === "pin" || phase === "previewing") && pin && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Drag the pin to your property's exact location</p>
          <div className="overflow-hidden rounded-lg border">
            <div className="h-[280px] w-full">
              <GoogleMap
                id="owner-pin-map"
                mapId={MAP_ID}
                defaultCenter={pin}
                defaultZoom={selectedPlaceId ? 17 : 15}
                gestureHandling="greedy"
                disableDefaultUI={false}
                clickableIcons={false}
              >
                <DraggablePin position={pin} seedKey={seedKey} onMove={onPinMove} />
              </GoogleMap>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => runPreview()} disabled={phase === "previewing"} className="min-h-[44px]">
              {phase === "previewing" ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Checking…</> : "Use this pin"}
            </Button>
            {navigator.geolocation && (
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation}><LocateFixed className="mr-1 h-4 w-4" /> Use my current location</Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => { setPhase("idle"); resetSession(); }}>Search again</Button>
          </div>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
      )}

      {/* Review */}
      {phase === "review" && preview && previewPin && (
        <div className="space-y-4">
          {/* Exact location */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Exact location</p>
            <div className="overflow-hidden rounded-lg border">
              <div className="h-[220px] w-full">
                <GoogleMap id="owner-pin-map" mapId={MAP_ID} defaultCenter={previewPin} defaultZoom={17} gestureHandling="greedy" clickableIcons={false}>
                  <DraggablePin position={previewPin} draggable={false} />
                </GoogleMap>
              </div>
              <p className="flex items-start gap-1.5 p-3 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{preview.exact_location?.formatted_address ?? "Pinned location"}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setPhase("pin")}>Move the pin</Button>
          </div>

          {/* Address details */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Address details</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {([
                ["Building / property", preview.building?.display_name],
                ["Locality", preview.factual?.locality],
                ["City", preview.factual?.city],
                ["District", preview.factual?.district],
                ["State", preview.factual?.state],
                ["PIN code", preview.factual?.pincode],
              ] as Array<[string, string | null | undefined]>).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>

          {/* Building question (admin-set buildings are locked read-only — owner can't overwrite) */}
          {adminLocked ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Property / building name</p>
              <p className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />{buildingName || confirmed?.building_name}
              </p>
              <p className="text-xs text-muted-foreground">Set by Reeve — contact support to change. You can still adjust the pin.</p>
            </div>
          ) : (
            <BuildingQuestion
              outcome={preview.building?.outcome}
              name={buildingName} setName={(v) => { setBuildingName(v); setBuildingEditing(true); }}
              editing={buildingEditing} setEditing={setBuildingEditing}
              confirmedYes={buildingConfirmed} setConfirmedYes={setBuildingConfirmed}
              required={buildingRequired}
            />
          )}

          {/* Discovery */}
          <DiscoveryGeographyPanel
            rootName={rootDisplay?.display_name ?? null}
            items={discoveryItems}
            deselected={deselected}
            onToggleSystem={toggleSystem}
            onRemoveOwner={removeExtraByKey}
            missingRoot={!!preview.discovery?.missing_root}
            ambiguousRoot={!!preview.discovery?.ambiguous_root}
            rejected={preview.discovery?.rejected_extras}
            disabled={false}
          >
            {placesLib && previewPin && (
              <MissingPlaceSearch bias={previewPin} disabled={extraPlaceIds.length >= 5} onPick={addExtra} />
            )}
          </DiscoveryGeographyPanel>

          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={commitAndConfirm} disabled={buildingBlocking} className="min-h-[44px]">Looks right</Button>
            <Button type="button" variant="outline" onClick={() => setPhase("pin")} className="min-h-[44px]">Move the pin</Button>
          </div>
        </div>
      )}

      {(phase === "committing" || phase === "confirming") && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {phase === "committing" ? "Saving location…" : "Confirming…"}</p>
      )}
    </div>
  );
}

/** Building SAME/UNCERTAIN/CONFLICT/NOT_APPLICABLE question. */
export function BuildingQuestion({
  outcome, name, setName, editing, setEditing, confirmedYes, setConfirmedYes, required,
}: {
  outcome: "SAME" | "UNCERTAIN" | "CONFLICT" | "NOT_APPLICABLE" | undefined;
  name: string; setName: (v: string) => void;
  editing: boolean; setEditing: (b: boolean) => void;
  confirmedYes: boolean; setConfirmedYes: (b: boolean) => void;
  required: boolean;
}) {
  if (outcome === "SAME") {
    return name ? (
      <div className="space-y-1">
        <p className="text-sm font-medium">Property / building name</p>
        <p className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" />{name}</p>
      </div>
    ) : null;
  }

  // CONFLICT no longer auto-shows the input; the owner must explicitly confirm the shown name or edit.
  const showInput = editing || (outcome === "NOT_APPLICABLE" && required) || (outcome === "NOT_APPLICABLE" && name.length > 0);

  return (
    <div className="space-y-1.5">
      {outcome === "UNCERTAIN" && !editing && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Is this still {name || "your building"}?</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={confirmedYes ? "default" : "outline"} onClick={() => setConfirmedYes(true)}>Yes, keep it</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setConfirmedYes(false); setEditing(true); }}>No, change it</Button>
          </div>
        </div>
      )}
      {outcome === "CONFLICT" && !editing && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Confirm the property / building name</p>
          {name && <p className="flex items-center gap-1.5 text-sm">{name}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={confirmedYes ? "default" : "outline"} onClick={() => setConfirmedYes(true)} disabled={!name.trim()}>Confirm this name</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setConfirmedYes(false); setEditing(true); }}>Change it</Button>
          </div>
        </div>
      )}
      {outcome === "NOT_APPLICABLE" && (
        <p className="text-sm font-medium">Property / building name {required ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}</p>
      )}
      {showInput && (
        <>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Prestige Lakeside" className="min-h-[44px]" />
          {(outcome === "CONFLICT" || (outcome === "NOT_APPLICABLE" && required)) && !name.trim() && (
            <p className="text-sm text-destructive">Please enter the property / building name.</p>
          )}
        </>
      )}
      {outcome === "NOT_APPLICABLE" && !required && !showInput && (
        <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setEditing(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add a building / society name
        </Button>
      )}
    </div>
  );
}

/** "Something is missing" — India-constrained autocomplete; returns a selected place_id only. */
export function MissingPlaceSearch({ bias, disabled, onPick }: { bias: LatLng; disabled?: boolean; onPick: (placeId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { predictions, setPredictions, fetch } = useAutocomplete();

  if (disabled && !open) return <p className="text-xs text-muted-foreground">You've added the maximum number of extra places.</p>;

  return (
    <div className="relative">
      {!open ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" /> Something is missing
        </Button>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs">Search for a locality, village, town, city or road near your property.</Label>
          <Input autoFocus value={q} className="min-h-[44px]" placeholder="Search a nearby place"
            onChange={(e) => { setQ(e.target.value); fetch(e.target.value, { bias }); }} />
          {predictions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
              {predictions.map((s: Suggestion) => (
                <li key={s.placePrediction.placeId}
                  onClick={() => { onPick(s.placePrediction.placeId); setQ(""); setPredictions([]); setOpen(false); }}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-muted">
                  <span className="font-medium">{s.placePrediction.mainText?.text}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{s.placePrediction.secondaryText?.text}</span>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => { setOpen(false); setQ(""); setPredictions([]); }}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
