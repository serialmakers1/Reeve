import { useState, useEffect, useRef } from "react";
import { useSearchState } from "@/features/search/state/useSearchState";
import { useResolveCity, type CanonicalCity } from "@/features/search/hooks/useResolveCity";
import { POPULAR_CITIES } from "@/features/search/domain/popularCities";
import type { SearchMode } from "@/features/search/domain/searchMode";
import type { LocationToken } from "@/features/search/domain/searchTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { RentBuySelector } from "./RentBuySelector";
import { CitySearchInput } from "./CitySearchInput";
import { LocationSearchInput } from "./LocationSearchInput";
import { PropertyTypeSelector } from "./PropertyTypeSelector";

type Viewport = { low: { lat: number; lng: number }; high: { lat: number; lng: number } };

interface SearchSetupDraft {
  mode: SearchMode | null;
  city: string | null;
  cityDisplayValue: string;
  cityPlaceId: string | null;
  cityViewport: Viewport | null;
  locations: LocationToken[];
  propertyType: string | null;
  showManualCity: boolean;
}

interface PendingCityChange {
  city: string;
  displayValue: string;
  placeId: string | null;
  viewport: Viewport | null;
}

export interface SearchSetupPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (ctx: { mode: SearchMode; city: string | null; locations: LocationToken[]; propertyType: string | null }) => void;
  /** Approximate canonical city from Vercel geo — adopted into the draft only if the user hasn't picked a city. */
  suggestedCity?: CanonicalCity | null;
  /** Fired the first time the user selects/changes the city — stops geo prefill from overwriting. */
  onCityInteraction?: () => void;
}

