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
  place: google.maps.places.Place,
  mode: 'google_place' | 'manual'
): ParsedAddress {
  const fields: Record<string, string> = {};

  for (const component of place.addressComponents ?? []) {
    const types = component.types;
    if (types.includes('street_number')) fields.street_number = component.longText;
    if (types.includes('route')) fields.route = component.longText;
    if (types.includes('sublocality_level_1')) fields.sublocality_1 = component.longText;
    if (types.includes('sublocality_level_2')) fields.sublocality_2 = component.longText;
    if (types.includes('neighborhood')) fields.neighborhood = component.longText;
    if (types.includes('locality')) fields.city = component.longText;
    if (types.includes('administrative_area_level_2')) fields.district = component.longText;
    if (types.includes('administrative_area_level_1')) fields.state = component.longText;
    if (types.includes('country')) fields.country = component.longText;
    if (types.includes('postal_code')) fields.pincode = component.longText;
  }

  const lat = place.location?.lat() ?? null;
  const lng = place.location?.lng() ?? null;
  const viewport = place.viewport;

  const street_address =
    [fields.street_number, fields.route].filter(Boolean).join(' ').trim() ||
    fields.route ||
    null;

  return {
    place_id: place.id ?? null,
    formatted_address: place.formattedAddress ?? null,
    street_number: fields.street_number ?? null,
    route: fields.route ?? null,
    street_address,
    sublocality_1: fields.sublocality_1 ?? null,
    sublocality_2: fields.sublocality_2 ?? null,
    neighborhood: fields.neighborhood ?? null,
    locality: fields.sublocality_1 ?? fields.neighborhood ?? fields.sublocality_2 ?? null,
    city: fields.city ?? null,
    district: fields.district ?? null,
    state: fields.state ?? null,
    country: fields.country ?? null,
    pincode: fields.pincode ?? null,
    plus_code: place.plusCode?.globalCode ?? null,
    latitude: lat,
    longitude: lng,
    viewport_ne_lat: viewport ? viewport.getNorthEast().lat() : null,
    viewport_ne_lng: viewport ? viewport.getNorthEast().lng() : null,
    viewport_sw_lat: viewport ? viewport.getSouthWest().lat() : null,
    viewport_sw_lng: viewport ? viewport.getSouthWest().lng() : null,
    address_mode: mode,
  };
}
