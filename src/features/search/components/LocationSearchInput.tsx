import { useState } from "react";
import { usePlacesSearch } from "@/features/search/hooks/usePlacesSearch";
import { MAX_SELECTED_LOCATIONS } from "@/features/search/domain/searchConstants";
import type { LocationToken, LocationTokenType } from "@/features/search/domain/searchTypes";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Loader2 } from "lucide-react";

type Viewport = { low: { lat: number; lng: number }; high: { lat: number; lng: number } };

// Matches the one-city invariant check order used in LocationSearchInput
const CITY_COMPONENT_TYPES = ["locality", "postal_town", "administrative_area_level_3"] as const;

function inferTokenType(types: string[]): LocationTokenType {
  if (types.includes("postal_code")) return "pincode";
  if (types.some((t) => t.startsWith("sublocality"))) return "sublocality";
  if (types.includes("neighborhood") || types.includes("neighbourhood")) return "neighbourhood";
  if (types.includes("point_of_interest") || types.includes("tourist_attraction")) return "landmark";
  if (types.includes("establishment") || types.includes("premise")) return "building";
  return "area";
}

interface LocationSearchInputProps {
  city: string | null;
  cityViewport: Viewport | null;
  selected: LocationToken[];
  onAdd: (token: LocationToken) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function LocationSearchInput({
  city,
  cityViewport,
  selected,
  onAdd,
  onRemove,
  onClearAll,
}: LocationSearchInputProps) {
  const { suggestions, isLoading, error, isReady, fetchSuggestions, resolvePlace, clearSuggestions } =
    usePlacesSearch();

  const [inputText, setInputText] = useState("");
  const [open, setOpen] = useState(false);
  const [cityMismatchWarning, setCityMismatchWarning] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const atMax = selected.length >= MAX_SELECTED_LOCATIONS;
  const disabled = !city;

  function handleInputChange(val: string) {
    setInputText(val);
    setCityMismatchWarning(null);
    if (val.trim() && !atMax) {
      setOpen(true);
      const extra: Record<string, unknown> = cityViewport
        ? { locationRestriction: { rectangle: cityViewport } }
        : {};
      fetchSuggestions(val, extra);
    } else {
      clearSuggestions();
      setOpen(false);
    }
  }

  async function handleSelect(suggestion: google.maps.places.AutocompleteSuggestion) {
    setResolving(true);
    const types: string[] = (suggestion.placePrediction as any).types ?? [];
    try {
      const place = await resolvePlace(suggestion, ["id", "displayName", "addressComponents"]);

      // One-city invariant check when cityViewport is null (India-wide search)
      if (!cityViewport && city) {
        const comps: any[] = (place as any).addressComponents ?? [];
        const cityComp = CITY_COMPONENT_TYPES.map((t) =>
          comps.find((c: any) => c.types?.includes(t)),
        ).find(Boolean);
        const resolvedCity = cityComp?.longText?.toLowerCase() ?? cityComp?.long_name?.toLowerCase() ?? null;
        if (resolvedCity && resolvedCity !== city) {
          setCityMismatchWarning(`This location is in a different city — please select a location within ${city}.`);
          setOpen(false);
          clearSuggestions();
          return;
        }
      }

      const token: LocationToken = {
        id: (place as any).id,
        label: suggestion.placePrediction.mainText.text,
        type: inferTokenType(types),
        cityId: city,
        placeId: (place as any).id,
      };

      const alreadyAdded = selected.some((t) => t.id === token.id);
      if (!alreadyAdded && !atMax) {
        onAdd(token);
      }
      setInputText("");
      setOpen(false);
      clearSuggestions();
    } catch {
      // resolvePlace failed — user can try again
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
              {t.label}
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${t.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      {atMax ? (
        <p className="text-xs text-muted-foreground">(max {MAX_SELECTED_LOCATIONS} locations reached)</p>
      ) : (
        <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                placeholder={disabled ? "Select a city first" : "Add a neighbourhood, area, or building…"}
                value={inputText}
                disabled={disabled}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                className="pr-8"
              />
              {(isLoading || resolving) && (
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
      )}

      {/* City mismatch warning */}
      {cityMismatchWarning && (
        <p className="text-xs text-destructive">{cityMismatchWarning}</p>
      )}

      {/* Loading / error states */}
      {!isReady && !error && !disabled && (
        <p className="text-xs text-muted-foreground">Loading location search…</p>
      )}
      {error && !disabled && city && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">Places search unavailable.</p>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Search all of {city}
          </button>
        </div>
      )}
    </div>
  );
}
