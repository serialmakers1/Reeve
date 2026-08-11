import { useState, useRef, useEffect, useId } from "react";
import { usePlacesSearch } from "@/features/search/hooks/usePlacesSearch";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2 } from "lucide-react";

type Viewport = { low: { lat: number; lng: number }; high: { lat: number; lng: number } };

interface CitySearchInputProps {
  displayValue: string;
  /** Fired ONLY for a fully-resolved Google city (placeId + real center + viewport). */
  onCitySelected: (
    city: string,
    displayValue: string,
    placeId: string,
    center: { lat: number; lng: number },
    viewport: Viewport,
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

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);

  const [inputText, setInputText] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [resolving, setResolving] = useState(false);
  // Neutral guidance shown when a typed/unresolved entry can't become a city filter.
  const [guidance, setGuidance] = useState<string | null>(null);

  // Reset active index when suggestion list changes
  useEffect(() => { setActiveIndex(-1); }, [suggestions]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  // Sync display value from parent (e.g. on AlertDialog cancel)
  const prevDisplay = useRef(displayValue);
  if (prevDisplay.current !== displayValue) {
    prevDisplay.current = displayValue;
    setInputText(displayValue);
  }

  const SELECT_GUIDANCE = "Select a city from the suggestions.";

  function handleInputChange(val: string) {
    setInputText(val);
    setGuidance(null);
    if (val.trim()) {
      setOpen(true);
      fetchSuggestions(val, { includedPrimaryTypes: ["locality", "administrative_area_level_3"] });
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
    try {
      const place = await resolvePlace(suggestion, ["id", "location", "viewport", "displayName"]);
      // New Places API: Place.displayName is a plain string (not { text }).
      const rawDisplayName = (place as any).displayName;
      const displayNameStr =
        typeof rawDisplayName === "string" ? rawDisplayName : rawDisplayName?.text;
      const city = (displayNameStr ?? inputText).toLowerCase();
      const placeId = (place as any).id ?? null;
      const vp = (place as any).viewport;
      const viewport: Viewport | null = vp
        ? {
            low: { lat: vp.getSouthWest().lat(), lng: vp.getSouthWest().lng() },
            high: { lat: vp.getNorthEast().lat(), lng: vp.getNorthEast().lng() },
          }
        : null;
      const loc = (place as any).location;
      const clat = typeof loc?.lat === "function" ? loc.lat() : undefined;
      const clng = typeof loc?.lng === "function" ? loc.lng() : undefined;
      const center =
        Number.isFinite(clat) && Number.isFinite(clng) ? { lat: clat as number, lng: clng as number } : null;
      // A canonical city REQUIRES placeId + real center + viewport — never manufacture
      // a center from the viewport midpoint. Missing any → not addable.
      if (!placeId || !center || !viewport) {
        setGuidance(SELECT_GUIDANCE);
        return;
      }
      // Full prediction text (e.g. "Bangalore, Karnataka, India") for the input display.
      const displayLabel = suggestion.placePrediction.text?.text ?? displayNameStr ?? inputText;
      // Clear the field after a successful add so the next city can be typed.
      setInputText("");
      setOpen(false);
      clearSuggestions();
      setGuidance(null);
      onCitySelected(city, displayLabel, placeId, center, viewport);
    } catch {
      setGuidance(SELECT_GUIDANCE);
    } finally {
      setResolving(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  // A typed value that was never resolved to a Google Place cannot become a city
  // filter (no anchor). Guide the user to pick a suggestion instead of silently
  // searching nationwide.
  function handleManualCommit() {
    if (!manualInput.trim()) return;
    setGuidance(SELECT_GUIDANCE);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="Search city…"
                value={inputText}
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
      </div>

      {/* Loading / error states */}
      {!isReady && !error && (
        <p className="text-xs text-muted-foreground">Loading location search…</p>
      )}
      {error && (
        <p className="text-xs text-destructive">Places search unavailable — enter city manually.</p>
      )}
      {guidance && !error && (
        <p className="text-xs text-muted-foreground">{guidance}</p>
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
