/**
 * PropertyLocationFlow (Prompt 2) — the trusted Google-first owner location experience.
 *
 * The browser only forwards the selected Google place_id + pin + candidate selections to
 * the confirm-property-location Edge Function, which server-verifies and persists. This
 * component never writes canonical geography. Confirmed location survives "Search again"
 * until a replacement successfully confirms.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useMapsLibrary, useApiLoadingStatus, APILoadingStatus } from "@vis.gl/react-google-maps";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle2, Search, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveLocation, confirmLocation, LOCATION_ERROR_COPY,
  type ResolveResult, type LocationErrorCode, type OverrideWire, type SecondaryCityMode,
} from "@/lib/location/confirmLocationClient";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const staticMap = (lat: number, lng: number) =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=640x220&scale=2&markers=color:0x0A6EEF%7C${lat},${lng}&key=${MAPS_KEY}`;

export interface ConfirmedLocationSummary {
  place_id: string | null;
  formatted_address: string | null; city: string | null; locality: string | null;
  building_name: string | null; latitude: number | null; longitude: number | null;
  verified: boolean;
}

interface Props {
  propertyId: string | null;
  ensureDraft: () => Promise<string | null>;
  token: string | null;
  propertyType: string | null;
  /** Persisted confirmed location (for hydration); null = none yet. */
  confirmed: ConfirmedLocationSummary | null;
  readOnly?: boolean;
  /** Admin-only: unlock Primary/Secondary city correction controls (owner UI unchanged). */
  canOverrideCity?: boolean;
  /** Deterministic init of the durable secondary-city mode when `canOverrideCity` (admin). */
  initialSecondaryMode?: SecondaryCityMode;
  /** Fired after a successful atomic confirm; parent refreshes form + section state. */
  onConfirmed: (s: ConfirmedLocationSummary) => void;
  /** Fired whenever the local flow becomes dirty/undirty (blocks submit while dirty). */
  onDirtyChange?: (dirty: boolean) => void;
}

