import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { List } from "lucide-react";
import { Map as GoogleMap, useMap, useApiLoadingStatus, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useSearchState } from "@/features/search/state/useSearchState";
import { useMapMarkers } from "@/features/search/hooks/useMapMarkers";
import { useResolveCity } from "@/features/search/hooks/useResolveCity";
import { countActiveFilters } from "@/features/search/state/filterUtils";
import { MapPropertyPreview } from "@/features/search/components/map/MapPropertyPreview";
import { formatMarkerPrice } from "@/features/search/components/map/MapMarkerPin";
import type { SearchMapMarker } from "@/features/search/data/searchMarkerContract";
import type { MapBounds } from "@/features/search/domain/searchTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarkerGroup {
  lat: number;
  lng: number;
  members: SearchMapMarker[];
  representative: SearchMapMarker;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupMarkersByLocation(markers: SearchMapMarker[]): MarkerGroup[] {
  const groups = new Map<string, SearchMapMarker[]>();
  for (const m of markers) {
    const key = `${m.latitude.toFixed(4)},${m.longitude.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return Array.from(groups.values()).map((members) => ({
    lat: members[0].latitude,
    lng: members[0].longitude,
    members,
    representative: members[0],
  }));
}

/**
 * Resolve the viewport to fit on first open: union of all selected areas'
 * viewports (fetched from each area's Google placeId), else the canonical city
 * viewport. Returns null if nothing resolves (map stays at its current view).
 */
async function resolveSeedBounds(
  locations: { placeId: string | null; label: string; viewport?: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null }[],
  city: string | null,
  placesLib: any,
  resolveCityByName: (name: string) => Promise<{ viewport: { low: { lat: number; lng: number }; high: { lat: number; lng: number } } | null } | null>,
): Promise<MapBounds | null> {
  const boxes: MapBounds[] = [];
  for (const loc of locations) {
    // Prefer the already-hydrated token viewport; only fetch if missing.
    if (loc.viewport) {
      boxes.push({ ne: { ...loc.viewport.ne }, sw: { ...loc.viewport.sw } });
      continue;
    }
    if (loc.placeId && placesLib?.Place) {
      try {
        const place = new placesLib.Place({ id: loc.placeId });
        await place.fetchFields({ fields: ["viewport"] });
        const vp = place.viewport;
        if (vp) {
          boxes.push({
            ne: { lat: vp.getNorthEast().lat(), lng: vp.getNorthEast().lng() },
            sw: { lat: vp.getSouthWest().lat(), lng: vp.getSouthWest().lng() },
          });
        }
      } catch {
        /* skip unresolved area */
      }
    }
  }
  if (boxes.length > 0) {
    return boxes.reduce((acc, b) => ({
      ne: { lat: Math.max(acc.ne.lat, b.ne.lat), lng: Math.max(acc.ne.lng, b.ne.lng) },
      sw: { lat: Math.min(acc.sw.lat, b.sw.lat), lng: Math.min(acc.sw.lng, b.sw.lng) },
    }));
  }
  if (city) {
    const resolved = await resolveCityByName(city);
    if (resolved?.viewport) {
      return {
        ne: { lat: resolved.viewport.high.lat, lng: resolved.viewport.high.lng },
        sw: { lat: resolved.viewport.low.lat, lng: resolved.viewport.low.lng },
      };
    }
  }
  return null;
}

function boundsEqual(a: MapBounds | null, b: MapBounds | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  return (
    round(a.ne.lat) === round(b.ne.lat) &&
    round(a.ne.lng) === round(b.ne.lng) &&
    round(a.sw.lat) === round(b.sw.lat) &&
    round(a.sw.lng) === round(b.sw.lng)
  );
}

function buildMarkerElement(
  group: MarkerGroup,
  selectedMarkerId: string | null,
  hoveredPropertyId?: string | null,
): HTMLElement {
  const rep = group.representative;
  const price = formatMarkerPrice(rep.price);
  const count = group.members.length;
  const isSelected = rep.markerId === selectedMarkerId;
  const isHovered =
    !isSelected &&
    !!hoveredPropertyId &&
    group.members.some((m) => m.markerId === hoveredPropertyId);
  const isApprox = rep.precision === "approximate";

  const pill = document.createElement("div");
  const baseClass =
    "px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm border-2 whitespace-nowrap select-none";
  // Compact Reeve-blue price pins. Selected gets a white ring + larger scale to stand out.
  const colorClass = isSelected
    ? "bg-primary text-primary-foreground border-white scale-110"
    : isHovered
      ? "bg-primary text-primary-foreground border-white/70 scale-105"
      : "bg-primary text-primary-foreground border-primary";
  const approxClass = isApprox ? "border-dashed" : "";
  pill.className = [baseClass, colorClass, approxClass].filter(Boolean).join(" ");
  pill.style.display = "flex";
  pill.style.flexDirection = "column";
  pill.style.alignItems = "center";

  const priceSpan = document.createElement("span");
  priceSpan.textContent = count > 1 ? `${price} ×${count}` : price;
  pill.appendChild(priceSpan);

  const locationLabel = document.createElement("span");
  locationLabel.style.cssText = "font-size:9px;opacity:0.6;display:block;white-space:nowrap;line-height:1.2;";
  locationLabel.textContent = isApprox ? "Approx." : "Exact";
  pill.appendChild(locationLabel);

  return pill;
}

// ─── Inner controller (must be inside <Map> to use useMap) ───────────────────

interface InnerControllerProps {
  onIdleBounds: (bounds: MapBounds) => void;
  groupedMarkers: MarkerGroup[];
  selectedMarkerId: string | null;
  hoveredPropertyId?: string | null;
  onMarkerClick: (propertyId: string) => void;
  /** Fit the map to this viewport once per search geography (changes by key). */
  seedBounds: MapBounds | null;
  seedKey: string;
}

function MapInnerController({
  onIdleBounds,
  groupedMarkers,
  selectedMarkerId,
  hoveredPropertyId,
  onMarkerClick,
  seedBounds,
  seedKey,
}: InnerControllerProps) {
  const map = useMap("search-map");
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const fittedKeyRef = useRef<string | null>(null);

  // Fit to the selected search geography ONCE per geography key. Subsequent user
  // pan/zoom never snaps back; a new City/Areas selection (new key) refits once.
  useEffect(() => {
    if (!map || !seedBounds || !seedKey) return;
    if (fittedKeyRef.current === seedKey) return;
    fittedKeyRef.current = seedKey;
    map.fitBounds({
      north: seedBounds.ne.lat,
      south: seedBounds.sw.lat,
      east: seedBounds.ne.lng,
      west: seedBounds.sw.lng,
    });
  }, [map, seedBounds, seedKey]);

  // Track idle bounds
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      const b = map.getBounds();
      if (!b) return;
      onIdleBounds({
        ne: { lat: b.getNorthEast().lat(), lng: b.getNorthEast().lng() },
        sw: { lat: b.getSouthWest().lat(), lng: b.getSouthWest().lng() },
      });
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onIdleBounds]);

  // MarkerClusterer — imperatively manage AdvancedMarkerElements
  useEffect(() => {
    if (!map) return;
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map });
    }
    const clusterer = clustererRef.current;
    clusterer.clearMarkers();

    const markerLib = window.google?.maps?.marker;
    if (!markerLib?.AdvancedMarkerElement) return;

    const elements = groupedMarkers.map((group) => {
      const rep = group.representative;
      const count = group.members.length;
      const isApprox = rep.precision === "approximate";
      const title = [
        formatMarkerPrice(rep.price),
        count > 1 ? `${count} properties` : null,
        isApprox ? "approximate location" : "exact location",
        rep.buildingName,
      ]
        .filter(Boolean)
        .join(", ");

      const el = new markerLib.AdvancedMarkerElement({
        position: { lat: group.lat, lng: group.lng },
        content: buildMarkerElement(group, selectedMarkerId, hoveredPropertyId),
        title,
        gmpClickable: true,
      });
      el.addEventListener("gmp-click", () => onMarkerClick(rep.markerId));
      return el;
    });

    clusterer.addMarkers(elements);
    return () => {
      clusterer.clearMarkers();
    };
  }, [map, groupedMarkers, selectedMarkerId, hoveredPropertyId, onMarkerClick]);

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchMapViewProps {
  onOpenSetup: () => void;
  onOpenFilters: () => void;
  onBackToList: () => void;
  showPreview?: boolean;
  hoveredPropertyId?: string | null;
  isFavourited?: (id: string) => boolean;
  onToggleFavourite?: (id: string, surface: "list" | "split" | "map") => void;
  isLoggedIn?: boolean;
  onListingOpen?: (propertyId: string, surface: "list" | "split" | "map") => void;
}

export function SearchMapView({
  onOpenSetup,
  onOpenFilters,
  onBackToList,
  showPreview = true,
  hoveredPropertyId,
  isFavourited = () => false,
  onToggleFavourite = () => {},
  isLoggedIn = false,
  onListingOpen,
}: SearchMapViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, setMapBounds, setSelectedPropertyId } = useSearchState();
  const apiStatus = useApiLoadingStatus();

  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const committedBounds = state.mapBounds;

  // ── Seed viewport once per selected search geography (area union, else city) ──
  const placesLib = useMapsLibrary("places");
  const { resolveCityByName } = useResolveCity();
  const [seedBounds, setSeedBounds] = useState<MapBounds | null>(null);
  const seededKeyRef = useRef<string | null>(null);
  const locations = state.context.locations;
  const geoKey =
    locations.length > 0 ? locations.map((l) => l.id).join(",") : (state.context.city ?? "");

  useEffect(() => {
    if (!geoKey || seededKeyRef.current === geoKey) return;
    let cancelled = false;
    (async () => {
      const bounds = await resolveSeedBounds(locations, state.context.city, placesLib, resolveCityByName);
      if (cancelled || !bounds) return;
      seededKeyRef.current = geoKey;
      setSeedBounds(bounds);
      // Commit once so get_map_markers runs for the selected geography.
      setMapBounds(bounds);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoKey, placesLib]);

  const { data: markers = [] } = useMapMarkers(true);
  const groupedMarkers = groupMarkersByLocation(markers);
  // Precision legend shows only when both exact + approximate pins are present.
  const hasExactPins = markers.some((m) => m.precision === "exact");
  const hasApproxPins = markers.some((m) => m.precision === "approximate");
  const showPrecisionLegend = hasExactPins && hasApproxPins;

  // Derive selected group from URL state
  const selectedMarkerId = state.selectedPropertyId;
  const selectedGroup = selectedMarkerId
    ? (groupedMarkers.find((g) =>
        g.members.some((m) => m.markerId === selectedMarkerId),
      ) ?? null)
    : null;

  const handleIdleBounds = useCallback((newBounds: MapBounds) => {
    setPendingBounds(newBounds);
  }, []);

  const hasPendingAreaSearch =
    pendingBounds !== null && !boundsEqual(pendingBounds, committedBounds);

  const mode = state.context.mode ?? "rent";
  const city = state.context.city ?? "";
  const totalActive = countActiveFilters(state.filters, mode);
  const contextLabel = [
    mode === "rent" ? "Rent" : "Buy",
    city ? city.charAt(0).toUpperCase() + city.slice(1) : null,
    state.context.locations.length > 0 ? state.context.locations[0].label : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ── Map failure fallback ────────────────────────────────────────────────────
  if (apiStatus === "FAILED") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground text-center">
          Map unavailable. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm"
        >
          Back to List
        </button>
      </div>
    );
  }

  // ── Determine initial map position ─────────────────────────────────────────
  const mapProps = committedBounds
    ? {
        defaultBounds: {
          north: committedBounds.ne.lat,
          south: committedBounds.sw.lat,
          east: committedBounds.ne.lng,
          west: committedBounds.sw.lng,
        },
      }
    : {
        // Neutral India-wide view — not committed to URL; user must tap "Search this area"
        defaultCenter: { lat: 20.5937, lng: 78.9629 },
        defaultZoom: 5,
      };

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        id="search-map"
        mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI
        className="w-full h-full"
        {...mapProps}
      >
        <MapInnerController
          onIdleBounds={handleIdleBounds}
          groupedMarkers={groupedMarkers}
          selectedMarkerId={selectedMarkerId}
          hoveredPropertyId={hoveredPropertyId}
          onMarkerClick={(propertyId) => setSelectedPropertyId(propertyId)}
          seedBounds={seedBounds}
          seedKey={geoKey}
        />
      </GoogleMap>

      {/* Top overlay: context chip + Filters — hidden on desktop (toolbar already has these) */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 desk:hidden">
        <button
          type="button"
          onClick={onOpenSetup}
          className="flex-1 min-w-0 rounded-full border bg-card/90 px-3 py-1.5 text-xs font-medium truncate backdrop-blur-sm"
        >
          {contextLabel}
        </button>
        <button
          type="button"
          onClick={onOpenFilters}
          className="shrink-0 rounded-full border bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur-sm"
        >
          Filters{totalActive > 0 ? ` (${totalActive})` : ""}
        </button>
      </div>

      {/* "Search this area" */}
      {hasPendingAreaSearch && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <button
            type="button"
            onClick={() => pendingBounds && setMapBounds(pendingBounds)}
            className="pointer-events-auto rounded-full border bg-card/90 px-4 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm"
          >
            Search this area
          </button>
        </div>
      )}

      {/* First-open hint when no bounds committed and no pending viewport yet */}
      {!committedBounds && !pendingBounds && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <p className="rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            Navigate to {city || "your city"} and tap "Search this area"
          </p>
        </div>
      )}

      {/* Precision legend — only when both exact + approximate pins are present */}
      {showPrecisionLegend && (
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 rounded-lg border bg-card/95 px-2.5 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-primary" />
            Exact location
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-primary bg-primary/40" />
            Approximate
          </span>
        </div>
      )}

      {/* Floating "List" FAB */}
      <button
        type="button"
        onClick={onBackToList}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <List className="h-4 w-4" /> List
      </button>

      {/* Selected property preview — suppressed in split mode */}
      {showPreview && selectedGroup && (
        <div className="absolute bottom-16 left-2 right-2 z-10">
          <MapPropertyPreview
            group={selectedGroup}
            onClose={() => setSelectedPropertyId(null)}
            onOpen={(propertyId) => {
              onListingOpen?.(propertyId, "map");
              const params = new URLSearchParams(location.search);
              params.set("pid", propertyId);
              const returnTo = location.pathname + "?" + params.toString();
              setSelectedPropertyId(propertyId);
              navigate(`/property/${propertyId}`, { state: { fromSearch: returnTo } });
            }}
            isFavourited={isFavourited}
            onToggleFavourite={(id) => onToggleFavourite(id, "map")}
            isLoggedIn={isLoggedIn}
          />
        </div>
      )}
    </div>
  );
}
