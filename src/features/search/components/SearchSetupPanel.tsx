import { useState, useEffect, useRef } from "react";
import { useSearchState } from "@/features/search/state/useSearchState";
import { pruneAreasForRemovedCity } from "@/features/search/state/searchStateUtils";
import { useResolveCity, type CanonicalCity } from "@/features/search/hooks/useResolveCity";
import { POPULAR_CITIES } from "@/features/search/domain/popularCities";
import type { SearchMode } from "@/features/search/domain/searchMode";
import type { LocationToken, CityToken, AreaViewport } from "@/features/search/domain/searchTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RentBuySelector } from "./RentBuySelector";
import { CitySearchInput } from "./CitySearchInput";
import { LocationSearchInput } from "./LocationSearchInput";
import { PropertyTypeSelector } from "./PropertyTypeSelector";

type Viewport = { low: { lat: number; lng: number }; high: { lat: number; lng: number } };
type LatLng = { lat: number; lng: number };

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Places {low,high} → canonical {sw,ne}. */
function toAreaViewport(vp: Viewport | null): AreaViewport | null {
  return vp ? { sw: { lat: vp.low.lat, lng: vp.low.lng }, ne: { lat: vp.high.lat, lng: vp.high.lng } } : null;
}
/** Canonical {sw,ne} → Places {low,high} for area-autocomplete scoping. */
function toLowHigh(vp: AreaViewport | null): Viewport | null {
  return vp ? { low: { lat: vp.sw.lat, lng: vp.sw.lng }, high: { lat: vp.ne.lat, lng: vp.ne.lng } } : null;
}

/**
 * Build a canonical city anchor. Requires ALL of placeId + REAL Google center +
 * viewport (Prompt 3A) — never a viewport-midpoint fallback. Returns null otherwise.
 */
function buildCityToken(
  city: string,
  displayValue: string,
  placeId: string | null,
  center: LatLng | null,
  vp: Viewport | null,
): CityToken | null {
  if (!placeId || !center || !vp) return null;
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return null;
  return {
    placeId,
    label: displayValue || titleCase(city),
    lat: center.lat,
    lng: center.lng,
    viewport: toAreaViewport(vp),
  };
}

interface SearchSetupDraft {
  mode: SearchMode | null;
  cities: CityToken[];
  /** placeId of the city whose Areas the Area search currently targets. */
  activeCityId: string | null;
  locations: LocationToken[];
  propertyTypes: string[];
  showManualCity: boolean;
}

export interface SearchSetupPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (ctx: { mode: SearchMode; city: string | null; locations: LocationToken[]; propertyTypes: string[] }) => void;
  /** Approximate canonical city from Vercel geo — adopted only if no city chosen yet. */
  suggestedCity?: CanonicalCity | null;
  /** Fired the first time the user selects/changes a city — stops geo prefill from overwriting. */
  onCityInteraction?: () => void;
  /** Remembered recent city names (most-recent first) for quick re-selection. */
  recentCities?: string[];
  /** City-scoped memory accessor (last selection + recent-area pool + mode + property types). */
  getCityMemory?: (city: string) => { lastSelectedAreas: LocationToken[]; recentAreas: LocationToken[]; mode: SearchMode; propertyTypes: string[] };
  /** Confirmed-save callback — invoked on submit (with ≥1 city) to persist the full setup. */
  onConfirmSetup?: (setup: { city: string; cityToken?: CityToken; areas: LocationToken[]; mode: SearchMode; propertyTypes: string[] }) => void;
  /** Remove a single remembered city. */
  onRemoveCity?: (city: string) => void;
  /** Clear all remembered cities. */
  onClearRecent?: () => void;
}

