import { useMapsLibrary } from "@vis.gl/react-google-maps";

export interface CityGeoResult {
  city: string;
  viewport: { low: { lat: number; lng: number }; high: { lat: number; lng: number } } | null;
}

const CITY_COMPONENT_TYPES = ["locality", "postal_town", "administrative_area_level_3"] as const;

export function useReverseGeocode() {
  const geocoderLib = useMapsLibrary("geocoding");

  async function geocodeLatLng(lat: number, lng: number): Promise<CityGeoResult | null> {
    if (!geocoderLib) return null;
    return new Promise((resolve) => {
      const geocoder = new geocoderLib.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status !== "OK" || !results?.length) {
          resolve(null);
          return;
        }
        const localityResult = results.find((r) =>
          CITY_COMPONENT_TYPES.some((t) => r.types.includes(t)),
        );
        if (!localityResult) {
          resolve(null);
          return;
        }
        const cityComp = CITY_COMPONENT_TYPES.map((t) =>
          localityResult.address_components.find((c) => c.types.includes(t)),
        ).find(Boolean);
        const city = cityComp?.long_name.toLowerCase() ?? null;
        if (!city) {
          resolve(null);
          return;
        }
        const vp = localityResult.geometry?.viewport;
        const viewport = vp
          ? {
              low: { lat: vp.getSouthWest().lat(), lng: vp.getSouthWest().lng() },
              high: { lat: vp.getNorthEast().lat(), lng: vp.getNorthEast().lng() },
            }
          : null;
        resolve({ city, viewport });
      });
    });
  }

  return { geocodeLatLng, isReady: !!geocoderLib };
}
