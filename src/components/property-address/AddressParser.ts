import type { AddressData } from './types';

type ParsedAddress = Omit<
  AddressData,
  | 'building_name'
  | 'lister_flat_number'
  | 'streetview_available'
  | 'streetview_pano_id'
  | 'streetview_checked_at'
  | 'streetview_show_in_listing'
  | 'location_verified_by_owner'
  | 'location_verified_at'
>;

export function parseAddressComponents(
  place: google.maps.places.PlaceResult,
  mode: 'google_place' | 'manual'
): ParsedAddress {
  const fields: Record<string, string> = {};

  for (const component of place.address_components ?? []) {
    const types = component.types;
    if (types.includes('street_number')) fields.street_number = component.long_name;
    if (types.includes('route')) fields.route = component.long_name;
    if (types.includes('sublocality_level_1')) fields.sublocality_1 = component.long_name;
    if (types.includes('sublocality_level_2')) fields.sublocality_2 = component.long_name;
    if (types.includes('neighborhood')) fields.neighborhood = component.long_name;
    if (types.includes('locality')) fields.city = component.long_name;
    if (types.includes('administrative_area_level_2')) fields.district = component.long_name;
    if (types.includes('administrative_area_level_1')) fields.state = component.long_name;
    if (types.includes('country')) fields.country = component.long_name;
    if (types.includes('postal_code')) fields.pincode = component.long_name;
  }

  const lat = place.geometry?.location?.lat() ?? null;
  const lng = place.geometry?.location?.lng() ?? null;
  const viewport = place.geometry?.viewport;

  const street_address =
    [fields.street_number, fields.route].filter(Boolean).join(' ').trim() ||
    fields.route ||
    null;

  return {
    place_id: place.place_id ?? null,
    formatted_address: place.formatted_address ?? null,
    street_number: fields.street_number ?? null,
    route: fields.route ?? null,
    street_address,
    sublocality_1: fields.sublocality_1 ?? null,
    sublocality_2: fields.sublocality_2 ?? null,
    neighborhood: fields.neighborhood ?? null,
    locality: fields.sublocality_1 ?? null,
    city: fields.city ?? null,
    district: fields.district ?? null,
    state: fields.state ?? null,
    country: fields.country ?? null,
    pincode: fields.pincode ?? null,
    plus_code: (place as any).plus_code?.global_code ?? null,
    latitude: lat,
    longitude: lng,
    viewport_ne_lat: viewport ? viewport.getNorthEast().lat() : null,
    viewport_ne_lng: viewport ? viewport.getNorthEast().lng() : null,
    viewport_sw_lat: viewport ? viewport.getSouthWest().lat() : null,
    viewport_sw_lng: viewport ? viewport.getSouthWest().lng() : null,
    address_mode: mode,
  };
}