export function SearchSetupPanel({ open, onOpenChange, onSubmit, suggestedCity, onCityInteraction, recentCities, getCityMemory, onConfirmSetup, onRemoveCity, onClearRecent }: SearchSetupPanelProps) {
  const { state, setContext } = useSearchState();
  const { resolveCityByName } = useResolveCity();

  // True once the user selects/changes a city — blocks geo prefill.
  const userTouchedCityRef = useRef(false);
  const markCityTouched = () => {
    if (!userTouchedCityRef.current) {
      userTouchedCityRef.current = true;
      onCityInteraction?.();
    }
  };
  const [resolvingCity, setResolvingCity] = useState<string | null>(null);

  const contextKey = JSON.stringify({
    mode: state.context.mode,
    cities: state.context.cities.map((c) => c.placeId),
    locations: state.context.locations.map((l) => ({ id: l.id, cityId: l.cityId })),
    propertyTypes: state.context.propertyTypes,
  });

  const initDraft = (): SearchSetupDraft => ({
    mode: state.context.mode,
    cities: state.context.cities,
    // Default active city = the most-recently-added (last) — never collapse to one.
    activeCityId: state.context.cities.at(-1)?.placeId ?? null,
    locations: state.context.locations,
    propertyTypes: state.context.propertyTypes,
    showManualCity: false,
  });

  const [draft, setDraft] = useState<SearchSetupDraft>(initDraft);

  // Resync draft when panel opens or when URL context changes while open.
  useEffect(() => {
    if (!open) return;
    setDraft(initDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contextKey]);

  const activeCity: CityToken | null =
    draft.cities.find((c) => c.placeId === draft.activeCityId) ?? draft.cities.at(-1) ?? null;

  // ── City add / remove / active ──────────────────────────────────────────────
  function addCity(token: CityToken) {
    setDraft((d) => {
      if (d.cities.some((c) => c.placeId === token.placeId)) {
        return { ...d, activeCityId: token.placeId }; // dedupe: just focus it
      }
      return { ...d, cities: [...d.cities, token], activeCityId: token.placeId };
    });
  }

  function setActiveCity(placeId: string) {
    setDraft((d) => ({ ...d, activeCityId: placeId }));
  }

  function removeCity(placeId: string) {
    setDraft((d) => {
      const removed = d.cities.find((c) => c.placeId === placeId);
      const cities = d.cities.filter((c) => c.placeId !== placeId);
      // Prune only the removed city's areas; if no city remains, clear all areas.
      let locations = removed ? pruneAreasForRemovedCity(removed, d.locations) : d.locations;
      if (cities.length === 0) locations = [];
      const activeCityId = cities.some((c) => c.placeId === d.activeCityId)
        ? d.activeCityId
        : cities.at(-1)?.placeId ?? null;
      return { ...d, cities, locations, activeCityId };
    });
  }

  function handleCitySelected(
    city: string,
    displayValue: string,
    placeId: string,
    center: LatLng,
    viewport: Viewport,
  ) {
    markCityTouched();
    const token = buildCityToken(city, displayValue, placeId, center, viewport);
    if (token) addCity(token);
  }

  async function resolveAndAddCity(name: string, restoreAreas: boolean) {
    markCityTouched();
    setResolvingCity(name);
    try {
      const resolved = await resolveCityByName(name);
      const token = resolved
        ? buildCityToken(resolved.city, resolved.displayLabel, resolved.placeId, resolved.center, resolved.viewport)
        : null;
      if (!token) return; // unresolved (missing placeId/center/viewport) → not addable
      addCity(token);
      if (restoreAreas) {
        const mem = getCityMemory?.(resolved!.city);
        if (mem && mem.lastSelectedAreas.length > 0) {
          setDraft((d) => {
            const existing = new Set(d.locations.map((l) => l.id));
            const add = mem.lastSelectedAreas.filter((a) => !existing.has(a.id));
            return { ...d, locations: [...d.locations, ...add] };
          });
        }
      }
    } finally {
      setResolvingCity(null);
    }
  }

  // Adopt the geo-suggested approximate city — only while untouched and no city yet.
  useEffect(() => {
    if (!suggestedCity || userTouchedCityRef.current) return;
    const vp = suggestedCity.viewport ? { low: suggestedCity.viewport.low, high: suggestedCity.viewport.high } : null;
    const token = buildCityToken(suggestedCity.city, suggestedCity.displayLabel, suggestedCity.placeId, suggestedCity.center, vp);
    if (!token) return;
    setDraft((d) => (d.cities.length > 0 ? d : { ...d, cities: [token], activeCityId: token.placeId }));
  }, [suggestedCity]);

  const recentAreasForActiveCity =
    activeCity ? getCityMemory?.(activeCity.label.toLowerCase())?.recentAreas ?? [] : [];

  const canSubmit = !!draft.mode;

  // Approximate = adopted geo city, single, untouched.
  const isApproxCity =
    !!suggestedCity && !userTouchedCityRef.current &&
    draft.cities.length === 1 && draft.cities[0].placeId === suggestedCity.placeId;
  const approxHelperText =
    draft.mode === "buy"
      ? `We've started with homes for sale near ${draft.cities[0]?.label ?? ""}. Change anything below.`
      : `We've started with rentals near ${draft.cities[0]?.label ?? ""}. Change anything below.`;

  function handleSubmit() {
    if (!canSubmit) return;
    const cities = draft.cities;
    const locations = draft.locations.filter((l) => l.placeId !== null);
    const primaryLabel = cities[0]?.label.toLowerCase() ?? null;
    const committed = {
      mode: draft.mode!,
      city: primaryLabel,
      cities,
      locations,
      propertyTypes: draft.propertyTypes,
    };
    setContext(committed);
    if (cities.length > 0 && primaryLabel) {
      onConfirmSetup?.({
        city: primaryLabel,
        cityToken: cities[0],
        areas: locations,
        mode: committed.mode,
        propertyTypes: committed.propertyTypes,
      });
    }
    onSubmit?.(committed);
    onOpenChange(false);
  }

  const cityChip = (c: CityToken) => {
    const active = c.placeId === activeCity?.placeId;
    return (
      <div
        key={c.placeId}
        className={cn(
          "flex items-center rounded-lg border",
          active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        )}
      >
        <button
          type="button"
          aria-pressed={active}
          data-testid={`city-chip-${c.placeId}`}
          onClick={() => setActiveCity(c.placeId)}
          className={cn(
            "h-9 rounded-l-lg pl-3.5 pr-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            !active && "hover:text-foreground",
          )}
        >
          {c.label}
        </button>
        <button
          type="button"
          aria-label={`Remove ${c.label}`}
          data-testid={`city-remove-${c.placeId}`}
          onClick={() => removeCity(c.placeId)}
          className={cn(
            "flex h-9 w-8 items-center justify-center rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            active ? "hover:bg-primary-foreground/20" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-none h-[92dvh] top-auto bottom-0 translate-y-0 rounded-t-2xl overflow-hidden sm:top-[50%] sm:bottom-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:translate-y-[-50%] sm:rounded-lg desk:max-w-2xl p-0 flex flex-col gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0 space-y-1 text-left">
          <DialogTitle className="text-lg font-semibold">Find your next home</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isApproxCity ? approxHelperText : "Tell us what you're looking for to get started."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5">
          <div className="space-y-5 desk:grid desk:grid-cols-2 desk:gap-6 desk:space-y-0 desk:items-start">
            {/* Left column: Looking to, Cities */}
            <div className="space-y-5 min-w-0">
              <section className="space-y-2">
                <p className="text-sm font-medium">Looking to</p>
                <RentBuySelector value={draft.mode} onChange={(mode) => setDraft((d) => ({ ...d, mode }))} />
              </section>

              <section className="space-y-2">
                <p className="text-sm font-medium">
                  Cities <span className="text-muted-foreground font-normal">(add one or more)</span>
                </p>
                <CitySearchInput
                  displayValue=""
                  onCitySelected={handleCitySelected}
                  showManualFallback={draft.showManualCity}
                  onToggleManualFallback={() => setDraft((d) => ({ ...d, showManualCity: !d.showManualCity }))}
                />
                {isApproxCity && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> Approximate location
                  </p>
                )}

                {/* Selected city chips — click to make active for Area search; × removes */}
                {draft.cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">{draft.cities.map(cityChip)}</div>
                )}

                {/* Recent cities — select adds the city (and restores its saved areas) */}
                {recentCities && recentCities.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs font-medium text-muted-foreground">Recent cities</p>
                      {onClearRecent && (
                        <button
                          type="button"
                          onClick={onClearRecent}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                        >
                          Clear recent cities
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentCities.map((name) => {
                        const label = titleCase(name);
                        const selected = draft.cities.some((c) => c.label.toLowerCase() === name);
                        return (
                          <div key={name} className={cn("flex items-center rounded-lg border", selected ? "border-primary bg-primary/10" : "border-input bg-background")}>
                            <button
                              type="button"
                              disabled={resolvingCity !== null}
                              onClick={() => resolveAndAddCity(name, true)}
                              className="h-9 rounded-l-lg pl-3.5 pr-2 text-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
                            >
                              {resolvingCity === name ? "…" : label}
                            </button>
                            {onRemoveCity && (
                              <button
                                type="button"
                                aria-label={`Forget ${label}`}
                                onClick={() => onRemoveCity(name)}
                                className="flex h-9 w-8 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Popular cities — resolve canonically via the shared Google flow */}
                <p className="pt-1 text-xs font-medium text-muted-foreground">Popular cities</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_CITIES.map((name) => {
                    const selected = draft.cities.some((c) => c.label.toLowerCase() === name.toLowerCase());
                    return (
                      <Button
                        key={name}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        aria-pressed={selected}
                        className={cn("h-9 rounded-lg px-3.5 text-sm font-medium", selected && "bg-primary text-primary-foreground hover:bg-primary/90")}
                        disabled={resolvingCity !== null}
                        onClick={() => resolveAndAddCity(name, false)}
                      >
                        {resolvingCity === name ? "…" : name}
                      </Button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right column: Areas (scoped to the active city) */}
            <div className="space-y-5 min-w-0">
              {activeCity && (
                <section className="space-y-2">
                  <p className="text-sm font-medium" data-testid="areas-header">
                    Areas in {activeCity.label}{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </p>
                  {draft.cities.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Searching areas in <span className="font-medium text-foreground">{activeCity.label}</span> — tap a city
                      chip to switch.
                    </p>
                  )}
                  {recentAreasForActiveCity.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Recent areas in {activeCity.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {recentAreasForActiveCity.map((area) => {
                          const picked = draft.locations.some((l) => l.id === area.id);
                          return (
                            <Button
                              key={area.id}
                              type="button"
                              variant={picked ? "default" : "outline"}
                              size="sm"
                              aria-pressed={picked}
                              disabled={!picked && draft.locations.length >= 5}
                              className={cn("h-8 rounded-lg px-3 text-xs font-medium", picked && "bg-primary text-primary-foreground hover:bg-primary/90")}
                              onClick={() =>
                                setDraft((d) =>
                                  d.locations.some((l) => l.id === area.id)
                                    ? { ...d, locations: d.locations.filter((l) => l.id !== area.id) }
                                    : d.locations.length >= 5
                                      ? d
                                      : { ...d, locations: [...d.locations, area] },
                                )
                              }
                            >
                              {area.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <LocationSearchInput
                    city={activeCity.label.toLowerCase()}
                    cityId={activeCity.placeId}
                    cityViewport={toLowHigh(activeCity.viewport)}
                    cityResolved={true}
                    selected={draft.locations.filter((l) => l.cityId === activeCity.placeId || l.cityId === activeCity.label.toLowerCase())}
                    onAdd={(token) => {
                      if (draft.locations.length >= 5 || draft.locations.some((l) => l.id === token.id)) return;
                      setDraft((d) => ({ ...d, locations: [...d.locations, token] }));
                    }}
                    onRemove={(id) => setDraft((d) => ({ ...d, locations: d.locations.filter((l) => l.id !== id) }))}
                    onClearAll={() =>
                      setDraft((d) => ({
                        ...d,
                        // Clear only the ACTIVE city's areas — keep other cities' areas.
                        locations: d.locations.filter(
                          (l) => !(l.cityId === activeCity.placeId || l.cityId === activeCity.label.toLowerCase()),
                        ),
                      }))
                    }
                  />
                </section>
              )}
            </div>
          </div>

          {/* Property Type — full-width row */}
          <section className="space-y-2">
            <p className="text-sm font-medium">
              Property type <span className="text-muted-foreground font-normal">(optional)</span>
            </p>
            <PropertyTypeSelector value={draft.propertyTypes} onChange={(v) => setDraft((d) => ({ ...d, propertyTypes: v }))} />
          </section>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t shrink-0 bg-background">
          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            Show properties
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
