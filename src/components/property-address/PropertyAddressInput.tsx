import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { parseAddressComponents } from './AddressParser';
import type { AddressData, PropertyAddressInputProps } from './types';

type PathState = 'idle' | 'autocomplete' | 'resolving' | 'resolved';
type ActivePath = 'A' | 'B';

function buildStaticMapUrl(lat: number, lng: number, key: string): string {
  return [
    'https://maps.googleapis.com/maps/api/staticmap',
    `?center=${lat},${lng}`,
    `&zoom=16&size=640x220&scale=2`,
    `&markers=color:0x0A6EEF%7C${lat},${lng}`,
    `&key=${key}`,
  ].join('');
}

export function PropertyAddressInput({
  mode,
  initialData,
  onAddressResolved,
  canRecheck,
}: PropertyAddressInputProps) {
  const isAdmin = mode === 'admin';
  const placesLib = useMapsLibrary('places');
  const streetViewLib = useMapsLibrary('streetView');

  const [activePath, setActivePath] = useState<ActivePath>('A');
  const [pathState, setPathState] = useState<PathState>('idle');
  const [buildingInput, setBuildingInput] = useState('');
  const [areaInput, setAreaInput] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [resolvedData, setResolvedData] = useState<Partial<AddressData>>(initialData ?? {});
  const [svChecking, setSvChecking] = useState(false);
  const [pincode, setPincode] = useState(initialData?.pincode ?? '');
  const [showListing, setShowListing] = useState(initialData?.streetview_show_in_listing ?? false);
  const [verified, setVerified] = useState(initialData?.location_verified_by_owner ?? false);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const dummyDivRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-populate from initialData on mount
  useEffect(() => {
    if (initialData?.place_id) {
      setBuildingInput(initialData.building_name ?? '');
      setResolvedData(initialData);
      setPincode(initialData.pincode ?? '');
      setVerified(initialData.location_verified_by_owner ?? false);
      setShowListing(initialData.streetview_show_in_listing ?? false);
      setActivePath(initialData.address_mode === 'manual' ? 'B' : 'A');
      setPathState('resolved');
    }
  }, []); // only on mount

  // Initialise Places services once library loads
  useEffect(() => {
    if (!placesLib) return;
    autocompleteServiceRef.current = new placesLib.AutocompleteService();
    if (dummyDivRef.current) {
      placesServiceRef.current = new placesLib.PlacesService(dummyDivRef.current);
    }
  }, [placesLib]);

  // Re-init PlacesService if dummyDivRef becomes available after placesLib
  useEffect(() => {
    if (placesLib && dummyDivRef.current && !placesServiceRef.current) {
      placesServiceRef.current = new placesLib.PlacesService(dummyDivRef.current);
    }
  }, [placesLib, dummyDivRef.current]);

  function ensureSessionToken() {
    if (!sessionTokenRef.current && placesLib) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
  }

  function clearSessionToken() {
    sessionTokenRef.current = null;
  }

  function updateResolvedField(key: keyof AddressData, value: unknown) {
    setResolvedData(prev => ({ ...prev, [key]: value }));
  }

  function fetchPredictions(input: string, path: ActivePath) {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setPredictions([]);
      return;
    }
    ensureSessionToken();
    const request: google.maps.places.AutocompletionRequest = {
      input,
      componentRestrictions: { country: 'in' },
      sessionToken: sessionTokenRef.current ?? undefined,
      types: path === 'A' ? ['establishment'] : ['geocode'],
    };
    autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
        setPathState('autocomplete');
      } else {
        setPredictions([]);
      }
    });
  }

  function handleBuildingChange(value: string) {
    setBuildingInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setPredictions([]); setPathState('idle'); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(value, 'A'), 300);
  }

  function handleAreaChange(value: string) {
    setAreaInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setPredictions([]); setPathState('idle'); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(value, 'B'), 300);
  }

  function handlePredictionSelect(prediction: google.maps.places.AutocompletePrediction) {
    setPredictions([]);
    setPathState('resolving');
    if (activePath === 'A') setBuildingInput(prediction.structured_formatting.main_text);
    else setAreaInput(prediction.description);

    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'geometry', 'formatted_address', 'plus_code', 'place_id', 'name'],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (place, status) => {
        clearSessionToken(); // terminates billing session
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          setPathState('idle');
          return;
        }

        const parsed = parseAddressComponents(place, activePath === 'A' ? 'google_place' : 'manual');
        const buildingName = activePath === 'A' ? (place.name ?? buildingInput) : null;

        const data: Partial<AddressData> = {
          ...parsed,
          building_name: buildingName,
          streetview_available: false,
          streetview_pano_id: null,
          streetview_checked_at: null,
          streetview_show_in_listing: false,
          location_verified_by_owner: false,
          location_verified_at: null,
          lister_flat_number: null,
        };

        setPincode(parsed.pincode ?? '');
        setShowListing(false);
        setVerified(false);
        setResolvedData(data);
        setPathState('resolved');

        if (activePath === 'A' && parsed.latitude != null && parsed.longitude != null) {
          runStreetViewCheck(parsed.latitude, parsed.longitude, data);
        }
      }
    );
  }

  function runStreetViewCheck(
    lat?: number,
    lng?: number,
    dataOverride?: Partial<AddressData>
  ) {
    const useLat = lat ?? resolvedData.latitude;
    const useLng = lng ?? resolvedData.longitude;
    if (!streetViewLib || useLat == null || useLng == null) return;

    setSvChecking(true);
    const svc = new streetViewLib.StreetViewService();
    svc.getPanorama(
      {
        location: { lat: useLat, lng: useLng },
        radius: 50,
        source: streetViewLib.StreetViewSource.OUTDOOR,
      },
      (svData, status) => {
        const available = status === streetViewLib.StreetViewStatus.OK;
        const panoId = available ? (svData?.location?.pano ?? null) : null;
        setResolvedData((prev) => ({
          ...(dataOverride ?? prev),
          streetview_available: available,
          streetview_pano_id: panoId,
          streetview_checked_at: new Date().toISOString(),
        }));
        setSvChecking(false);
      }
    );
  }

  // Fire onAddressResolved whenever resolved state changes
  useEffect(() => {
    if (pathState !== 'resolved') return;
    const defaults: AddressData = {
      place_id: null, formatted_address: null, building_name: null,
      street_number: null, route: null, street_address: null,
      sublocality_1: null, sublocality_2: null, neighborhood: null,
      locality: null, city: null, district: null, state: null,
      country: null, pincode: null, plus_code: null,
      latitude: null, longitude: null,
      viewport_ne_lat: null, viewport_ne_lng: null,
      viewport_sw_lat: null, viewport_sw_lng: null,
      address_mode: 'google_place',
      streetview_available: false, streetview_pano_id: null,
      streetview_checked_at: null, streetview_show_in_listing: false,
      location_verified_by_owner: false, location_verified_at: null,
      lister_flat_number: null,
    };
    // Merge: defaults → resolvedData → controlled-state overrides
    const merged: AddressData = Object.assign(
      {},
      defaults,
      resolvedData as AddressData,
      {
        building_name: activePath === 'A' ? (buildingInput || resolvedData.building_name || null) : null,
        pincode: pincode || resolvedData.pincode || null,
        streetview_show_in_listing: showListing,
        location_verified_by_owner: verified,
        location_verified_at: verified
          ? new Date().toISOString()
          : (resolvedData.location_verified_at ?? null),
      }
    );
    onAddressResolved(merged);
  }, [resolvedData, buildingInput, pincode, showListing, verified, pathState]);

  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const lat = resolvedData.latitude;
  const lng = resolvedData.longitude;

  return (
    <div className="space-y-4">
      {/* Hidden DOM node required by PlacesService */}
      <div ref={dummyDivRef} style={{ display: 'none' }} aria-hidden="true" />

      {/* Path A: Building name autocomplete */}
      {activePath === 'A' && (
        <div className="space-y-1 relative">
          <Label htmlFor="building_name">
            Building name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="building_name"
            value={buildingInput}
            onChange={(e) => handleBuildingChange(e.target.value)}
            placeholder="e.g. Prestige Lakeside"
            className="min-h-[44px]"
            autoComplete="off"
          />
          {predictions.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-md max-h-60 overflow-y-auto">
              {predictions.map((p) => (
                <li
                  key={p.place_id}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                  onClick={() => handlePredictionSelect(p)}
                >
                  <span className="font-medium">{p.structured_formatting.main_text}</span>
                  <span className="text-muted-foreground ml-1 text-xs">
                    {p.structured_formatting.secondary_text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Path A → Path B switch */}
      {activePath === 'A' && pathState !== 'resolved' && (
        <button
          type="button"
          onClick={() => { setActivePath('B'); setPredictions([]); }}
          className="text-sm underline text-muted-foreground"
        >
          Can't find your building? Enter manually →
        </button>
      )}

      {/* Path B: Area / street autocomplete */}
      {activePath === 'B' && (
        <div className="space-y-1 relative">
          <Label htmlFor="area_search">Street / Area</Label>
          <Input
            id="area_search"
            value={areaInput}
            onChange={(e) => handleAreaChange(e.target.value)}
            placeholder="e.g. Koramangala 5th Block, Bengaluru"
            className="min-h-[44px]"
            autoComplete="off"
          />
          {predictions.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-md max-h-60 overflow-y-auto">
              {predictions.map((p) => (
                <li
                  key={p.place_id}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                  onClick={() => handlePredictionSelect(p)}
                >
                  {p.description}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => { setActivePath('A'); setPredictions([]); }}
            className="text-sm underline text-muted-foreground mt-1 block"
          >
            ← Back to building search
          </button>
        </div>
      )}

      {/* Resolving spinner */}
      {pathState === 'resolving' && (
        <p className="text-sm text-muted-foreground animate-pulse">Looking up address…</p>
      )}

      {/* Resolved: address summary + map + verification */}
      {pathState === 'resolved' && resolvedData.formatted_address && (
        <div className="space-y-3">
          {/* Address summary — owner: locked display; admin: editable inputs */}
          {isAdmin ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Formatted address</Label>
                <Input
                  value={resolvedData.formatted_address ?? ''}
                  className="min-h-[44px]"
                  onChange={(e) => updateResolvedField('formatted_address', e.target.value || null)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input value={resolvedData.city ?? ''} className="min-h-[44px]"
                    onChange={(e) => updateResolvedField('city', e.target.value || null)} />
                </div>
                <div className="space-y-1">
                  <Label>State</Label>
                  <Input value={resolvedData.state ?? ''} className="min-h-[44px]"
                    onChange={(e) => updateResolvedField('state', e.target.value || null)} />
                </div>
                <div className="space-y-1">
                  <Label>Neighbourhood</Label>
                  <Input value={resolvedData.sublocality_1 ?? ''} className="min-h-[44px]"
                    onChange={(e) => updateResolvedField('sublocality_1', e.target.value || null)} />
                </div>
                <div className="space-y-1">
                  <Label>District</Label>
                  <Input value={resolvedData.district ?? ''} className="min-h-[44px]"
                    onChange={(e) => updateResolvedField('district', e.target.value || null)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{resolvedData.formatted_address}</p>
              {resolvedData.city && (
                <p className="text-xs text-muted-foreground">
                  {[resolvedData.city, resolvedData.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Pincode — editable if not auto-filled */}
          <div className="space-y-1">
            <Label htmlFor="pincode_input">Pincode</Label>
            <Input
              id="pincode_input"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit pincode"
              maxLength={6}
              className="max-w-[180px] min-h-[44px]"
            />
          </div>

          {/* Static Maps thumbnail */}
          {lat != null && lng != null && mapsKey && (
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={buildStaticMapUrl(lat, lng, mapsKey)}
                alt="Location map"
                className="rounded-lg border w-full object-cover"
                loading="lazy"
              />
            </a>
          )}

          {/* Street View (Path A only; hidden in admin mode — admin has dedicated SV section in Location card) */}
          {activePath === 'A' && !isAdmin && (
            <div className="space-y-2">
              {svChecking ? (
                <p className="text-sm text-muted-foreground animate-pulse">Checking Street View…</p>
              ) : resolvedData.streetview_available ? (
                <>
                  <Badge variant="secondary" className="text-green-700 bg-green-50">
                    ✓ Street View available
                  </Badge>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="sv-toggle">Show Street View link in listing</Label>
                    <Switch id="sv-toggle" checked={showListing} onCheckedChange={setShowListing} />
                  </div>
                  {resolvedData.streetview_pano_id && (
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&pano=${resolvedData.streetview_pano_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline text-primary"
                    >
                      👁 Preview Street View
                    </a>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Street View not yet available
                </Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRecheck}
                title={canRecheck ? undefined : 'Available in edit mode'}
                onClick={() => runStreetViewCheck()}
              >
                Re-check Street View
              </Button>
            </div>
          )}

          {/* Location verification checkbox (owner only — admin has dedicated SV section) */}
          {!isAdmin && (
            <div className="bg-muted rounded-md p-3 space-y-1">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="location_verified"
                  checked={verified}
                  onCheckedChange={(v) => setVerified(!!v)}
                />
                <Label htmlFor="location_verified" className="cursor-pointer text-sm">
                  I have verified the location pin is correctly placed on the map
                  <span className="text-destructive ml-1">*</span>
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-7">
                Tip: If the pin looks wrong, try searching with a more specific name (include block/tower name).
              </p>
            </div>
          )}

          {/* Re-search link */}
          <button
            type="button"
            onClick={() => {
              setPathState('idle');
              setPredictions([]);
              if (activePath === 'A') setBuildingInput('');
              else setAreaInput('');
            }}
            className="text-sm underline text-muted-foreground"
          >
            Search a different address
          </button>
        </div>
      )}
    </div>
  );
}