type Phase = "confirmed" | "idle" | "resolving" | "review" | "confirming" | "google_down";
const OPTIONAL_TYPES = new Set(["independent_house", "villa", "plot"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Suggestion = any;

export function PropertyLocationFlow({
  propertyId, ensureDraft, token, propertyType, confirmed, readOnly,
  canOverrideCity, initialSecondaryMode, onConfirmed, onDirtyChange,
}: Props) {
  const placesLib = useMapsLibrary("places");
  const apiStatus = useApiLoadingStatus();
  const mapsFailed = apiStatus === APILoadingStatus.FAILED || apiStatus === APILoadingStatus.AUTH_FAILURE;

  const [phase, setPhase] = useState<Phase>(confirmed ? "confirmed" : "idle");
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Suggestion[]>([]);
  const [resolved, setResolved] = useState<ResolveResult | null>(null);
  const [pin, setPin] = useState<{ placeId: string; lat: number; lng: number } | null>(null);
  const [buildingName, setBuildingName] = useState("");
  const [buildingTouched, setBuildingTouched] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [cityQuery, setCityQuery] = useState("");
  const [cityPreds, setCityPreds] = useState<Suggestion[]>([]);
  const [error, setError] = useState<LocationErrorCode | null>(null);
  // Admin city-correction state (4-state override; `undefined` = omit the wire key).
  const [cityOverride, setCityOverride] = useState<string | null | undefined>(undefined);
  const [secOverride, setSecOverride] = useState<string[] | null | undefined>(undefined);
  const [uiMode, setUiMode] = useState<SecondaryCityMode>(initialSecondaryMode ?? "auto");
  const [secEditorOpen, setSecEditorOpen] = useState(false);
  const [secDraft, setSecDraft] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Build the current 4-state override wire from local admin edits (owner: always empty).
  const currentOverride = useCallback((): OverrideWire => {
    const o: OverrideWire = {};
    if (cityOverride !== undefined) o.cityPlaceId = cityOverride;
    if (secOverride !== undefined) o.secondaryCityPlaceIds = secOverride;
    return o;
  }, [cityOverride, secOverride]);

  useEffect(() => { onDirtyChange?.(phase !== "confirmed" && phase !== "idle"); }, [phase, onDirtyChange]);

  const optionalBuilding = OPTIONAL_TYPES.has(propertyType ?? "");
  const buildingRequiredNow = !!resolved && resolved.property.owner_building_required && !optionalBuilding;

  const ensureSession = () => {
    if (!sessionTokenRef.current && placesLib) sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
  };

  const fetchPreds = useCallback(async (input: string, cityOnly: boolean) => {
    if (!placesLib || !input.trim()) { cityOnly ? setCityPreds([]) : setPredictions([]); return; }
    ensureSession();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { suggestions } = await (placesLib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input, includedRegionCodes: ["IN"], sessionToken: sessionTokenRef.current ?? undefined,
        ...(cityOnly ? { includedPrimaryTypes: ["(cities)"] } : {}),
      });
      const list = suggestions ?? [];
      cityOnly ? setCityPreds(list) : setPredictions(list);
    } catch { cityOnly ? setCityPreds([]) : setPredictions([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib]);

  const onQueryChange = (v: string, cityOnly = false) => {
    cityOnly ? setCityQuery(v) : setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchPreds(v, cityOnly), 300);
  };

  const runResolve = useCallback(async (placeId: string, lat: number, lng: number, override?: OverrideWire) => {
    if (!token) { setError("unauthorized"); return; }
    const pid = propertyId ?? (await ensureDraft());
    if (!pid) { setError("save_failed"); return; }
    setPhase("resolving"); setError(null);
    // Carry the current admin override wire so staged Primary/Secondary edits survive re-resolves.
    const res = await resolveLocation(token, pid, placeId, lat, lng, override);
    if (res.ok && res.data) {
      const data = res.data;
      setResolved(data); setPin({ placeId, lat, lng });
      setBuildingName(data.property.building_name ?? "");
      setSelectedAreas(new Set(data.areas.filter((a) => a.preselect).map((a) => a.place_id)));
      // Server is authoritative for the effective mode after each resolve.
      if (data.secondary_city_mode) setUiMode(data.secondary_city_mode);
      setPhase("review");
      return;
    }
    const err = res.error ?? "google_unavailable";
    setError(err);
    setPhase(err === "google_unavailable" || err === "network" ? "google_down" : (confirmed ? "confirmed" : "idle"));
  }, [token, propertyId, ensureDraft, confirmed]);

  const onSelectPlace = async (s: Suggestion) => {
    setPredictions([]);
    try {
      const place = s.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location", "id"] });
      const loc = place.location;
      if (!loc) { setError("search_again"); return; }
      // A genuinely different geographic target → discard any staged admin overrides + reset mode.
      setCityOverride(undefined); setSecOverride(undefined); setSecEditorOpen(false);
      setUiMode("auto");
      await runResolve(place.id, loc.lat(), loc.lng(), {});
    } catch { setError("search_again"); setPhase(confirmed ? "confirmed" : "idle"); }
  };

  // Owner unresolved-city pick (and admin "choose nearest city" when Google didn't resolve one).
  const onSelectCity = async (s: Suggestion) => {
    setCityPreds([]);
    const id = s.placePrediction.placeId;
    setCityOverride(id);
    if (pin) await runResolve(pin.placeId, pin.lat, pin.lng, { ...currentOverride(), cityPlaceId: id });
  };

  // Admin: switch Primary to another Google-associated city (preserves Secondary MODE).
  const applyPrimaryChange = async (nextPrimary: string | null) => {
    if (!pin) return;
    setCityOverride(nextPrimary);
    // Preserve mode: in auto, don't send explicit secondaries (let server recompute); in admin,
    // keep the current explicit wire. The server always reconciles secondaries vs the final primary.
    const nextSec = uiMode === "auto" ? undefined : secOverride;
    setSecOverride(nextSec);
    await runResolve(pin.placeId, pin.lat, pin.lng, {
      cityPlaceId: nextPrimary,
      ...(nextSec !== undefined ? { secondaryCityPlaceIds: nextSec } : {}),
    });
  };

  // Admin: commit an explicit secondary-city set (→ mode 'admin').
  const applySecondaries = async () => {
    if (!pin) return;
    setSecOverride(secDraft); setUiMode("admin"); setSecEditorOpen(false);
    await runResolve(pin.placeId, pin.lat, pin.lng, { ...currentOverride(), secondaryCityPlaceIds: secDraft });
  };
  // Admin: revert secondaries to Google-derived (→ mode 'auto').
  const applyUseGoogleSecondaries = async () => {
    if (!pin) return;
    setSecOverride(null); setUiMode("auto"); setSecEditorOpen(false);
    await runResolve(pin.placeId, pin.lat, pin.lng, { ...currentOverride(), secondaryCityPlaceIds: null });
  };

  const doConfirm = async () => {
    if (!token || !propertyId || !pin || !resolved) return;
    if (buildingRequiredNow && !buildingName.trim()) { setBuildingTouched(true); return; }
    setPhase("confirming"); setError(null);
    const res = await confirmLocation(token, {
      propertyId, placeId: pin.placeId, lat: pin.lat, lng: pin.lng,
      buildingName: resolved.property.owner_building_required ? (buildingName.trim() || null) : null,
      selectedAreaIds: Array.from(selectedAreas),
      ...currentOverride(),
    });
    if (res.ok) {
      const p = resolved.property;
      onConfirmed({
        place_id: p.place_id,
        formatted_address: p.formatted_address, city: resolved.primary_city?.display_name ?? null,
        locality: p.locality, building_name: p.owner_building_required ? (buildingName.trim() || null) : p.building_name,
        latitude: p.latitude, longitude: p.longitude, verified: true,
      });
      setPhase("confirmed");
      return;
    }
    const err = res.error ?? "google_unavailable";
    setError(err);
    setPhase(err === "google_unavailable" || err === "network" ? "google_down" : "review");
  };

  // Non-destructive: entering search does NOT erase confirmed location or staged admin overrides.
  const startSearchAgain = () => { setPhase("idle"); setResolved(null); setPin(null); setError(null); };

  // Admin candidate cities available to pick from (Google-associated), excluding the current primary.
  const primaryPid = resolved?.primary_city?.place_id ?? null;
  const candidatesExclPrimary = (resolved?.city_candidates ?? []).filter((c) => c.place_id !== primaryPid);
  const effectiveSecondaries = resolved?.secondary_cities ?? [];

  if (readOnly) {
    return (
      <div className="text-sm">
        <p className="font-medium">{confirmed?.formatted_address ?? [confirmed?.building_name, confirmed?.locality, confirmed?.city].filter(Boolean).join(", ")}</p>
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

      {/* Confirmed summary */}
      {phase === "confirmed" && confirmed && (
        <div className="rounded-lg border border-green-500/40 bg-green-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800">
            <CheckCircle2 className="h-4 w-4" /> Location confirmed
          </p>
          <p className="mt-1 text-sm text-foreground">{confirmed.formatted_address ?? [confirmed.building_name, confirmed.locality, confirmed.city].filter(Boolean).join(", ")}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={startSearchAgain}>Search again</Button>
        </div>
      )}

      {/* Google-down */}
      {phase === "google_down" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-amber-800"><AlertTriangle className="h-4 w-4" /> Location search is temporarily unavailable</p>
          <p className="mt-1 text-amber-800">Your draft is safe. Try again when Google Maps is available.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => (pin ? runResolve(pin.placeId, pin.lat, pin.lng) : startSearchAgain())}>Retry</Button>
        </div>
      )}

      {/* Search */}
      {phase === "idle" && (
        <div className="space-y-1 relative">
          <Label htmlFor="loc-search">Where is your property?</Label>
          <p className="text-xs text-muted-foreground">Search for your building, society, street or exact address. Choose the closest accurate result — you can search again if it isn't right.</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="loc-search" value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="e.g. Prestige Lakeside Habitat, Bengaluru" className="min-h-[44px] pl-9" autoComplete="off" />
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
          {error && <p className="text-sm text-destructive">{LOCATION_ERROR_COPY[error]}</p>}
        </div>
      )}

      {phase === "resolving" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking this location…</p>
      )}

      {/* Review candidates */}
      {phase === "review" && resolved && pin && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border">
            {MAPS_KEY && <img src={staticMap(pin.lat, pin.lng)} alt="Map" className="h-[180px] w-full object-cover" loading="lazy" />}
            <div className="p-3">
              <p className="flex items-start gap-1.5 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{resolved.property.formatted_address}</p>
            </div>
          </div>

          {/* Building fallback */}
          {resolved.property.owner_building_required && (
            <div className="space-y-1">
              <Label htmlFor="bld">Building / Society name {!optionalBuilding && <span className="text-destructive">*</span>}</Label>
              <p className="text-xs text-muted-foreground">We found the location, but Google didn't identify the building. Add the exact building or society name; we'll keep the Google address and map you selected.{optionalBuilding && " (optional for this property type)"}</p>
              <Input id="bld" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} onBlur={() => setBuildingTouched(true)} placeholder="e.g. Prestige Lakeside" className="min-h-[44px]" />
              {buildingTouched && buildingRequiredNow && !buildingName.trim() && <p className="text-sm text-destructive">Building / Society name is required.</p>}
            </div>
          )}

          {/* City */}
          {resolved.primary_city ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Primary City</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-green-600" />{resolved.primary_city.display_name}</p>
            </div>
          ) : (
            <div className="space-y-1 relative">
              <Label htmlFor="city">Choose the nearest city <span className="text-destructive">*</span></Label>
              <Input id="city" value={cityQuery} onChange={(e) => onQueryChange(e.target.value, true)} placeholder="Search city" className="min-h-[44px]" autoComplete="off" />
              {cityPreds.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
                  {cityPreds.map((s) => (
                    <li key={s.placePrediction.placeId} onClick={() => onSelectCity(s)} className="cursor-pointer px-3 py-2 text-sm hover:bg-muted">{s.placePrediction.text?.text}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Admin-only city correction (Primary + Secondary). Owner UI never renders this. */}
          {canOverrideCity && resolved.primary_city && (
            <div className="space-y-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-2.5">
              <p className="text-xs font-semibold text-muted-foreground">Admin · city correction</p>

              {/* Change primary city (evidence-driven: only Google-associated cities) */}
              {candidatesExclPrimary.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Change primary to:</span>
                  {candidatesExclPrimary.map((c) => (
                    <button key={c.place_id} type="button" onClick={() => applyPrimaryChange(c.place_id)}
                      className="min-h-[32px] rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                      {c.display_name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Google does not associate another city with this location.</p>
              )}
              {typeof cityOverride === "string" && (
                <Button type="button" variant="ghost" size="sm" onClick={() => applyPrimaryChange(null)}>Use Google-detected city</Button>
              )}

              {/* Secondary cities */}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Secondary cities{uiMode === "admin" ? " · admin-set" : ""}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {effectiveSecondaries.length > 0 ? effectiveSecondaries.map((c) => (
                    <span key={c.place_id} className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs">{c.display_name}</span>
                  )) : <span className="text-[11px] text-muted-foreground">None</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => { setSecEditorOpen((o) => !o); setSecDraft(effectiveSecondaries.map((c) => c.place_id)); }}>
                    Adjust secondary cities
                  </Button>
                  {uiMode === "admin" && (
                    <Button type="button" variant="ghost" size="sm" onClick={applyUseGoogleSecondaries}>Use Google suggestions</Button>
                  )}
                </div>
                {secEditorOpen && (
                  <div className="mt-1.5 space-y-1.5">
                    {candidatesExclPrimary.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {candidatesExclPrimary.map((c) => {
                          const on = secDraft.includes(c.place_id);
                          return (
                            <button key={c.place_id} type="button"
                              onClick={() => setSecDraft((d) => on ? d.filter((x) => x !== c.place_id) : (d.length >= 2 ? d : [...d, c.place_id]))}
                              className={cn("min-h-[32px] rounded-full border px-2.5 py-1 text-xs font-medium", on ? "border-primary bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground")}>
                              {on ? "✓ " : "+ "}{c.display_name}
                            </button>
                          );
                        })}
                      </div>
                    ) : <p className="text-[11px] text-muted-foreground">No other associated city.</p>}
                    <Button type="button" size="sm" onClick={applySecondaries}>Apply secondary cities</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Areas */}
          {resolved.areas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Areas / Roads</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {resolved.areas.map((a) => {
                  const on = selectedAreas.has(a.place_id);
                  return (
                    <button key={a.place_id} type="button" onClick={() => setSelectedAreas((p) => { const n = new Set(p); on ? n.delete(a.place_id) : n.add(a.place_id); return n; })}
                      className={cn("rounded-full border px-3 py-1 text-xs font-medium min-h-[32px]", on ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground")}>
                      {on ? "✓ " : "+ "}{a.display_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{LOCATION_ERROR_COPY[error]}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={doConfirm} disabled={!resolved.primary_city} className="min-h-[44px]">Confirm property location</Button>
            <Button type="button" variant="outline" onClick={startSearchAgain} className="min-h-[44px]">Search again</Button>
          </div>
        </div>
      )}

      {phase === "confirming" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Saving location…</p>
      )}
    </div>
  );
}
