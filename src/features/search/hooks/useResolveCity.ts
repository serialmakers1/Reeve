import { useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { CityViewport } from "@/features/search/domain/geoUtils";

export interface CanonicalCity {
  city: string; // normalized lowercase, used as p_city / context.city
  displayLabel: string; // human label for the input
  placeId: string | null;
  /** Real Google Place center (place.location). Required to become a canonical
   *  city anchor — never derived from the viewport midpoint (Prompt 3A). */
  center: { lat: number; lng: number } | null;
  viewport: CityViewport | null;
}

/**
 * Imperative "city name → canonical city" resolver, shared by Popular Cities
 * and the Vercel geo prefill/hydration. Mirrors CitySearchInput.selectOption's
 * resolution but takes a raw name and is non-debounced (single call).
 * Returns null on any failure so callers fall back to nationwide.
 */
export function useResolveCity() {
  const placesLib = useMapsLibrary("places");

  const resolveCityByName = useCallback(
    async (name: string): Promise<CanonicalCity | null> => {
      const trimmed = name.trim();
      if (!placesLib || !trimmed) return null;
      try {
        const { suggestions } = await (placesLib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          includedPrimaryTypes: ["locality", "administrative_area_level_3"],
          includedRegionCodes: ["IN"],
        });
        const first = suggestions?.[0];
        if (!first?.placePrediction) return null;

        const place = first.placePrediction.toPlace();
        await place.fetchFields({ fields: ["id", "location", "viewport", "displayName"] });

        // New Places API: Place.displayName is a plain string.
        const rawDisplayName = (place as any).displayName;
        const displayNameStr =
          typeof rawDisplayName === "string" ? rawDisplayName : rawDisplayName?.text;
        const label = displayNameStr ?? first.placePrediction.text?.text ?? trimmed;
        const placeId = (place as any).id ?? null;
        if (!placeId) return null;

        const vp = (place as any).viewport;
        const viewport: CityViewport | null = vp
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

        return {
          city: (displayNameStr ?? trimmed).toLowerCase(),
          displayLabel: label,
          placeId,
          center,
          viewport,
        };
      } catch {
        return null;
      }
    },
    [placesLib],
  );

  return { resolveCityByName, isReady: !!placesLib };
}
