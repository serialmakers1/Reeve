import { useRef, useState, useCallback, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export interface UsePlacesSearchReturn {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  error: Error | null;
  isReady: boolean;
  fetchSuggestions: (input: string, extra?: Record<string, unknown>) => void;
  resolvePlace: (
    suggestion: google.maps.places.AutocompleteSuggestion,
    fields: string[],
  ) => Promise<google.maps.places.Place>;
  clearSuggestions: () => void;
}

export function usePlacesSearch(): UsePlacesSearchReturn {
  const placesLib = useMapsLibrary("places");
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cleanup on unmount: clear debounce + invalidate any in-flight request
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      generationRef.current++;
    },
    [],
  );

  function ensureSessionToken() {
    if (!sessionTokenRef.current && placesLib) {
      sessionTokenRef.current = new (placesLib as any).AutocompleteSessionToken();
    }
  }

  function clearSessionToken() {
    sessionTokenRef.current = null;
  }

  const fetchSuggestions = useCallback(
    (input: string, extra?: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const gen = ++generationRef.current;
      if (!input.trim()) {
        setSuggestions([]);
        setError(null);
        setIsLoading(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        if (!placesLib) return;
        ensureSessionToken();
        setIsLoading(true);
        setError(null);
        try {
          const { suggestions: s } = await (placesLib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            includedRegionCodes: ["IN"],
            sessionToken: sessionTokenRef.current ?? undefined,
            ...extra,
          });
          if (gen !== generationRef.current) return;
          setSuggestions(s ?? []);
        } catch (e) {
          if (gen !== generationRef.current) return;
          setSuggestions([]);
          setError(e instanceof Error ? e : new Error("Places fetch failed"));
        } finally {
          if (gen === generationRef.current) setIsLoading(false);
        }
      }, 300);
    },
    [placesLib],
  );

  async function resolvePlace(
    suggestion: google.maps.places.AutocompleteSuggestion,
    fields: string[],
  ): Promise<google.maps.places.Place> {
    const place = suggestion.placePrediction.toPlace();
    try {
      await place.fetchFields({ fields });
    } finally {
      clearSessionToken();
    }
    return place;
  }

  function clearSuggestions() {
    setSuggestions([]);
    setError(null);
  }

  return {
    suggestions,
    isLoading,
    error,
    isReady: !!placesLib,
    fetchSuggestions,
    resolvePlace,
    clearSuggestions,
  };
}
