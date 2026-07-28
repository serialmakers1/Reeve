import { useState, useRef } from "react";
import { usePlacesSearch } from "@/features/search/hooks/usePlacesSearch";
import { useReverseGeocode } from "@/features/search/hooks/useReverseGeocode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Viewport = { low: { lat: number; lng: number }; high: { lat: number; lng: number } };

interface CitySearchInputProps {
  displayValue: string;
  onCitySelected: (
    city: string,
    displayValue: string,
    placeId: string | null,
    viewport: Viewport | null,
  ) => void;
  showManualFallback: boolean;
  onToggleManualFallback: () => void;
}

export function CitySearchInput({
  displayValue,
  onCitySelected,
  showManualFallback,
  onToggleManualFallback,
}: CitySearchInputProps) {
  const { suggestions, isLoading, error, isReady, fetchSuggestions, resolvePlace, clearSuggestions } =
    usePlacesSearch();
  const { geocodeLatLng } = useReverseGeocode();
  const { toast } = useToast();

  const [inputText, setInputText] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Sync display value from parent (e.g. on AlertDialog cancel)
  const prevDisplay = useRef(displayValue);
  if (prevDisplay.current !== displayValue) {
    prevDisplay.current = displayValue;
    setInputText(displayValue);
  }

  function handleInputChange(val: string) {
    setInputText(val);
    if (val.trim()) {
      setOpen(true);
      fetchSuggestions(val, { includedPrimaryTypes: ["locality", "administrative_area_level_3"] });
    } else {
      clearSuggestions();
      setOpen(false);
    }
  }

  async function handleSelect(suggestion: google.maps.places.AutocompleteSuggestion) {
    setResolving(true);
    try {
      const place = await resolvePlace(suggestion, ["id", "location", "viewport", "displayName"]);
      const city = (place as any).displayName?.text?.toLowerCase() ?? inputText.toLowerCase();
      const vp = (place as any).viewport;
      const viewport: Viewport | null = vp
        ? {
            low: { lat: vp.getSouthWest().lat(), lng: vp.getSouthWest().lng() },
            high: { lat: vp.getNorthEast().lat(), lng: vp.getNorthEast().lng() },
          }
        : null;
      const displayLabel = (place as any).displayName?.text ?? inputText;
      setInputText(displayLabel);
      setOpen(false);
      clearSuggestions();
      onCitySelected(city, displayLabel, (place as any).id ?? null, viewport);
    } catch {
      // resolvePlace failed — fall through to manual
    } finally {
      setResolving(false);
    }
  }

  function handleManualCommit() {
    const city = manualInput.trim().toLowerCase();
    if (!city) return;
    onCitySelected(city, manualInput.trim(), null, null);
    setManualInput("");
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast({ title: "Couldn't detect location — please enter manually", variant: "destructive" });
      onToggleManualFallback();
      return;
    }
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const result = await geocodeLatLng(pos.coords.latitude, pos.coords.longitude);
      if (!result) throw new Error("Geocoding failed");
      onCitySelected(result.city, result.city, null, result.viewport);
    } catch {
      toast({ title: "Couldn't detect location — please enter manually", variant: "destructive" });
      onToggleManualFallback();
    } finally {
      setGeoLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                placeholder="Search city…"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                className="pr-8"
              />
              {(isLoading || resolving) && !isReady && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {(isLoading || resolving) && isReady && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <Command>
              <CommandList>
                {suggestions.map((s) => (
                  <CommandItem
                    key={s.placePrediction.placeId}
                    value={s.placePrediction.text.text}
                    onSelect={() => handleSelect(s)}
                  >
                    {s.placePrediction.text.text}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Loading / error states */}
      {!isReady && !error && (
        <p className="text-xs text-muted-foreground">Loading location search…</p>
      )}
      {error && (
        <p className="text-xs text-destructive">Places search unavailable — enter city manually.</p>
      )}

      {/* Always-visible controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onToggleManualFallback}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {showManualFallback ? "Use location search" : "Enter manually"}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoLoading}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          Use my location
        </button>
      </div>

      {showManualFallback && (
        <Input
          placeholder="City name (e.g. Bengaluru)"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualCommit(); } }}
          onBlur={handleManualCommit}
        />
      )}
    </div>
  );
}
