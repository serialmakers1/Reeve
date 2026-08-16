/**
 * OwnerLocationPin (Prompt 3 P3) — polished, production-quality owner location UX on the FINAL engine.
 *
 * Flow: search → select Google result → draggable exact pin → "Use this pin" (use_pin, read-only)
 * → review 3-section hierarchy (Exact location / Building / Nearby search places) → "Looks right"
 * (commit_pin → confirm_discovery) → confirmed. Supports manual/rural pin, "Search different location"
 * choice card, moved-pin building recheck, and "+ Add another nearby area or road".
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
import { MapPin, CheckCircle2, Search, AlertTriangle, Loader2, Plus } from "lucide-react";
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
  /** Set from commit.street_view?.available — for local form state update only; never sent to DB. */
  freshStreetViewAvailable?: boolean | null;
  /** Full factual payload from commit — for local FormState sync only; never sent to DB. */
  freshFactual?: PinEngineResult["factual"];
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
  /** form.streetview_available — kept current by handleLocationPersisted in ListProperty. */
  streetViewAvailable?: boolean | null;
  /** form.streetview_show_in_listing */
  streetViewShowInListing?: boolean;
  /** Calls updateField("streetview_show_in_listing", v) in ListProperty. */
  onStreetViewToggle?: (v: boolean) => void;
  /** Server-derived on load: exact location confirmed but no canonical root settlement. */
  needsDiscoveryRoot?: boolean;
  /** Called immediately after commit.ok === true (before confirmDiscovery). Parent refreshes local
   *  form state from trusted commit summary. Do NOT use to autosave to DB. */
  onPersisted?: (summary: ConfirmedLocationSummary, state: { needsDiscoveryRoot: boolean }) => void;
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
  streetViewAvailable, streetViewShowInListing, onStreetViewToggle, needsDiscoveryRoot, onPersisted,
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
  const [previewPin, setPreviewPin] = useState<LatLng | null>(null);

  // Building resolution (from preview.building.outcome)
  const [buildingName, setBuildingName] = useState("");
  const [buildingEditing, setBuildingEditing] = useState(false);
  const [buildingConfirmed, setBuildingConfirmed] = useState(false);

  // Discovery selections
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [extraPlaceIds, setExtraPlaceIds] = useState<string[]>([]);

  // Provenance tracking
  const [pinAdjustmentRef, setPinAdjustmentRef] = useState<{ lat: number; lng: number } | null>(null);
  const [wasLocationReplaced, setWasLocationReplaced] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const buildingRequired = isBuildingNameRequired(propertyType);

  // New state (Prompt 3)
  const [showLocationChoice, setShowLocationChoice] = useState(false);
  const [pinMovedThisEdit, setPinMovedThisEdit] = useState(false);
  const previewSeqRef = useRef(0);
  const [pendingCommitted, setPendingCommitted] = useState<{
    propertyId: string;
    summary: ConfirmedLocationSummary;
    needsDiscoveryRoot: boolean;
  } | null>(null);
  const [replacingLocation, setReplacingLocation] = useState(false);
  const [streetViewShowDraft, setStreetViewShowDraft] = useState(!!streetViewShowInListing);

  // savedSummary: prefer newly-persisted location over parent-provided confirmed.
  // Declared near top so all handlers and runPreview can close over it.
  const savedSummary = pendingCommitted?.summary ?? confirmed;

  // requiresBuildingRecheck: any move or replacement requires explicit acknowledgement.
  const requiresBuildingRecheck = pinMovedThisEdit || wasLocationReplaced;

  // Dirty state — replacingLocation distinguishes replacement-search idle from ordinary initial idle.
  const locationDirty = replacingLocation || !SAVED_PHASES.includes(phase);
  useEffect(() => { onDirtyChange?.(locationDirty); }, [locationDirty, onDirtyChange]);

  // Sync streetViewShowDraft when returning to a clean saved state (reload / parent update).
  useEffect(() => {
    if (phase === "confirmed" || phase === "resume_confirm") {
      setStreetViewShowDraft(!!streetViewShowInListing);
    }
  }, [phase, streetViewShowInListing]);

  // ── Reload/resume: initialize phase from the parent's readiness classification ──
  useEffect(() => {
    if (hydrating) return;
    if (phase !== "loading") return;
    if (!confirmed) { setPhase("idle"); return; }
    if (needsDiscoveryRoot) {
      // Exact location confirmed in DB but no root settlement — open in pin phase with recovery banner.
      setPin({ lat: confirmed.latitude!, lng: confirmed.longitude! });
      setSelectedPlaceId(confirmed.place_id ?? null);
      setPhase("pin");
      return;
    }
    if (locationKind === "final" && !discoveryConfirmed) { setPhase("resume_confirm"); return; }
    setPhase("confirmed");
  }, [hydrating, locationKind, discoveryConfirmed, confirmed, phase, needsDiscoveryRoot]);

  const staleReset = useCallback(() => {
    previewSeqRef.current += 1; // invalidate any in-flight preview
    setPreview(null); setPreviewPin(null); setErrorMsg(null);
  }, []);

  // ── Search select → seed pin ──
  const onSelectPlace = async (s: Suggestion) => {
    setPredictions([]);
    try {
      const place = s.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location", "id"] });
      const loc = place.location;
      if (!loc) { setErrorMsg("That location didn't match. Please search again."); return; }
      const newPlaceId: string = place.id;
      setSelectedPlaceId(newPlaceId);

      // Replacement detection using savedSummary (covers pendingCommitted + confirmed).
      const replacingExisting = savedSummary != null;
      const definiteSameSelection = savedSummary?.place_id != null && newPlaceId === savedSummary.place_id;
      const isReplacement = replacingExisting && !definiteSameSelection;
      setWasLocationReplaced(isReplacement);
      if (isReplacement) {
        setBuildingName(""); setBuildingEditing(false); setBuildingConfirmed(false);
      }
      setPinAdjustmentRef(null);
      setPinMovedThisEdit(false);

      setExtraPlaceIds([]); setDeselected(new Set());
      staleReset();
      setPin({ lat: loc.lat(), lng: loc.lng() });
      setSeedKey((k) => k + 1);
      setPhase("pin");
    } catch { setErrorMsg("That location didn't match. Please search again."); }
  };

  const startManual = async () => {
    await ensureDraft();

    const replacingExisting = savedSummary != null;
    setWasLocationReplaced(replacingExisting);
    if (replacingExisting) {
      setBuildingName(""); setBuildingEditing(false); setBuildingConfirmed(false);
    }
    setPinAdjustmentRef(null);
    setPinMovedThisEdit(false);

    setSelectedPlaceId(null); setExtraPlaceIds([]); setDeselected(new Set()); staleReset();
    if (!pin) { setPin(INDIA_CENTER); }
    setSeedKey((k) => k + 1);
    setPhase("pin");
  };

  const onPinMove = useCallback((p: LatLng) => {
    if (pin && !pinAdjustmentRef) setPinAdjustmentRef({ lat: pin.lat, lng: pin.lng });
    setPinMovedThisEdit(true);
    setPin(p);
    staleReset();
  }, [staleReset, pin, pinAdjustmentRef]);

  // ── runPreview — four fixes: discoveryOnly, request guard, rejected extras, building recheck ──
  const runPreview = useCallback(async (
    extras: string[] = extraPlaceIds,
    options?: { discoveryOnly?: boolean },
  ) => {
    if (!token || !pin) return;
    const pid = propertyId ?? (await ensureDraft());
    if (!pid) { setErrorMsg("Couldn't save your draft. Please try again."); return; }

    // Latest-request guard: capture seq before the await.
    previewSeqRef.current += 1;
    const seq = previewSeqRef.current;

    setPhase("previewing"); setErrorMsg(null);
    const res = await resolvePinPreview(token, {
      propertyId: pid, lat: pin.lat, lng: pin.lng, placeId: selectedPlaceId, extraPlaceIds: extras,
    });

    // Discard stale response if a newer preview was triggered.
    if (seq !== previewSeqRef.current) return;

    if (!res.ok) {
      const code = res.error?.code;
      if (code === "outside_service_area") setErrorMsg("Reeve currently supports properties in India.");
      else if (code === "india_unresolved") setErrorMsg("We couldn't confirm this pin is in India. Move the pin onto your property and try again.");
      else if (code === "retryable_google" || code === "network") { setPhase("google_down"); return; }
      else setErrorMsg("We couldn't verify this pin right now. Your location hasn't been changed. Try again.");
      setPhase("pin");
      return;
    }

    // Auto-remove rejected extras so they don't get re-sent on the next preview.
    if (res.discovery?.rejected_extras?.length) {
      const rejectedPids = new Set(res.discovery.rejected_extras.map((r: { place_id: string }) => r.place_id));
      setExtraPlaceIds((prev) => prev.filter((pid) => !rejectedPids.has(pid)));
    }

    setPreviewPin(pin);

    // discoveryOnly optimization: if only extras/discovery changed and the building result is unchanged,
    // preserve existing Building state (building name, confirmed, editing).
    const sameBuildingResult =
      preview?.building?.outcome === res.building?.outcome &&
      preview?.building?.display_name === res.building?.display_name &&
      preview?.building?.provider_place_id === res.building?.provider_place_id;

    if (!(options?.discoveryOnly && sameBuildingResult)) {
      // Seed building state — depends on admin lock + recheck requirement.
      if (adminLocked) {
        setBuildingName(savedSummary?.building_name ?? "");
        setBuildingEditing(false);
        setBuildingConfirmed(!pinMovedThisEdit);
      } else {
        const outcome = res.building?.outcome;
        let nextBuildingName = res.building?.display_name ?? "";
        if (!wasLocationReplaced && savedSummary?.building_name) {
          if (savedSummary.building_source === "owner") {
            nextBuildingName = savedSummary.building_name;
          } else if (!nextBuildingName) {
            nextBuildingName = savedSummary.building_name;
          }
        }
        setBuildingName(nextBuildingName);
        setBuildingEditing(false);
        setBuildingConfirmed(requiresBuildingRecheck ? false : outcome === "SAME");
      }
    }

    setPreview(res);
    setPhase("review");
  }, [token, pin, propertyId, ensureDraft, selectedPlaceId, extraPlaceIds, adminLocked,
      savedSummary, requiresBuildingRecheck, preview, pinMovedThisEdit, wasLocationReplaced]);

  // Pass discoveryOnly when the sole purpose is refreshing Discovery Geography.
  const addExtra = async (placeId: string) => {
    if (extraPlaceIds.includes(placeId) || extraPlaceIds.length >= 5) return;
    const next = [...extraPlaceIds, placeId];
    setExtraPlaceIds(next);
    await runPreview(next, { discoveryOnly: true });
  };
  const removeExtraByKey = async (candidateKey: string) => {
    const pid = candidateKey.split(":google:")[1];
    if (!pid) return;
    const next = extraPlaceIds.filter((x) => x !== pid);
    setExtraPlaceIds(next);
    await runPreview(next, { discoveryOnly: true });
  };

  // ── buildingBlocking — enforces moved-pin acknowledgement for all outcomes ──
  const buildingBlocking = useMemo(() => {
    const outcome = preview?.building?.outcome;

    if (adminLocked && outcome === "CONFLICT") return true;
    if (adminLocked && pinMovedThisEdit) return !buildingConfirmed;

    if ((!outcome || outcome === "NOT_APPLICABLE") && !requiresBuildingRecheck) {
      return buildingRequired && !buildingName.trim();
    }
    if ((!outcome || outcome === "NOT_APPLICABLE") && requiresBuildingRecheck) {
      return buildingName.trim()
        ? !buildingConfirmed && !(buildingEditing && buildingName.trim())
        : buildingRequired;
    }

    if (requiresBuildingRecheck && !buildingConfirmed && !(buildingEditing && buildingName.trim())) {
      return true;
    }

    if (outcome === "CONFLICT" || outcome === "UNCERTAIN") {
      return !buildingConfirmed && !(buildingEditing && buildingName.trim());
    }

    return false;
  }, [preview, buildingRequired, buildingName, adminLocked, requiresBuildingRecheck, buildingConfirmed, buildingEditing, pinMovedThisEdit]);

  // ── commitAndConfirm — full persistence flow with pendingCommitted and onPersisted ──
  const commitAndConfirm = async () => {
    if (!token || !pin || !preview) return;
    if (buildingBlocking) return;
    const pid = propertyId ?? (await ensureDraft());
    if (!pid) { setErrorMsg("Couldn't save your draft. Please try again."); return; }

    const outcome = preview.building?.outcome;
    let buildingChoice: "keep" | "clear" | "set" = "keep";
    if (adminLocked) buildingChoice = "keep";
    else if (outcome === "CONFLICT") buildingChoice = "set";
    else if (buildingEditing && buildingName.trim()) buildingChoice = "set";
    else if (outcome === "NOT_APPLICABLE" && buildingRequired && buildingName.trim()) buildingChoice = "set";

    const selectedCandidateKeys = (preview.discovery?.associations ?? [])
      .filter((a) => a.source !== "owner" && a.candidate_key)
      .map((a) => a.candidate_key)
      .filter((k) => !deselected.has(k));

    setPhase("committing"); setErrorMsg(null);
    const commit = await commitPin(token, {
      propertyId: pid, lat: pin.lat, lng: pin.lng, placeId: selectedPlaceId,
      selectedCandidateKeys, buildingChoice, buildingName: buildingName.trim() || null, extraPlaceIds,
      ...(pinAdjustmentRef ? { referenceLatLng: pinAdjustmentRef } : {}),
      ...(wasLocationReplaced ? { locationReplaced: true } : {}),
    });

    if (!commit.ok) {
      const code = commit.error?.code;
      if (code === "outside_service_area") setErrorMsg("Reeve currently supports properties in India.");
      else if (code === "retryable_google" || code === "network") { setPhase("google_down"); return; }
      else setErrorMsg("We couldn't save this location right now. Please try again.");
      setPhase("review");
      return;
    }

    // commit.ok === true — exact location IS now persisted in DB.
    const f = commit.factual ?? {};
    const summary: ConfirmedLocationSummary = {
      place_id: commit.building?.provider_place_id ?? null,
      formatted_address: commit.exact_location?.formatted_address ?? null,
      city: (f.city as string) ?? null, locality: (f.locality as string) ?? null,
      building_name: commit.building?.display_name ?? null,
      latitude: pin.lat, longitude: pin.lng, verified: true,
      building_source: (commit.building?.source as BuildingSource) ?? null,
      freshStreetViewAvailable: commit.street_view?.available ?? null,
      freshFactual: commit.factual,
    };
    const hasDiscoveryRoot = commit.discovery?.missing_root !== true;
    const commitNeedsRoot = commit.discovery?.missing_root === true;

    // Lock in the new location immediately before any further async step.
    setPendingCommitted({ propertyId: pid, summary, needsDiscoveryRoot: commitNeedsRoot });

    // Notify parent to refresh local form state (Edge already persisted).
    onPersisted?.(summary, { needsDiscoveryRoot: commitNeedsRoot });

    // Clear all edit/dirty signals — savedSummary now represents the persisted location.
    setPinAdjustmentRef(null);
    setWasLocationReplaced(false);
    setPinMovedThisEdit(false);
    setReplacingLocation(false);
    setShowLocationChoice(false);

    // Flush Street View preference if owner changed it during review.
    if (streetViewShowDraft !== !!streetViewShowInListing) {
      onStreetViewToggle?.(streetViewShowDraft);
    }

    if (!hasDiscoveryRoot) {
      // Exact location saved; root is still missing — stay in review so owner can add the missing geography.
      setPreview(commit);
      setErrorMsg(
        "Your exact location is saved, but we couldn't identify the town or city. " +
        "Add the nearest one using \"+ Add another nearby area or road\" below.",
      );
      setPhase("review");
      return;
    }

    // Root ready — stamp discovery confirmation.
    setPhase("confirming");
    const conf = await confirmDiscovery(token, pid);
    if (!conf.ok) {
      setPreview(commit);
      setErrorMsg("Your location is saved, but we couldn't finish confirming it. Try again.");
      setPhase("resume_confirm");
      return;
    }

    setPendingCommitted(null);
    onConfirmed(summary);
    setPhase("confirmed");
  };

  // Resume: commit succeeded, only confirmDiscovery missing.
  const resumeConfirm = async () => {
    const pid = pendingCommitted?.propertyId ?? propertyId;
    if (!token || !pid || !savedSummary) return;

    // If root is still missing, send back to pin phase to add the missing geography first.
    if (pendingCommitted?.needsDiscoveryRoot || needsDiscoveryRoot) {
      setPhase("pin");
      return;
    }

    setPhase("confirming"); setErrorMsg(null);
    const conf = await confirmDiscovery(token, pid);
    if (!conf.ok) {
      setErrorMsg("We couldn't finish confirming your saved location. Please try again.");
      setPhase("resume_confirm");
      return;
    }
    setPendingCommitted(null);
    setPinAdjustmentRef(null); setWasLocationReplaced(false);
    setPinMovedThisEdit(false); setReplacingLocation(false); setShowLocationChoice(false);
    onConfirmed(savedSummary);
    setPhase("confirmed");
  };

  // ── Location-change choice handlers ──

  /** Shows the choice card (Move pin / Search different location). */
  function handleChangeLocation() {
    setShowLocationChoice(true);
  }

  /** Enter move-pin flow — uses savedSummary coordinates, NOT stale confirmed. */
  function startMovePin() {
    setShowLocationChoice(false);
    setReplacingLocation(false);
    staleReset();
    if (savedSummary?.latitude != null && savedSummary?.longitude != null) {
      setPin({ lat: savedSummary.latitude, lng: savedSummary.longitude! });
      setSeedKey((k) => k + 1);
    }
    setSelectedPlaceId(savedSummary?.place_id ?? null);
    setExtraPlaceIds([]); setDeselected(new Set());
    setWasLocationReplaced(false);
    setPinAdjustmentRef(null);
    setPinMovedThisEdit(false);
    setPhase("pin");
  }

  /** Enter search-different-location replacement flow. */
  function startSearchNewLocation() {
    setShowLocationChoice(false);
    staleReset();
    resetSession();
    setReplacingLocation(true);
    setPinMovedThisEdit(false);
    setSelectedPlaceId(null); setQuery(""); setPin(null); setExtraPlaceIds([]); setDeselected(new Set());
    setBuildingName(""); setBuildingEditing(false); setBuildingConfirmed(false);
    setWasLocationReplaced(false);
    setStreetViewShowDraft(!!streetViewShowInListing);
    setPhase("idle");
  }

  /** Cancel the replacement flow and return to the saved location. */
  function cancelReplacement() {
    staleReset();
    resetSession();
    setReplacingLocation(false);
    setWasLocationReplaced(false);
    setPinAdjustmentRef(null);
    setStreetViewShowDraft(!!streetViewShowInListing);
    if (savedSummary?.latitude != null) {
      setPin({ lat: savedSummary.latitude, lng: savedSummary.longitude! });
    }
    setSelectedPlaceId(savedSummary?.place_id ?? null);
    // Determine correct recovery phase.
    const savedLocationPhase: Phase =
      pendingCommitted?.needsDiscoveryRoot || needsDiscoveryRoot
        ? "pin"
        : pendingCommitted || (locationKind === "final" && !discoveryConfirmed)
        ? "resume_confirm"
        : "confirmed";
    setPhase(savedLocationPhase);
  }

  /** Handle "Search again" in the pin phase — context-aware to prevent admin-lock bypass. */
  function handlePinScreenSearchAgain() {
    if (!savedSummary) {
      setPhase("idle"); resetSession();
      setStreetViewShowDraft(!!streetViewShowInListing);
      return;
    }
    if (adminLocked) return; // hidden/disabled in JSX; this is a belt-and-suspenders guard
    startSearchNewLocation();
  }

  // ── Discovery items for the panel ──
  const rootDisplay = (preview?.discovery?.root as { display_name?: string; kind?: string } | null) ?? null;
  const rootKey = (preview?.discovery?.root as { candidate_key?: string } | null)?.candidate_key ?? null;
  const discoveryItems: DiscoveryItem[] = useMemo(() => {
    const assoc = preview?.discovery?.associations ?? [];
    return assoc
      .filter((a) => a.candidate_key && a.candidate_key !== rootKey)
      .map((a) => ({ candidate_key: a.candidate_key, display_name: a.display_name, kind: a.kind, owner: a.source === "owner" }));
  }, [preview, rootKey]);

  const toggleSystem = (key: string) => setDeselected((prev) => {
    const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n;
  });

  // ── Renders ──────────────────────────────────────────────────────────────
  if (readOnly) {
    return (
      <div className="text-sm">
        <p className="font-medium">{confirmed?.formatted_address ?? [confirmed?.building_name, confirmed?.locality, confirmed?.city].filter(Boolean).join(", ")}</p>
      </div>
    );
  }

  // "What changed" callout helpers
  const locationChangedThisEdit = pinMovedThisEdit || wasLocationReplaced;
  const changeLabel = pinMovedThisEdit ? "Pin position updated" : "Location changed";
  const buildingNeedsReview = adminLocked
    ? pinMovedThisEdit
    : requiresBuildingRecheck &&
      (preview?.building?.outcome !== "NOT_APPLICABLE" || !!buildingName.trim() || buildingRequired);

  // Building section rendering for the review phase.
  const buildingOutcome = preview?.building?.outcome;
  function renderBuildingSection() {
    if (adminLocked && buildingOutcome === "CONFLICT") {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <p className="text-sm font-medium text-destructive">Building conflict</p>
          <p className="text-xs">The admin-set building conflicts with your pin. Move the pin back to the saved location.</p>
          <Button type="button" size="sm" variant="outline" onClick={startMovePin}>Move pin back</Button>
        </div>
      );
    }
    if (adminLocked && pinMovedThisEdit && buildingOutcome !== "CONFLICT") {
      return (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Property / building name</p>
          <p className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" />{buildingName || savedSummary?.building_name}</p>
          <p className="text-xs text-muted-foreground">Set by Reeve — contact support to change.</p>
          {!buildingConfirmed && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5">
              <p className="text-xs text-amber-800 mb-2">You moved the pin. Is this still the correct building?</p>
              <Button type="button" size="sm" onClick={() => setBuildingConfirmed(true)}>Yes, still correct</Button>
            </div>
          )}
        </div>
      );
    }
    if (adminLocked) {
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">Property / building name</p>
          <p className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" />{buildingName || savedSummary?.building_name}</p>
          <p className="text-xs text-muted-foreground">Set by Reeve — contact support to change. You can still adjust the pin.</p>
        </div>
      );
    }
    // Moved-pin or location-replaced recheck for SAME or UNCERTAIN
    if (requiresBuildingRecheck && (buildingOutcome === "SAME" || buildingOutcome === "UNCERTAIN")) {
      const recheckCopy = pinMovedThisEdit
        ? `You moved the pin. Is "${buildingName}" still the correct building?`
        : `You changed the location. Is "${buildingName}" the correct building here?`;
      return (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Property / building name</p>
          <p className="text-sm">{recheckCopy}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={buildingConfirmed ? "default" : "outline"} onClick={() => setBuildingConfirmed(true)}>Yes, still correct</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setBuildingConfirmed(false); setBuildingEditing(true); }}>Change building</Button>
          </div>
          {buildingEditing && (
            <Input value={buildingName} onChange={(e) => { setBuildingName(e.target.value); setBuildingConfirmed(false); }} placeholder="Building / society name" className="min-h-[44px]" />
          )}
        </div>
      );
    }
    // Moved-pin recheck for NOT_APPLICABLE with existing building
    if (requiresBuildingRecheck && buildingOutcome === "NOT_APPLICABLE" && buildingName.trim()) {
      const recheckCopy = pinMovedThisEdit
        ? `You moved the pin. Is "${buildingName}" still the correct building?`
        : `You changed the location. Is "${buildingName}" the correct building here?`;
      return (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Property / building name</p>
          <p className="text-sm">{recheckCopy}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={buildingConfirmed ? "default" : "outline"} onClick={() => setBuildingConfirmed(true)}>Yes, still correct</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setBuildingConfirmed(false); setBuildingEditing(true); }}>Change building</Button>
          </div>
          {buildingEditing && (
            <Input value={buildingName} onChange={(e) => { setBuildingName(e.target.value); setBuildingConfirmed(false); }} placeholder="Building / society name" className="min-h-[44px]" />
          )}
        </div>
      );
    }
    return (
      <BuildingQuestion
        outcome={buildingOutcome}
        name={buildingName} setName={(v) => { setBuildingName(v); setBuildingEditing(true); }}
        editing={buildingEditing} setEditing={setBuildingEditing}
        confirmedYes={buildingConfirmed} setConfirmedYes={setBuildingConfirmed}
        required={buildingRequired}
      />
    );
  }

  // Shared confirmed-summary card (used in confirmed + resume_confirm phases).
  function ConfirmedCard({ summary }: { summary: ConfirmedLocationSummary }) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Final location</p>
          <p className="text-sm">{summary.formatted_address ?? [summary.locality, summary.city].filter(Boolean).join(", ") ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Building</p>
          <p className="text-sm">{summary.building_name || <span className="text-muted-foreground">Not specified</span>}</p>
        </div>
        {streetViewAvailable === true && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show Street View on listing</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!streetViewShowInListing}
              onClick={() => onStreetViewToggle?.(!streetViewShowInListing)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${streetViewShowInListing ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${streetViewShowInListing ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        )}
      </div>
    );
  }

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
      {phase === "confirmed" && savedSummary && (
        <div className="rounded-lg border border-green-500/40 bg-green-50 p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800"><CheckCircle2 className="h-4 w-4" /> Location confirmed</p>
          <ConfirmedCard summary={savedSummary} />
          {showLocationChoice ? (
            <div className="rounded-md border bg-background p-3 space-y-2 mt-2">
              <p className="text-sm font-medium">Need to correct the exact position?</p>
              <p className="text-xs text-muted-foreground">Choose whether to fine-tune the pin or search a completely different address.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={startMovePin}>Move pin</Button>
                {adminLocked ? (
                  <Button type="button" size="sm" variant="outline" disabled>Search a different location <span className="ml-1 text-xs text-muted-foreground">(locked)</span></Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={startSearchNewLocation}>Search a different location</Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowLocationChoice(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={handleChangeLocation}>Change location</Button>
          )}
        </div>
      )}

      {/* resume_confirm — committed but not yet owner-confirmed */}
      {phase === "resume_confirm" && savedSummary && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Almost done — confirm your nearby search places</p>
          <ConfirmedCard summary={savedSummary} />
          <p className="text-xs text-amber-800">Your location is saved. Confirm it looks right to finish this section.</p>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={resumeConfirm}>Looks right</Button>
            <Button type="button" variant="outline" size="sm" onClick={handleChangeLocation}>Change location</Button>
          </div>
          {showLocationChoice && (
            <div className="rounded-md border bg-background p-3 space-y-2">
              <p className="text-sm font-medium">Need to correct the exact position?</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={startMovePin}>Move pin</Button>
                {adminLocked ? (
                  <Button type="button" size="sm" variant="outline" disabled>Search a different location <span className="ml-1 text-xs text-muted-foreground">(locked)</span></Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={startSearchNewLocation}>Search a different location</Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowLocationChoice(false)}>Cancel</Button>
              </div>
            </div>
          )}
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
          {/* Back button when in replacement flow with a saved location */}
          {replacingLocation && savedSummary && (
            <button type="button" onClick={cancelReplacement}
              className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              ← Back to saved location
            </button>
          )}
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

      {/* Single shared GoogleMap across pin → previewing → review phases */}
      {(phase === "pin" || phase === "previewing" || phase === "review") && pin && (
        <div className={phase === "review" ? "" : "space-y-2"}>
          {/* Recovery banner when needsDiscoveryRoot */}
          {(phase === "pin") && (needsDiscoveryRoot || pendingCommitted?.needsDiscoveryRoot) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <strong>Exact location saved</strong> — We still need the nearest town or city to finish your location. Use this pin to continue.
            </div>
          )}

          {phase === "pin" && (
            <p className="text-sm font-medium">Drag the pin to your property's exact location</p>
          )}

          {/* Map — always mounted in these three phases to avoid WebGL remount */}
          <div className="overflow-hidden rounded-lg border">
            <div className={phase === "review" ? "h-[220px] w-full" : "h-[280px] w-full"}>
              <GoogleMap
                id="owner-pin-map"
                mapId={MAP_ID}
                defaultCenter={pin}
                defaultZoom={selectedPlaceId ? 17 : 15}
                gestureHandling="greedy"
                disableDefaultUI={false}
                clickableIcons={false}
              >
                {/* Draggable only in pin phase */}
                <DraggablePin
                  position={pin}
                  seedKey={seedKey}
                  draggable={phase === "pin"}
                  onMove={phase === "pin" ? onPinMove : undefined}
                />
              </GoogleMap>
            </div>
          </div>

          {/* Pin phase controls */}
          {phase === "pin" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => runPreview()} className="min-h-[44px]">Use this pin</Button>
              {/* Search again — context-aware */}
              {!savedSummary && (
                <Button type="button" variant="ghost" size="sm" onClick={handlePinScreenSearchAgain}>Search again</Button>
              )}
              {savedSummary && !adminLocked && (
                <Button type="button" variant="ghost" size="sm" onClick={handlePinScreenSearchAgain}>Search again</Button>
              )}
              {/* adminLocked: hide "Search again" — choice card already showed the explanation */}
            </div>
          )}

          {phase === "pin" && errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          {/* Previewing state */}
          {phase === "previewing" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</p>
          )}

          {/* Review phase — three-section hierarchy */}
          {phase === "review" && preview && (
            <div className="space-y-4 mt-2">
              {/* Section 1 — Exact location */}
              <div className="space-y-1">
                <p className="text-sm font-semibold">1  Exact location</p>
                <p className="flex items-start gap-1.5 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{preview.exact_location?.formatted_address ?? "Pinned location"}
                </p>
                {/* What changed callout */}
                {locationChangedThisEdit && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-0.5">
                    <p className="font-medium">{changeLabel}</p>
                    <p>· Address refreshed</p>
                    {buildingNeedsReview && <p>· Building needs confirmation</p>}
                    <p>· Nearby search places refreshed</p>
                    {preview.street_view !== undefined && <p>· Street View rechecked</p>}
                  </div>
                )}
                {/* Street View status — based on preview.street_view only */}
                {preview.street_view?.available === true && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Street View is available for this location</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={streetViewShowDraft}
                      onClick={() => setStreetViewShowDraft((v) => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${streetViewShowDraft ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${streetViewShowDraft ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                )}
                {preview.street_view?.available === false && (
                  <p className="text-xs text-muted-foreground">Street View isn't available near this pin.</p>
                )}
              </div>

              {/* Section 2 — Building */}
              <div className="space-y-1">
                <p className="text-sm font-semibold">2  Building</p>
                {renderBuildingSection()}
              </div>

              {/* Section 3 — Nearby search places */}
              <div className="space-y-1">
                <p className="text-sm font-semibold">3  Nearby search places</p>
                <p className="text-xs text-muted-foreground">These help people find your property when searching nearby areas.</p>
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
                  hideHeading
                >
                  {placesLib && pin && (
                    <MissingPlaceSearch bias={pin} disabled={extraPlaceIds.length >= 5} onPick={addExtra} />
                  )}
                </DiscoveryGeographyPanel>
              </div>

              {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={commitAndConfirm} disabled={buildingBlocking} className="min-h-[44px]">Looks right</Button>
                <Button type="button" variant="outline" onClick={() => setPhase("pin")} className="min-h-[44px]">Move the pin</Button>
              </div>
            </div>
          )}
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

/** "+ Add another nearby area or road" — India-constrained autocomplete; returns a selected place_id only. */
export function MissingPlaceSearch({ bias, disabled, onPick }: { bias: LatLng; disabled?: boolean; onPick: (placeId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { predictions, setPredictions, fetch } = useAutocomplete();

  if (disabled && !open) return <p className="text-xs text-muted-foreground">You've added the maximum number of extra places.</p>;

  return (
    <div className="relative">
      {!open ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" /> Add another nearby area or road
        </Button>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs">Can't find a nearby place people commonly search for? Add it here.</Label>
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
