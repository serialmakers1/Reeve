import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchState } from "@/features/search/state/useSearchState";
import { pruneAreasForRemovedCity } from "@/features/search/state/searchStateUtils";
import { resolveCanonicalCityByName } from "@/features/search/data/geoSuggestClient";
import { POPULAR_CITIES } from "@/features/search/domain/popularCities";
import type { SearchMode } from "@/features/search/domain/searchMode";
import type { LocationToken, CityToken } from "@/features/search/domain/searchTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RentBuySelector } from "./RentBuySelector";
import { CitySearchInput } from "./CitySearchInput";
import { LocationSearchInput } from "./LocationSearchInput";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { usePopularCityAvailability } from "@/features/search/hooks/usePopularCityAvailability";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface SearchSetupDraft {
  mode: SearchMode | null;
  cities: CityToken[];
  /** geoPlaceId of the root whose details the Location search currently targets. */
  activeRootId: string | null;
  locations: LocationToken[];
  propertyTypes: string[];
}

export interface SearchSetupPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (ctx: { mode: SearchMode; city: string | null; locations: LocationToken[]; propertyTypes: string[] }) => void;
  /** Approximate canonical city from Vercel geo — adopted only if no city chosen yet. */
  suggestedCity?: CityToken | null;
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

  // True once the user selects/changes a city — blocks geo prefill.
  const userTouchedCityRef = useRef(false);
  const markCityTouched = () => {
    if (!userTouchedCityRef.current) {
      userTouchedCityRef.current = true;
      onCityInteraction?.();
    }
  };
  const [resolvingCity, setResolvingCity] = useState<string | null>(null);
  const [pruningNotice, setPruningNotice] = useState<string | null>(null);
  const { availability, retryCity } = usePopularCityAvailability(POPULAR_CITIES);

  const contextKey = JSON.stringify({
    mode: state.context.mode,
    cities: state.context.cities.map((c) => c.geoPlaceId),
    locations: state.context.locations.map((l) => ({ id: l.id, scopeRootId: l.scopeRootId })),
    propertyTypes: state.context.propertyTypes,
  });

  const initDraft = (): SearchSetupDraft => ({
    mode: state.context.mode,
    cities: state.context.cities,
    activeRootId: state.context.cities.at(-1)?.geoPlaceId ?? null,
    locations: state.context.locations,
    propertyTypes: state.context.propertyTypes,
  });

  const [draft, setDraft] = useState<SearchSetupDraft>(initDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(initDraft());
    setPruningNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contextKey]);

  const activeCity: CityToken | null =
    draft.cities.find((c) => c.geoPlaceId === draft.activeRootId) ?? draft.cities.at(-1) ?? null;

  // ── City add / remove / active ──────────────────────────────────────────────
  function addCity(token: CityToken) {
    setDraft((d) => {
      if (d.cities.some((c) => c.geoPlaceId === token.geoPlaceId)) {
        return { ...d, activeRootId: token.geoPlaceId };
      }
      return { ...d, cities: [...d.cities, token], activeRootId: token.geoPlaceId };
    });
  }

  function setActiveCity(geoPlaceId: string) {
    setDraft((d) => ({ ...d, activeRootId: geoPlaceId }));
  }

  function removeCity(geoPlaceId: string) {
    // Compute pruning count from the current draft snapshot before the state update.
    setPruningNotice(null);
    const removed = draft.cities.find((c) => c.geoPlaceId === geoPlaceId);
    const remainingCities = draft.cities.filter((c) => c.geoPlaceId !== geoPlaceId);
    const prunedLocs = removed ? pruneAreasForRemovedCity(removed, draft.locations) : draft.locations;
    const finalLocs = remainingCities.length === 0 ? [] : prunedLocs;
    const prunedCount = draft.locations.length - finalLocs.length;
    if (prunedCount === 1) {
      const label = draft.locations.find((l) => l.scopeRootId === geoPlaceId)?.label ?? "A location";
      setPruningNotice(`"${label}" was removed because its city or region is no longer selected.`);
    } else if (prunedCount > 1) {
      setPruningNotice(`${prunedCount} locations were removed because their city or region is no longer selected.`);
    }

    setDraft((d) => {
      const removed2 = d.cities.find((c) => c.geoPlaceId === geoPlaceId);
      const cities = d.cities.filter((c) => c.geoPlaceId !== geoPlaceId);
      let locations = removed2 ? pruneAreasForRemovedCity(removed2, d.locations) : d.locations;
      if (cities.length === 0) locations = [];
      const activeRootId = cities.some((c) => c.geoPlaceId === d.activeRootId)
        ? d.activeRootId
        : cities.at(-1)?.geoPlaceId ?? null;
      return { ...d, cities, locations, activeRootId };
    });
  }

  function handleCitySelected(token: CityToken) {
    markCityTouched();
    addCity(token);
  }

  async function resolveAndAddCity(name: string, restoreAreas: boolean) {
    markCityTouched();
    setResolvingCity(name);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = await resolveCanonicalCityByName(name, supabase as any);
      if (!token) return; // ambiguous / no canonical match → user picks from typed search
      addCity(token);
      if (restoreAreas) {
        const mem = getCityMemory?.(token.label.toLowerCase());
        if (mem && mem.lastSelectedAreas.length > 0) {
          setDraft((d) => {
            const existing = new Set(d.locations.map((l) => l.id));
            const add = mem.lastSelectedAreas.filter(
              (a) => !existing.has(a.id) && a.scopeRootId === token.geoPlaceId,
            );
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
    setDraft((d) => (d.cities.length > 0 ? d : { ...d, cities: [suggestedCity], activeRootId: suggestedCity.geoPlaceId }));
  }, [suggestedCity]);

  const recentAreasForActiveCity =
    activeCity ? (getCityMemory?.(activeCity.label.toLowerCase())?.recentAreas ?? []).filter((a) => a.scopeRootId === activeCity.geoPlaceId) : [];

  const canSubmit = !!draft.mode;

  const isApproxCity =
    !!suggestedCity && !userTouchedCityRef.current &&
    draft.cities.length === 1 && draft.cities[0].geoPlaceId === suggestedCity.geoPlaceId;
  const approxHelperText =
    draft.mode === "buy"
      ? `We've started with homes for sale near ${draft.cities[0]?.label ?? ""}. Change anything below.`
      : `We've started with rentals near ${draft.cities[0]?.label ?? ""}. Change anything below.`;

  function handleSubmit() {
    if (!canSubmit) return;
    const cities = draft.cities;
    const locations = draft.locations;
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
    const active = c.geoPlaceId === activeCity?.geoPlaceId;
    return (
      <div
        key={c.geoPlaceId}
        className={cn(
          "flex items-center rounded-lg border",
          active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        )}
      >
        <button
          type="button"
          aria-pressed={active}
          data-testid={`city-chip-${c.geoPlaceId}`}
          onClick={() => setActiveCity(c.geoPlaceId)}
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
          data-testid={`city-remove-${c.geoPlaceId}`}
          onClick={() => removeCity(c.geoPlaceId)}
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
                <CitySearchInput onCitySelected={handleCitySelected} />
                {isApproxCity && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> Approximate location
                  </p>
                )}

                {draft.cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">{draft.cities.map(cityChip)}</div>
                )}

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

                <p className="pt-1 text-xs font-medium text-muted-foreground">Popular cities</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_CITIES.map((name) => {
                    const avail = availability[name];
                    const status = avail?.status ?? "loading";

                    if (status === "loading") {
                      return (
                        <div
                          key={name}
                          aria-busy="true"
                          aria-label={`Checking ${name}…`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground"
                        >
                          {name}
                          <Loader2 className="h-3 w-3 animate-spin" />
                        </div>
                      );
                    }

                    if (status === "unavailable") {
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-disabled="true"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") e.preventDefault();
                          }}
                          className="inline-flex h-auto min-h-[36px] flex-col items-start rounded-lg border border-dashed border-border bg-background px-3.5 py-1.5 text-left cursor-not-allowed opacity-60"
                        >
                          <span className="text-sm font-medium leading-tight">{name}</span>
                          <span className="text-xs text-muted-foreground leading-tight">Not available yet</span>
                        </button>
                      );
                    }

                    if (status === "error") {
                      return (
                        <Button
                          key={name}
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Retry checking ${name}`}
                          onClick={() => retryCity(name)}
                          className="inline-flex h-auto min-h-[36px] flex-col items-start rounded-lg px-3.5 py-1.5 text-left"
                        >
                          <span className="text-sm font-medium leading-tight">{name}</span>
                          <span className="text-xs text-muted-foreground leading-tight">Unable to check · Try again</span>
                        </Button>
                      );
                    }

                    // status === "available"
                    const token = avail.token!;
                    const selected = draft.cities.some((c) => c.geoPlaceId === token.geoPlaceId);
                    return (
                      <Button
                        key={name}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        aria-pressed={selected}
                        disabled={selected}
                        className={cn("h-9 rounded-lg px-3.5 text-sm font-medium", selected && "bg-primary text-primary-foreground hover:bg-primary/90")}
                        onClick={() => { markCityTouched(); addCity(token); }}
                      >
                        {name}
                      </Button>
                    );
                  })}
                </div>
                {POPULAR_CITIES.some((n) => availability[n]?.status === "unavailable") && (
                  <p className="text-xs text-muted-foreground">
                    Cities marked "Not available yet" aren't currently available for direct selection in Reeve search.
                  </p>
                )}
              </section>
            </div>

            {/* Right column: Localities (scoped to the active root) */}
            <div className="space-y-5 min-w-0">
              {pruningNotice && (
                <p className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3 w-3 shrink-0" />{pruningNotice}
                </p>
              )}

              {activeCity && (
                <section className="space-y-2">
                  <p className="text-sm font-medium" data-testid="areas-header">
                    Localities in {activeCity.label}{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </p>
                  {draft.cities.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Searching localities in <span className="font-medium text-foreground">{activeCity.label}</span> — tap a city
                      chip to switch.
                    </p>
                  )}
                  {recentAreasForActiveCity.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Recent localities in {activeCity.label}</p>
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
                    root={activeCity}
                    selected={draft.locations.filter((l) => l.scopeRootId === activeCity.geoPlaceId)}
                    onAdd={(token) => {
                      if (draft.locations.length >= 5 || draft.locations.some((l) => l.id === token.id)) return;
                      setDraft((d) => ({ ...d, locations: [...d.locations, token] }));
                    }}
                    onRemove={(id) => setDraft((d) => ({ ...d, locations: d.locations.filter((l) => l.id !== id) }))}
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