export function SearchSetupPanel({ open, onOpenChange, onSubmit, suggestedCity, onCityInteraction }: SearchSetupPanelProps) {
  const { state, setContext } = useSearchState();
  const { resolveCityByName, isReady: placesReady } = useResolveCity();

  // True once the user selects/changes the city — blocks geo prefill + city hydration.
  const userTouchedCityRef = useRef(false);
  const markCityTouched = () => {
    if (!userTouchedCityRef.current) {
      userTouchedCityRef.current = true;
      onCityInteraction?.();
    }
  };
  const [resolvingPopular, setResolvingPopular] = useState<string | null>(null);

  const contextKey = JSON.stringify({
    mode: state.context.mode,
    city: state.context.city,
    locations: state.context.locations.map((l) => ({
      id: l.id,
      label: l.label,
      type: l.type,
      cityId: l.cityId,
      placeId: l.placeId,
    })),
    propertyType: state.context.propertyType,
  });

  const [draft, setDraft] = useState<SearchSetupDraft>({
    mode: state.context.mode,
    city: state.context.city,
    cityDisplayValue: state.context.city ? state.context.city.charAt(0).toUpperCase() + state.context.city.slice(1) : "",
    cityPlaceId: null,
    cityViewport: null,
    locations: state.context.locations,
    propertyType: state.context.propertyType,
    showManualCity: false,
  });

  const [pendingCityChange, setPendingCityChange] = useState<PendingCityChange | null>(null);

  // Resync draft when panel opens or when URL context changes while open
  useEffect(() => {
    if (!open) return;
    setDraft({
      mode: state.context.mode,
      city: state.context.city,
      cityDisplayValue: state.context.city ? state.context.city.charAt(0).toUpperCase() + state.context.city.slice(1) : "",
      cityPlaceId: null,
      cityViewport: null,
      locations: state.context.locations,
      propertyType: state.context.propertyType,
      showManualCity: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contextKey]);

  function applyNewCity(city: string, displayValue: string, placeId: string | null, viewport: Viewport | null) {
    setDraft((d) => ({
      ...d,
      city,
      cityDisplayValue: displayValue,
      cityPlaceId: placeId,
      cityViewport: viewport,
      locations: [],
    }));
  }

  function handleCitySelected(
    city: string,
    displayValue: string,
    placeId: string | null,
    viewport: Viewport | null,
  ) {
    markCityTouched();
    if (draft.locations.length > 0 && city !== draft.city) {
      setPendingCityChange({ city, displayValue, placeId, viewport });
    } else {
      applyNewCity(city, displayValue, placeId, viewport);
    }
  }

  async function handlePopularCity(name: string) {
    markCityTouched();
    setResolvingPopular(name);
    try {
      const resolved = await resolveCityByName(name);
      if (resolved) {
        applyNewCity(resolved.city, resolved.displayLabel, resolved.placeId, resolved.viewport);
      }
    } finally {
      setResolvingPopular(null);
    }
  }

  // Adopt the geo-suggested approximate city into the draft — only while the user
  // hasn't touched the city and the draft has no city yet. Never overrides a choice.
  useEffect(() => {
    if (!suggestedCity || userTouchedCityRef.current) return;
    setDraft((d) =>
      d.city
        ? d
        : {
            ...d,
            city: suggestedCity.city,
            cityDisplayValue: suggestedCity.displayLabel,
            cityPlaceId: suggestedCity.placeId,
            cityViewport: suggestedCity.viewport,
          },
    );
  }, [suggestedCity]);

  // Hydrate an existing (URL-restored) city with its canonical placeId/viewport once,
  // so Areas enable without forcing re-selection. Skips if already resolved or user-touched.
  useEffect(() => {
    if (!open || !placesReady || !draft.city || draft.cityViewport || userTouchedCityRef.current) return;
    const cityAtStart = draft.city;
    let cancelled = false;
    resolveCityByName(cityAtStart).then((resolved) => {
      if (cancelled || !resolved || userTouchedCityRef.current) return;
      setDraft((d) =>
        d.city === cityAtStart && !d.cityViewport
          ? {
              ...d,
              cityDisplayValue: d.cityDisplayValue || resolved.displayLabel,
              cityPlaceId: resolved.placeId,
              cityViewport: resolved.viewport,
            }
          : d,
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placesReady, draft.city, draft.cityViewport]);

  // City is optional — a mode alone loads default/nationwide results.
  const canSubmit = !!draft.mode;

  // The draft city is "approximate" when it came from geo and the user hasn't touched it.
  const isApproxCity =
    !!suggestedCity && !!draft.city && draft.city === suggestedCity.city && !userTouchedCityRef.current;
  const approxCityLabel = draft.cityDisplayValue || (draft.city ? draft.city.charAt(0).toUpperCase() + draft.city.slice(1) : "");
  const approxHelperText =
    draft.mode === "rent"
      ? `We've started with rentals near ${approxCityLabel}. Change anything below.`
      : draft.mode === "buy"
        ? `We've started with homes for sale near ${approxCityLabel}. Change anything below.`
        : `We've started near ${approxCityLabel}. Change anything below.`;

  function handleSubmit() {
    if (!canSubmit) return;
    // Strip tokens without a real placeId — they can't be matched by the RPC
    const rpcLocations = draft.locations.filter((l) => l.placeId !== null);
    const committed = {
      mode: draft.mode!,
      city: draft.city,
      locations: rpcLocations,
      propertyType: draft.propertyType,
    };
    setContext(committed);
    onSubmit?.(committed);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-none h-[92dvh] top-auto bottom-0 translate-y-0 rounded-t-2xl overflow-hidden sm:top-[50%] sm:bottom-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:translate-y-[-50%] sm:rounded-lg p-0 flex flex-col gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0 space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold">Find your next home</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {isApproxCity ? approxHelperText : "Tell us what you're looking for to get started."}
            </p>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
            {/* Rent / Buy */}
            <section className="space-y-2">
              <p className="text-sm font-medium">Looking to</p>
              <RentBuySelector
                value={draft.mode}
                onChange={(mode) => setDraft((d) => ({ ...d, mode }))}
              />
            </section>

            {/* City */}
            <section className="space-y-2">
              <p className="text-sm font-medium">City</p>
              <CitySearchInput
                displayValue={draft.cityDisplayValue}
                onCitySelected={handleCitySelected}
                showManualFallback={draft.showManualCity}
                onToggleManualFallback={() =>
                  setDraft((d) => ({ ...d, showManualCity: !d.showManualCity }))
                }
              />
              {isApproxCity && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  Approximate location
                </p>
              )}
              {/* Popular cities — resolve canonically via the shared Google flow */}
              <p className="pt-1 text-xs font-medium text-muted-foreground">Popular cities</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CITIES.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full px-3 text-xs font-normal"
                    disabled={resolvingPopular !== null}
                    onClick={() => handlePopularCity(name)}
                  >
                    {resolvingPopular === name ? "…" : name}
                  </Button>
                ))}
              </div>
            </section>

            {/* Locations */}
            {draft.city && (
              <section className="space-y-2">
                <p className="text-sm font-medium">
                  Areas <span className="text-muted-foreground font-normal">(optional)</span>
                </p>
                <LocationSearchInput
                  city={draft.city}
                  cityViewport={draft.cityViewport}
                  cityResolved={!!draft.cityViewport}
                  selected={draft.locations}
                  onAdd={(token) => {
                    if (draft.locations.length >= 5 || draft.locations.some((l) => l.id === token.id)) return;
                    setDraft((d) => ({ ...d, locations: [...d.locations, token] }));
                  }}
                  onRemove={(id) =>
                    setDraft((d) => ({ ...d, locations: d.locations.filter((l) => l.id !== id) }))
                  }
                  onClearAll={() => setDraft((d) => ({ ...d, locations: [] }))}
                />
              </section>
            )}

            {/* Property Type */}
            <section className="space-y-2">
              <p className="text-sm font-medium">
                Property type <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
              <PropertyTypeSelector
                value={draft.propertyType}
                onChange={(v) => setDraft((d) => ({ ...d, propertyType: v }))}
              />
            </section>
          </div>

          {/* Footer CTA */}
          <div className="px-5 py-4 border-t shrink-0 bg-background">
            <Button
              className="w-full"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Show properties
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* City-change AlertDialog */}
      <AlertDialog
        open={!!pendingCityChange}
        onOpenChange={(o) => {
          if (!o) {
            // Cancel: restore city display text to the previously applied city
            setDraft((d) => ({ ...d, cityDisplayValue: d.city ?? "" }));
            setPendingCityChange(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change city?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the city will remove your {draft.locations.length} selected location
              {draft.locations.length !== 1 ? "s" : ""}. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current city</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCityChange) {
                  applyNewCity(
                    pendingCityChange.city,
                    pendingCityChange.displayValue,
                    pendingCityChange.placeId,
                    pendingCityChange.viewport,
                  );
                }
                setPendingCityChange(null);
              }}
            >
              Change city
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
