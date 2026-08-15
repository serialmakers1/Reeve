import { useState, useRef, useEffect, useId, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { suggestGeo, rowToLocationToken, type GeoSuggestRow } from "@/features/search/data/geoSuggestClient";
import { MAX_SELECTED_LOCATIONS } from "@/features/search/domain/searchConstants";
import type { LocationToken, CityToken } from "@/features/search/domain/searchTypes";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Loader2 } from "lucide-react";

interface LocationSearchInputProps {
  /** Active selected root City — details are scoped to it. */
  root: CityToken | null;
  selected: LocationToken[];
  onAdd: (token: LocationToken) => void;
  onRemove: (id: string) => void;
}

const DEBOUNCE_MS = 250;

/**
 * Canonical locality/road search scoped to the active root (Phase 4 · Prompt 3).
 * Settlement root → localities by parent; roads only when the settlement has a
 * search_region (never an India-wide road query). search_region root → localities +
 * roads within the region. Reeve geo_place UUID identity — no Google Places.
 */
export function LocationSearchInput({ root, selected, onAdd, onRemove }: LocationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [inputText, setInputText] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoSuggestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef = useRef(0);

  const atMax = selected.length >= MAX_SELECTED_LOCATIONS;
  const disabled = !root;

  useEffect(() => setActiveIndex(-1), [suggestions]);
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      genRef.current++;
    },
    [],
  );

  const runSearch = useCallback(
    (val: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const gen = ++genRef.current;
      if (!val.trim() || !root) {
        setSuggestions([]);
        setIsLoading(false);
        setError(false);
        return;
      }
      setIsLoading(true);
      setError(false);
      debounceRef.current = setTimeout(async () => {
        try {
          const queries: Promise<GeoSuggestRow[]>[] = [];
          if (root.kind === "settlement") {
            queries.push(
              suggestGeo(
                { query: val, kinds: ["locality"], parentGeoPlaceId: root.geoPlaceId, limit: 8 },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabase as any,
              ),
            );
            // Roads ONLY within a known search_region — never a scope-less road query.
            if (root.searchRegionId) {
              queries.push(
                suggestGeo(
                  { query: val, kinds: ["road"], searchRegionId: root.searchRegionId, limit: 8 },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  supabase as any,
                ),
              );
            }
          } else {
            // search_region root — localities + roads within the region.
            queries.push(
              suggestGeo(
                { query: val, kinds: ["locality", "road"], searchRegionId: root.geoPlaceId, limit: 10 },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabase as any,
              ),
            );
          }
          const groups = await Promise.all(queries);
          if (gen !== genRef.current) return;
          // Preserve per-group backend ranking (localities before roads), dedupe by UUID.
          const seen = new Set<string>();
          const merged = groups
            .flat()
            .filter((r) => (r.kind === "locality" || r.kind === "road") && (seen.has(r.id) ? false : (seen.add(r.id), true)));
          setSuggestions(merged);
        } catch {
          if (gen !== genRef.current) return;
          setSuggestions([]);
          setError(true);
        } finally {
          if (gen === genRef.current) setIsLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [root],
  );

  function handleInputChange(val: string) {
    setInputText(val);
    if (val.trim() && !atMax) {
      setOpen(true);
      runSearch(val);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function selectOption(index: number) {
    const row = suggestions[index];
    if (!row || !root) return;
    const token = rowToLocationToken(row, root.geoPlaceId);
    if (!token) return;
    if (!selected.some((t) => t.id === token.id) && !atMax) onAdd(token);
    setActiveIndex(-1);
    setInputText("");
    setOpen(false);
    setSuggestions([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="space-y-2">
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

      {atMax ? (
        <p className="text-xs text-muted-foreground">(max {MAX_SELECTED_LOCATIONS} locations reached)</p>
      ) : (
        <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder={disabled ? "Select a city first" : `Search localities in ${root?.label ?? "your city"}`}
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
                    <span className="text-xs text-muted-foreground shrink-0 capitalize">
                      {s.kind}
                      {s.parent_display_name ? ` · ${s.parent_display_name}` : ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {disabled && (
        <p className="text-xs text-muted-foreground">Select a city first to search localities.</p>
      )}
      {error && !disabled && (
        <p className="text-xs text-destructive">Location search is temporarily unavailable.</p>
      )}
    </div>
  );
}
