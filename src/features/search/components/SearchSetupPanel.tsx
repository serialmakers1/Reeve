import { useState, useEffect } from "react";
import { useSearchState } from "@/features/search/state/useSearchState";
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
}

export function SearchSetupPanel({ open, onOpenChange }: SearchSetupPanelProps) {
  const { state, setContext } = useSearchState();

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
    cityDisplayValue: state.context.city ?? "",
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
      cityDisplayValue: state.context.city ?? "",
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
    if (draft.locations.length > 0 && city !== draft.city) {
      setPendingCityChange({ city, displayValue, placeId, viewport });
    } else {
      applyNewCity(city, displayValue, placeId, viewport);
    }
  }

  const canSubmit = !!draft.mode && !!draft.city;

  function handleSubmit() {
    if (!canSubmit) return;
    // Strip tokens without a real placeId — they can't be matched by the RPC
    const rpcLocations = draft.locations.filter((l) => l.placeId !== null);
    setContext({
      mode: draft.mode!,
      city: draft.city!,
      locations: rpcLocations,
      propertyType: draft.propertyType,
    });
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-none h-dvh overflow-y-auto sm:h-auto sm:max-w-lg sm:rounded-lg p-0 flex flex-col gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Set up your search</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
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
