import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

  const [activePath, setActivePath] = useState<ActivePath>('A');
  const [pathState, setPathState] = useState<PathState>('idle');
  const [buildingInput, setBuildingInput] = useState('');
  const [areaInput, setAreaInput] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [resolvedData, setResolvedData] = useState<Partial<AddressData>>(initialData ?? {});
  const [svChecking, setSvChecking] = useState(false);
  const [pincode, setPincode] = useState(initialData?.pincode ?? '');
  const [showListing, setShowListing] = useState(initialData?.streetview_show_in_listing ?? false);
  const [verified, setVerified] = useState(initialData?.location_verified_by_owner ?? false);
  const [buildingNameTouched, setBuildingNameTouched] = useState(false);
  const [mapImgError, setMapImgError] = useState(false);
  const [needsCityInput, setNeedsCityInput] = useState(false);
  const [needsStateInput, setNeedsStateInput] = useState(false);
  const [needsStreetInput, setNeedsStreetInput] = useState(false);
  const [needsPincodeInput, setNeedsPincodeInput] = useState(false);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
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
      setNeedsCityInput(!initialData.city);
      setNeedsStateInput(!initialData.state);
      setNeedsStreetInput(!initialData.street_address);
      setNeedsPincodeInput(!initialData.pincode);
    }
  }, []); // only on mount

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

  async function fetchPredictions(input: string) {
    if (!placesLib || !input.trim()) { setPredictions([]); return; }
    ensureSessionToken();
    try {
      const { suggestions } = await (placesLib as any).AutocompleteSuggestion
        .fetchAutocompleteSuggestions({
          input,
          includedRegionCodes: ['IN'],
          sessionToken: sessionTokenRef.current ?? undefined,
        });
      const list: google.maps.places.AutocompleteSuggestion[] = suggestions ?? [];
      setPredictions(list);
      if (list.length > 0) setPathState('autocomplete');
    } catch (err) {
      console.error('Autocomplete fetch failed:', err);
      setPredictions([]);
    }
  }

  function handleBuildingChange(value: string) {
    setBuildingInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setPredictions([]); setPathState('idle'); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  }

  function handleAreaChange(value: string) {
    setAreaInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setPredictions([]); setPathState('idle'); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  }

  async function handlePredictionSelect(suggestion: google.maps.places.AutocompleteSuggestion) {
    setPredictions([]);
    setBuildingNameTouched(false);
    setMapImgError(false);
    setNeedsCityInput(false);
    setNeedsStateInput(false);
    setNeedsStreetInput(false);
    setNeedsPincodeInput(false);
    setPathState('resolving');
    if (activePath === 'A') setBuildingInput(suggestion.placePrediction.mainText.text);
    else setAreaInput(suggestion.placePrediction.text.text);

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['addressComponents', 'location', 'viewport', 'formattedAddress', 'plusCode', 'id', 'displayName'],
      });
      clearSessionToken(); // terminates billing session

      const parsed = parseAddressComponents(place, activePath === 'A' ? 'google_place' : 'manual');
      const buildingName = activePath === 'A' ? (place.displayName ?? buildingInput) : null;
      setNeedsCityInput(!parsed.city);
      setNeedsStateInput(!parsed.state);
      setNeedsStreetInput(!parsed.street_address);
      setNeedsPincodeInput(!parsed.pincode);

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
    } catch (err) {
      console.error('Place Details fetch failed:', err);
      clearSessionToken();
      setPredictions([]);
      setPathState('idle');
      toast({
        title: "Couldn't load address details",
        description: "Please try again or use manual entry.",
        variant: "destructive",
      });
    }
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
        building_name: activePath === 'A'
          ? (buildingInput || resolvedData.building_name || null)
          : (buildingInput.trim() || null),
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
              {predictions.map((s) => (
                <li
                  key={s.placePrediction.placeId}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                  onClick={() => handlePredictionSelect(s)}
                >
                  <span className="font-medium">{s.placePrediction.mainText.text}</span>
                  <span className="text-muted-foreground ml-1 text-xs">
                    {s.placePrediction.secondaryText?.text}
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

      {/* Path B: Building name (free text) + Area / street autocomplete */}
      {activePath === 'B' && (
        <div className="space-y-4 relative">
          {/* Building name — free text in manual mode */}
          <div className="space-y-1">
            <Label htmlFor="building_name_manual">
              Building name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="building_name_manual"
              value={buildingInput}
              onChange={(e) => setBuildingInput(e.target.value)}
              onBlur={() => setBuildingNameTouched(true)}
              placeholder="e.g. Prestige Lakeside"
              className="min-h-[44px]"
              autoComplete="off"
            />
            {buildingNameTouched && !buildingInput.trim() && (
              <p className="text-sm text-destructive mt-1">Building name is required</p>
            )}
          </div>
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
                {predictions.map((s) => (
                  <li
                    key={s.placePrediction.placeId}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                    onClick={() => handlePredictionSelect(s)}
                  >
                    {s.placePrediction.text.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
            <div className="rounded-md border bg-muted/40 px-4 py-3">
              <p className="text-sm font-medium text-foreground">{resolvedData.formatted_address}</p>
            </div>
          )}

          {/* Fallback inputs — shown only when Google omitted the field (owner mode only) */}
          {!isAdmin && (
            <div className="space-y-3">
              {needsCityInput && (
                <div className="space-y-1">
                  <Label htmlFor="city_fallback">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city_fallback"
                    value={resolvedData.city ?? ''}
                    placeholder="e.g. Bengaluru"
                    className="min-h-[44px]"
                    onChange={(e) => updateResolvedField('city', e.target.value || null)}
                  />
                </div>
              )}
              {needsStateInput && (
                <div className="space-y-1">
                  <Label htmlFor="state_fallback">
                    State <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="state_fallback"
                    value={resolvedData.state ?? ''}
                    placeholder="e.g. Karnataka"
                    className="min-h-[44px]"
                    onChange={(e) => updateResolvedField('state', e.target.value || null)}
                  />
                </div>
              )}
              {needsStreetInput && (
                <div className="space-y-1">
                  <Label htmlFor="street_address_fallback">Street / Road</Label>
                  <Input
                    id="street_address_fallback"
                    value={resolvedData.street_address ?? ''}
                    placeholder="e.g. 1st Main Road"
                    className="min-h-[44px]"
                    onChange={(e) => updateResolvedField('street_address', e.target.value || null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Pincode — editable fallback only when Google did not return one */}
          {needsPincodeInput && (
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
          )}

          {/* Static Maps thumbnail */}
          {lat != null && lng != null && mapsKey && (
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {mapImgError ? (
                <div className="rounded-lg border bg-muted/40 h-[110px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Map preview unavailable</p>
                </div>
              ) : (
                <img
                  src={buildStaticMapUrl(lat, lng, mapsKey)}
                  alt="Location map"
                  className="rounded-lg border w-full object-cover"
                  loading="lazy"
                  onError={() => setMapImgError(true)}
                />
              )}
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
