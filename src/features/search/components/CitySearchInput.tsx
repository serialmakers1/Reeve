import { useState, useRef, useEffect, useId } from "react";
import { useCanonicalGeoSearch } from "@/features/search/hooks/useCanonicalGeoSearch";
import { rowToCityToken } from "@/features/search/data/geoSuggestClient";
import type { CityToken } from "@/features/search/domain/searchTypes";
import { Input } from "@/components/ui/input";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2 } from "lucide-react";

interface CitySearchInputProps {
  /** Fired for a fully-resolved canonical root (search_region | settlement). */
  onCitySelected: (token: CityToken) => void;
}

const subtypeLabel = (kind: string, subtype: string | null): string => {
  if (kind === "search_region") return "Region";
  if (subtype === "town") return "Town";
  if (subtype === "village") return "Village";
  if (subtype === "city") return "City";
  return "Settlement";
};

/**
 * Canonical root City / Town / Region search (Phase 4 · Prompt 3). Suggestions come
 * from `reeve_search_geo_suggest` (kinds search_region | settlement) — Reeve
 * geo_place UUID identity, no Google Places.
 */
export function CitySearchInput({ onCitySelected }: CitySearchInputProps) {
  const { suggestions, isLoading, error, fetchSuggestions, clearSuggestions } =
    useCanonicalGeoSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [inputText, setInputText] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  function handleInputChange(val: string) {
    setInputText(val);
    if (val.trim()) {
      setOpen(true);
      fetchSuggestions(val, { kinds: ["search_region", "settlement"], limit: 8 });
    } else {
      clearSuggestions();
      setOpen(false);
    }
  }

  function selectOption(index: number) {
    const row = suggestions[index];
    if (!row) return;
    const token = rowToCityToken(row);
    if (!token) return;
    setActiveIndex(-1);
    setInputText("");
    setOpen(false);
    clearSuggestions();
    onCitySelected(token);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="Search city, town or region…"
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
              {isLoading && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <Command>
              <CommandList id={listboxId} role="listbox">
                {suggestions.map((s, idx) => (
                  <CommandItem
                    key={s.id}
                    id={`${listboxId}-option-${idx}`}
                    value={`${s.display_name}-${s.id}`}
                    aria-selected={activeIndex === idx}
                    onSelect={() => selectOption(idx)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{s.display_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {subtypeLabel(s.kind, s.settlement_subtype)}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {error && (
        <p className="text-xs text-destructive">Couldn't load locations. Try again.</p>
      )}
      {!error && inputText.trim() && !isLoading && suggestions.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          We don't have this location available in Reeve search yet.
        </p>
      )}
    </div>
  );
}
