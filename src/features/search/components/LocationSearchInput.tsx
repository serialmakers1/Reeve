import { useState, useRef, useEffect, useId } from "react";
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
import { viewportToBoundsLiteral } from "@/features/search/domain/geoUtils";

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
  /** Active city's Place ID — stamped onto new area tokens as the stable ownership key. */
  cityId: string | null;
  cityViewport: Viewport | null;
  /** True once a canonical city (with viewport) is resolved. Areas stay disabled until then. */
  cityResolved: boolean;
  selected: LocationToken[];
  onAdd: (token: LocationToken) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function LocationSearchInput({
  city,
  cityId,
  cityViewport,
  cityResolved,
  selected,
  onAdd,
  onRemove,
  onClearAll,
}: LocationSearchInputProps) {
  const { suggestions, isLoading, error, isReady, fetchSuggestions, resolvePlace, clearSuggestions } =
    usePlacesSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);

  const [inputText, setInputText] = useState("");
  const [open, setOpen] = useState(false);
  const [cityMismatchWarning, setCityMismatchWarning] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  // Reset active index when suggestion list changes
  useEffect(() => { setActiveIndex(-1); }, [suggestions]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  const atMax = selected.length >= MAX_SELECTED_LOCATIONS;
  // Areas are only usable once a canonical city (with viewport) is resolved — area
  // suggestions must be scoped to the city, which requires the viewport.
  const disabled = !cityResolved;

  function handleInputChange(val: string) {
    setInputText(val);
    setCityMismatchWarning(null);
    if (val.trim() && !atMax) {
      setOpen(true);
      // Scope area suggestions to the city viewport. The Places (New) API expects a
      // LatLngBoundsLiteral; when a locationRestriction is present, omit includedRegionCodes
      // (the two conflict). usePlacesSearch drops the region code when __noRegion is set.
      const bounds = viewportToBoundsLiteral(cityViewport);
      const extra: Record<string, unknown> = bounds
        ? { locationRestriction: bounds, __noRegion: true }
        : {};
      fetchSuggestions(val, extra);
    } else {
      clearSuggestions();
      setOpen(false);
    }
  }

  async function selectOption(index: number) {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    setActiveIndex(-1);
    setResolving(true);
    const types: string[] = (suggestion.placePrediction as any).types ?? [];
    try {
      const place = await resolvePlace(suggestion, ["id", "displayName", "addressComponents", "viewport", "location"]);

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

      const vp = (place as any).viewport;
      const viewport = vp
        ? {
            sw: { lat: vp.getSouthWest().lat(), lng: vp.getSouthWest().lng() },
            ne: { lat: vp.getNorthEast().lat(), lng: vp.getNorthEast().lng() },
          }
        : null;
      // Area anchor center (Prompt 3): prefer the Place location, else viewport midpoint.
      const loc = (place as any).location;
      const lat =
        typeof loc?.lat === "function" ? loc.lat() : viewport ? (viewport.sw.lat + viewport.ne.lat) / 2 : null;
      const lng =
        typeof loc?.lng === "function" ? loc.lng() : viewport ? (viewport.sw.lng + viewport.ne.lng) / 2 : null;
      const token: LocationToken = {
        id: (place as any).id,
        label: suggestion.placePrediction.mainText.text,
        type: inferTokenType(types),
        // Ownership key = active city's Place ID (stable); fall back to the city
        // label only when no placeId is available (keeps legacy comparison working).
        cityId: cityId ?? city,
        placeId: (place as any).id,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        viewport,
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
      requestAnimationFrame(() => inputRef.current?.focus());
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
                ref={inputRef}
                placeholder={
                  disabled
                    ? "Select a city first"
                    : `Search areas in ${city ? city.charAt(0).toUpperCase() + city.slice(1) : "your city"}`
                }
                value={inputText}
                disabled={disabled}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                role="combobox"
                aria-expanded={open && suggestions.length > 0}
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-controls={open && suggestions.length > 0 ? listboxId : undefined}
                aria-activedescendant={
                  open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
                }
                onKeyDown={(e) => {
                  if (!open || suggestions.length === 0) return;
                  const total = suggestions.length;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((prev) => (prev >= total - 1 ? 0 : prev + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((prev) => (prev <= 0 ? total - 1 : prev - 1));
                  } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < total) {
                    e.preventDefault();
                    selectOption(activeIndex);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setActiveIndex(-1);
                    setOpen(false);
                    inputRef.current?.focus();
                  }
                }}
                className="pr-8"
              />
              {(isLoading || resolving) && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <Command>
              <CommandList id={listboxId} role="listbox">
                {suggestions.map((s, idx) => (
                  <CommandItem
                    key={s.placePrediction.placeId}
                    id={`${listboxId}-option-${idx}`}
                    value={s.placePrediction.text.text}
                    aria-selected={activeIndex === idx}
                    onSelect={() => selectOption(idx)}
                  >
                    {s.placePrediction.text.text}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Disabled helper — no canonical city yet */}
      {disabled && (
        <p className="text-xs text-muted-foreground">Select a city first to search areas.</p>
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
